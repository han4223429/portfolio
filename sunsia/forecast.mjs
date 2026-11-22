// 월별 가격 분석·예측 (통계 기반, 구조는 단순하게)
// 1) 방법 세 가지를 비교한다: 마지막 값 그대로 / 작년 같은 달 / 계절 + 추세
// 2) 과거 검증: 과거 시점마다 "그 시점까지의 자료만" 가지고 1~3개월 뒤를 맞혀 보고 오차를 잰다(미래 자료는 쓰지 않는다)
// 3) 오차가 가장 작은 방법을 고르고, 과거 오차 분포로 예측 범위(80%)를 만든다
// 예측은 과거 패턴의 연장이라 틀릴 수 있다. 그래서 과거 검증 오차를 항상 함께 보여 준다.
import {shiftMonth} from './real.mjs';

export const HORIZON = 3;
export const METHODS = [
  {key: 'naive', name: '마지막 값 그대로'},
  {key: 'lastyear', name: '작년 같은 달'},
  {key: 'seasonal', name: '계절 + 추세'},
];

const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const std = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };
const quantile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];

// 가격(원/kg) 배열의 앞뒤 빈 달은 자르고, 가운데 빈 달은 로그 값을 직선으로 이어 채운다(채운 개수는 따로 센다)
export function prepare(prices, months) {
  let a = 0, b = prices.length - 1;
  while (a <= b && !(prices[a] > 0)) a++;
  while (b >= a && !(prices[b] > 0)) b--;
  const y = [], ms = [];
  let filled = 0;
  for (let i = a; i <= b; i++) {
    ms.push(months[i]);
    if (prices[i] > 0) { y.push(Math.log(prices[i])); continue; }
    let l = i - 1, r = i + 1;
    while (!(prices[l] > 0)) l--;
    while (!(prices[r] > 0)) r++;
    y.push(Math.log(prices[l]) + (Math.log(prices[r]) - Math.log(prices[l])) * (i - l) / (r - l));
    filled++;
  }
  return {y, months: ms, filled};
}

const calMonth = m => Number(m.slice(5, 7)) - 1;

// 0..t 까지의 자료로 계절 지수(12개)를 만든다: 로그 가격에서 12개월 이동평균을 뺀 값을 달별로 평균
export function seasonalIndex(y, months, t) {
  const dev = Array.from({length: 12}, () => []);
  for (let i = 6; i + 6 <= t; i++) {
    let s = 0.5 * y[i - 6] + 0.5 * y[i + 6];
    for (let k = i - 5; k <= i + 5; k++) s += y[k];
    dev[calMonth(months[i])].push(y[i] - s / 12);
  }
  const raw = dev.map(d => (d.length ? mean(d) : 0));
  const c = mean(raw);
  return raw.map(x => x - c);
}

// t 시점까지의 자료만으로 h개월 뒤 로그 가격을 예측
export function forecastLog(y, months, t, h, method) {
  if (method === 'naive' || t < 12) return y[t];
  if (method === 'lastyear') { const i = t + h - 12; return i >= 0 && i <= t ? y[i] : y[t]; }
  if (t < 36) return y[t];
  const s = seasonalIndex(y, months, t);
  const z = [];
  for (let i = Math.max(0, t - 11); i <= t; i++) z.push(y[i] - s[calMonth(months[i])]);
  const level = mean(z.slice(-3));
  const n = z.length, xm = (n - 1) / 2, zm = mean(z);
  let num = 0, den = 0;
  z.forEach((v, i) => { num += (i - xm) * (v - zm); den += (i - xm) ** 2; });
  const slope = den ? num / den : 0;
  const phi = 0.8;
  let damp = 0; for (let k = 1; k <= h; k++) damp += phi ** k;
  const target = shiftMonth(months[t], h);
  return level + slope * damp + s[calMonth(target)];
}

// 과거 검증: 최근 48개 시점에서 1~3개월 뒤를 맞혀 보고 오차(MAPE)와 로그 오차를 모은다
export function backtest(y, months, origins = 48) {
  const n = y.length, last = n - 1 - HORIZON;
  const first = Math.max(36, last - origins + 1);
  const res = {};
  for (const m of METHODS) res[m.key] = {ape: [[], [], []], err: [[], [], []]};
  for (let t = first; t <= last; t++) {
    for (const m of METHODS) for (let h = 1; h <= HORIZON; h++) {
      const f = forecastLog(y, months, t, h, m.key);
      res[m.key].ape[h - 1].push(Math.abs(Math.exp(f - y[t + h]) - 1));
      res[m.key].err[h - 1].push(f - y[t + h]);
    }
  }
  const out = {origins: last - first + 1, from: months[first], methods: {}};
  for (const m of METHODS) {
    const per = res[m.key].ape.map(a => mean(a));
    out.methods[m.key] = {name: m.name, mape: mean(per), perHorizon: per, err: res[m.key].err};
  }
  return out;
}

// 한 품목 분석: 현재 수준, 계절성, 예측, 과거 검증
export function analyze(item, allMonths) {
  const {y, months, filled} = prepare(item.price, allMonths);
  const n = y.length, last = n - 1;
  const price = y.map(Math.exp);
  const bt = backtest(y, months);
  const order = ['naive', 'lastyear', 'seasonal'];
  const best = order.reduce((a, k) => (bt.methods[k].mape < bt.methods[a].mape - 1e-9 ? k : a), 'naive');
  const fc = [];
  for (let h = 1; h <= HORIZON; h++) {
    const f = forecastLog(y, months, last, h, best);
    const errs = [...bt.methods[best].err[h - 1]].sort((a, b) => a - b);
    fc.push({month: shiftMonth(months[last], h), mid: Math.exp(f), lo: Math.exp(f - quantile(errs, 0.9)), hi: Math.exp(f - quantile(errs, 0.1))});
  }
  const s = seasonalIndex(y, months, last);
  const peak = s.indexOf(Math.max(...s)), trough = s.indexOf(Math.min(...s));
  const lastP = price[last], avg12 = mean(price.slice(-12)), avgAll = mean(price);
  const sameMonth = price.filter((_, i) => i < last && calMonth(months[i]) === calMonth(months[last]));
  const rank = price.filter(p => p <= lastP).length / n;
  const changes = y.slice(1).map((v, i) => v - y[i]);
  const mid3 = mean(fc.map(f => f.mid));
  const ratio = mid3 / lastP;
  const outlook = ratio >= 1.05 ? 'up' : ratio <= 0.95 ? 'down' : 'flat';
  const naiveM = bt.methods.naive.mape, bestM = bt.methods[best].mape;
  return {
    months, price, filled, last: {month: months[last], price: lastP},
    stats: {
      avg12, avgAll, vs12: lastP / avg12 - 1, vsAll: lastP / avgAll - 1, rank,
      sameMonthAvg: sameMonth.length ? mean(sameMonth) : null, vsSameMonth: sameMonth.length ? lastP / mean(sameMonth) - 1 : null,
      mom: n > 1 ? lastP / price[last - 1] - 1 : null, prevMonth: n > 1 ? months[last - 1] : null, threeMonth: n > 3 ? lastP / price[last - 3] - 1 : null, volatility: std(changes),
      peakMonth: peak + 1, troughMonth: trough + 1, seasonalSwing: Math.exp(s[peak] - s[trough]) - 1,
    },
    forecast: fc, ratio, outlook, method: best, methodName: bt.methods[best].name,
    backtest: {origins: bt.origins, from: bt.from, mape: bestM, naiveMape: naiveM, byMethod: Object.fromEntries(METHODS.map(m => [m.key, {name: m.name, mape: bt.methods[m.key].mape}])), skill: naiveM > 0 ? 1 - bestM / naiveM : 0},
    reliability: bestM <= 0.10 ? 'good' : bestM <= 0.25 ? 'ok' : 'low',
  };
}

const pct = x => `${Math.round(Math.abs(x) * 100)}%`;
const upDown = (x, up = '높습니다', down = '낮습니다') => (Math.abs(x) < 0.01 ? '거의 같습니다' : x > 0 ? up : down);
const won = n => `${Math.round(n).toLocaleString('ko-KR')}원`;

// 자동 분석 문장(통계로 계산한 값을 문장으로 바꿈). 사람이 읽기 쉬운 순서로 만든다.
// 다음 달 전망 한 문장(월별 자료이므로 '다음 주'가 아니라 '다음 달' 단위)
export function nextText(a) {
  const f = a.forecast[0], r = f.mid / a.last.price - 1;
  const w = Math.abs(r) < 0.03 ? '지금과 비슷할 것으로 보입니다' : r > 0 ? `${pct(r)} 정도 오를 것으로 예상됩니다` : `${pct(r)} 정도 내릴 것으로 예상됩니다`;
  return `다음 달(${f.month})은 ${w}(예측 ${won(f.mid)}, 80% 범위 ${won(f.lo)}~${won(f.hi)}).${a.reliability === 'low' ? ' 변동이 큰 품목이라 방향만 참고하십시오.' : ''}`;
}

export function describe(name, a, unit = 'kg') {
  const L = a.last, st = a.stats, lines = [];
  const mo = Number(L.month.slice(5, 7));
  lines.push({kind: 'now', text: `${L.month}(자료의 마지막 달) ${name}의 도매 평균은 ${won(L.price)}/${unit}입니다. 최근 12개월 평균(${won(st.avg12)})보다 ${Math.abs(st.vs12) < 0.01 ? '거의 같고' : `${pct(st.vs12)} ${st.vs12 > 0 ? '비싸고' : '싸고'}`}, 10년 평균(${won(st.avgAll)})보다 ${Math.abs(st.vsAll) < 0.01 ? '거의 같습니다.' : `${pct(st.vsAll)} ${upDown(st.vsAll)}.`}`});
  if (st.mom != null) lines.push({kind: 'mom', text: `지난달(${st.prevMonth})보다 이번 달(${L.month})은 ${Math.abs(st.mom) < 0.02 ? '가격이 비슷합니다' : `${pct(st.mom)} ${st.mom > 0 ? '비쌉니다' : '쌉니다'}`}.`});
  lines.push({kind: 'next', text: nextText(a)});
  lines.push({kind: 'rank', text: `지금보다 싼 달은 지난 10년(${a.months.length}개월) 중 ${Math.round(st.rank * 100)}%입니다. ${st.rank >= 0.8 ? '역사적으로 비싼 편입니다.' : st.rank <= 0.2 ? '역사적으로 싼 편입니다.' : '평소 범위 안입니다.'}`});
  if (st.sameMonthAvg) lines.push({kind: 'season', text: `같은 ${mo}월의 10년 평균(${won(st.sameMonthAvg)})보다 ${Math.abs(st.vsSameMonth) < 0.01 ? '거의 같습니다.' : `${pct(st.vsSameMonth)} ${upDown(st.vsSameMonth)}.`} 보통 ${st.peakMonth}월에 가장 비싸고 ${st.troughMonth}월에 가장 쌉니다(가장 비싼 달이 가장 싼 달의 약 ${(1 + st.seasonalSwing).toFixed(1)}배).`});
  if (st.threeMonth != null) lines.push({kind: 'trend', text: `최근 3개월 동안 ${Math.abs(st.threeMonth) < 0.03 ? '가격이 안정적이었습니다' : `${pct(st.threeMonth)} ${st.threeMonth > 0 ? '올랐습니다' : '내렸습니다'}`}. 한 달 사이 가격이 흔들리는 정도는 평균 ${pct(st.volatility)}입니다.`});
  const f = a.forecast, lo = Math.min(...f.map(x => x.lo)), hi = Math.max(...f.map(x => x.hi));
  const word = {up: `지금보다 오를 가능성이 있습니다(예측 평균 ${won(f.reduce((s, x) => s + x.mid, 0) / f.length)}).`, down: `지금보다 내릴 가능성이 있습니다(예측 평균 ${won(f.reduce((s, x) => s + x.mid, 0) / f.length)}).`, flat: `지금과 비슷할 것으로 보입니다(예측 평균 ${won(f.reduce((s, x) => s + x.mid, 0) / f.length)}).`}[a.outlook];
  lines.push({kind: 'forecast', text: `${f[0].month}~${f[2].month}은 ${word} 80% 범위는 ${won(lo)}~${won(hi)}입니다.`});
  const b = a.backtest;
  lines.push({kind: 'trust', text: `이 예측 방법은 "${a.methodName}"입니다. 과거 ${b.origins}번 맞혀 본 평균 오차는 ${pct(b.mape)}${b.skill > 0.02 ? `로, 마지막 값 그대로 쓰는 방법(${pct(b.naiveMape)})보다 나았습니다.` : '로, 더 나은 방법이 없어 단순한 방법을 골랐습니다.'} ${a.reliability === 'good' ? '비교적 믿고 참고할 수 있습니다.' : a.reliability === 'ok' ? '참고용으로 보십시오.' : '가격 변동이 커서 예측이 어려운 품목입니다. 방향만 참고하십시오.'}`});
  return lines;
}

// 가격 대응 화면에서 쓰는 짧은 전망 요약. 자료가 없는 품목은 null.
// hist는 {id, label, months, items} 하나 또는 그 배열(앞에 있는 자료를 우선 사용).
export function outlookOf(hist, name, cache = {}) {
  for (const h of Array.isArray(hist) ? hist : [hist]) {
    const item = h?.items?.[name];
    if (!item) continue;
    const key = `${h.id || ''}:${name}`;
    const a = cache[key] || (cache[key] = analyze(item, h.months));
    return {mom: a.stats.mom, prevMonth: a.stats.prevMonth, next: nextText(a), outlook: a.outlook, reliability: a.reliability, mape: a.backtest.mape, vsAll: a.stats.vsAll, last: a.last, ratio: a.ratio, source: h.label || ''};
  }
  return null;
}

// ---------- 도매(핵심)·소매(보조) 함께 보기 ----------
const corr = (a, b) => { const n = a.length, ma = mean(a), mb = mean(b); let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; } return saa && sbb ? sab / Math.sqrt(saa * sbb) : 0; };

// 도매 변동이 소매에 몇 달 뒤 따라오는지(0~3개월 중 상관이 가장 큰 시차). 근거가 약하면 null.
export function leadLag(w, r) {
  const dw = [], dr = [];
  for (let i = 1; i < w.length; i++) { dw.push(Math.log(w[i] / w[i - 1])); dr.push(Math.log(r[i] / r[i - 1])); }
  let best = null;
  for (let k = 0; k <= 3; k++) { const c = corr(dw.slice(0, dw.length - k), dr.slice(k)); if (!best || c > best.corr) best = {lag: k, corr: c}; }
  return best.corr >= 0.2 ? best : null;
}

const chance = (f, last) => (f.lo >= last ? 'high' : f.mid >= last * 1.03 ? 'maybe' : f.mid <= last * 0.97 ? 'low' : 'flat');

export function analyzePair(pair, months) {
  const w = analyze({price: pair.wholesale.price}, months), r = analyze({price: pair.retail.price}, months);
  const n = w.price.length, gaps = w.price.map((p, i) => r.price[i] / p);
  const gapNow = gaps[n - 1], gapAvg = mean(gaps.slice(-37, -1)), ll = leadLag(w.price, r.price);
  const side = a => { const f = a.forecast[0]; return {last: a.last, mom: a.stats.mom, next: f, change: f.mid / a.last.price - 1, band: [f.lo / a.last.price - 1, f.hi / a.last.price - 1], chance: chance(f, a.last.price), reliability: a.reliability, mape: a.backtest.mape}; };
  const W = side(w), R = side(r);
  const lines = [];
  lines.push({kind: 'w', text: `도매가격은 이번 달(${w.last.month}) ${won(w.last.price)}/kg으로 ${W.mom == null || Math.abs(W.mom) < 0.02 ? '지난달과 비슷합니다' : `지난달보다 ${pct(W.mom)} ${W.mom > 0 ? '비쌉니다' : '쌉니다'}`}. 다음 달은 ${Math.abs(W.change) < 0.03 ? '비슷할 것으로 보입니다' : `${pct(W.change)} 정도 ${W.change > 0 ? '오를' : '내릴'} 것으로 예상됩니다`}.`});
  lines.push({kind: 'r', text: `소매가격은 이번 달 ${won(r.last.price)}/kg으로 ${R.mom == null || Math.abs(R.mom) < 0.02 ? '지난달과 비슷합니다' : `지난달보다 ${pct(R.mom)} ${R.mom > 0 ? '비쌉니다' : '쌉니다'}`}. 다음 달은 ${Math.abs(R.change) < 0.03 ? '비슷할 것으로 보입니다' : `${pct(R.change)} 정도 ${R.change > 0 ? '오를' : '내릴'} 것으로 예상됩니다`}.`});
  lines.push({kind: 'gap', text: `소매가격은 도매가격의 ${gapNow.toFixed(2)}배입니다. 최근 3년 평균(${gapAvg.toFixed(2)}배)보다 ${Math.abs(gapNow / gapAvg - 1) < 0.05 ? '비슷한 수준입니다' : gapNow > gapAvg ? '격차가 벌어져 있습니다' : '격차가 좁아져 있습니다'}.`});
  if (ll) lines.push({kind: 'lag', text: ll.lag === 0 ? '과거 10년을 보면 도매가격과 소매가격이 같은 달에 함께 움직이는 경향이 있었습니다.' : `과거 10년을 보면 도매가격이 움직이고 약 ${ll.lag}개월 뒤에 소매가격이 따라 움직이는 경향이 있었습니다.`});
  else lines.push({kind: 'lag', text: '도매가격 변동이 소매가격에 뚜렷한 시차를 두고 반영되는 경향은 확인되지 않았습니다.'});
  if (W.change >= 0.05 && ll && ll.lag > 0) lines.push({kind: 'warn', text: `도매가격이 오를 것으로 예상되어, 소매가격도 약 ${ll.lag}개월 뒤 영향을 받을 수 있습니다.`});
  if (w.reliability === 'low' || r.reliability === 'low') lines.push({kind: 'trust', text: `과거에 맞혀 본 평균 오차가 도매 ${pct(W.mape)}, 소매 ${pct(R.mape)}로 큰 편입니다. 정확한 값보다 오를지 내릴지 방향만 참고하십시오.`});
  return {months, W, R, gap: {now: gapNow, avg: gapAvg}, lag: ll, lines, wA: w, rA: r};
}
