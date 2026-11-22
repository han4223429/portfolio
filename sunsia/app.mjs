// 퐁당퐁당(식재료 가격 대응): 구내식당·독립구매 업장용
// 흐름: 구매 목록과 현장 단가 입력 → 가격 이상 점검 → 바꿀 수 있는 재료·알레르기 확인 → 발주표
// 값을 바꾸면 결과가 바로 갱신된다(버튼 없이 자동 계산).
import {runBasketWithFallback, swapTable, planAllergenChange, trendOf, seriesStats, risers, orderCSV, quoteStatus, STATUS} from './real.mjs';
import {parseLabelText} from './labels.mjs';
import {analyzeLabel, ALLERGENS19} from './allergen19.mjs';
import {toCSV} from './csv.mjs';
import {mascotSVG} from './mascot.mjs';
import {analyze, analyzePair, describe, METHODS, outlookOf} from './forecast.mjs';
import {recommend, recommendText} from './advice.mjs';

const $ = id => document.getElementById(id);
const won = n => `${Math.round(n).toLocaleString('ko-KR')}원`;
const pctTxt = n => (n > 0 ? `+${n}%` : `${n}%`);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
};
const clear = el => { el.replaceChildren(); return el; };
// 받침에 따라 조사 선택(고등어는 / 양파는 / 쌀은)
const jong = w => { const c = String(w).charCodeAt(String(w).length - 1); return c >= 0xAC00 && c <= 0xD7A3 ? (c - 0xAC00) % 28 : 0; };
const eunneun = w => (jong(w) ? '은' : '는');
const euroro = w => { const j = jong(w); return j === 0 || j === 8 ? '로' : '으로'; };
const eulreul = w => (jong(w) ? '을' : '를');
function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], {type: 'text/csv;charset=utf-8'}));
  const a = h('a', {href: url, download: name}); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  const rows = String(text).trim().split('\n').length - 1;
  toast(`${name} 파일을 받았어요`, rows > 0 ? `${rows}줄 · 엑셀에서 바로 열려요` : '엑셀에서 바로 열려요');
}
// 파일을 받았을 때 화면 아래에 잠깐 띄우는 안내
function toast(title, sub) {
  document.querySelector('.toast')?.remove();
  const t = h('div', {class: 'toast', role: 'status'}, h('i', {'aria-hidden': 'true', text: 'CSV'}), h('div', {}, h('b', {text: title}), h('span', {text: sub})));
  document.body.append(t); requestAnimationFrame(() => t.classList.add('on'));
  setTimeout(() => { t.classList.remove('on'); setTimeout(() => t.remove(), 400); }, 3200);
}

let data = null, hist = null;
let WK = null, WATCH_KEY = 'pongdang.watch.v1';
const loadWatch = () => { try { const v = JSON.parse(localStorage.getItem(WATCH_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const saveWatch = v => { try { localStorage.setItem(WATCH_KEY, JSON.stringify(v)); } catch {} };
let PAIR = null; // 도매·소매 짝 자료(전국, 원/kg)
const HS = {}; // 시세 분석 자료: nat(전국 소매) · pohang(포항 소매) · daegu(대구 도매)
const fcCache = {}; // 품목별 시세 분석 결과(한 번만 계산)
// 화면 상태: 구매 목록, 오늘 본 가격(현장 단가), 가격이 오른 재료, 상승률 가정, 비용 계산 기준, 계산 결과, 선택한 안
const S = {order: {}, basket: [], quotes: {}, channel: '도매시장·유통업체', target: null, targetManual: false, pct: 30, pack: 'market', run: null, planKey: 'min'};
const EXAMPLE_BASKET = [['양파', 30], ['시금치', 8], ['고등어', 10]]; // 예시일 뿐, 업장 양으로 고쳐 쓰도록 안내
const priceKeys = () => Object.values(data.catalog).filter(e => e.price).map(e => e.key);
const entry = k => data.catalog[k];
const perKg = e => e.price.price_krw / e.price.pack_g * 1000;
const activeQuotes = () => Object.fromEntries(Object.entries(S.quotes).filter(([k, v]) => v > 0 && entry(k)?.price));

// ---------- 입력 저장(브라우저에 보관) · 시연 예시 ----------
const STORE = 'sunsia.price-response.v1';
function saveState() {
  try { localStorage.setItem(STORE, JSON.stringify({basket: S.basket, quotes: S.quotes, channel: S.channel, pack: S.pack, pct: S.pct, target: S.target, targetManual: S.targetManual, order: S.order})); } catch { /* 저장이 막힌 환경에서는 저장 없이 동작 */ }
}
function loadState() {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (!v || !Array.isArray(v.basket)) return false;
    const basket = v.basket.filter(r => entry(r.key)?.price && r.kg > 0).slice(0, 10);
    if (!basket.length) return false;
    S.basket = basket.map(r => ({key: r.key, kg: Number(r.kg)}));
    S.quotes = Object.fromEntries(Object.entries(v.quotes || {}).filter(([k, q]) => entry(k)?.price && q > 0));
    S.order = v.order && typeof v.order === 'object' ? v.order : {}; S.channel = v.channel || S.channel; S.pack = v.pack === 'unit' ? 'unit' : 'market'; S.pct = [10, 30, 50, 100].includes(v.pct) ? v.pct : S.pct;
    S.target = basket.some(r => r.key === v.target) ? v.target : null; S.targetManual = !!v.targetManual && !!S.target;
    return true;
  } catch { return false; }
}
// 시연 예시: 평소 시장 가격에 배율을 곱한 "가정" 가격을 오늘 본 가격으로 넣는다(실제 가격이 아님)
const PRESETS = {
  spinach: {target: '시금치', factor: 1.84},
  mackerel: {target: '고등어', factor: 1.6},
  cabbage: {target: '배추', factor: 2.2},
};
function applyPreset(name) {
  S.quotes = {}; S.basket = EXAMPLE_BASKET.filter(([k]) => entry(k)?.price).map(([key, kg]) => ({key, kg})); S.targetManual = false; S.pack = 'market'; $('packMode').value = 'market';
  const p = PRESETS[name];
  if (p) {
    if (!S.basket.some(r => r.key === p.target)) S.basket.push({key: p.target, kg: 10});
    S.quotes[p.target] = Math.round(perKg(entry(p.target)) * p.factor / 10) * 10; S.target = p.target; S.targetManual = true;
  } else { S.target = S.basket.find(r => entry(r.key).group)?.key || S.basket[0]?.key; }
  renderBasket(); schedule();
}

// ---------- 대응 기록(브라우저 보관) ----------
const HIST = 'sunsia.history.v1';
const loadHist = () => { try { const v = JSON.parse(localStorage.getItem(HIST) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const saveHist = list => { try { localStorage.setItem(HIST, JSON.stringify(list.slice(0, 50))); } catch { /* 저장이 막힌 환경 */ } };
function addHistory() {
  const plan = currentPlan(); if (!plan || !S.run) return;
  const target = entry(S.target), q = S.quotes[S.target];
  const swaps = plan.selected.filter(s => s.sku !== s.original).map(s => `${entry(s.original).label}→${entry(s.sku).label}`);
  const rec = {at: new Date().toLocaleString('ko-KR'), target: target.label, quote: q > 0 ? Math.round(q) : null, channel: q > 0 ? S.channel : '가정', market: Math.round(perKg(target)), pct: q > 0 ? quoteStatus(target, q).pct : S.pct,
    plan: S.planKey === 'cheap' ? '가장 싸게' : '가장 적게 바꾸기', change: swaps.length ? swaps.join(', ') : '변경 없음', total: plan.total};
  saveHist([rec, ...loadHist()]); renderHistory();
  $('saveBtn').textContent = '저장했습니다'; setTimeout(() => { $('saveBtn').textContent = '대응 기록에 저장'; }, 1400);
}
function renderHistory() {
  const list = loadHist(), t = clear($('histTable'));
  $('histCsv').disabled = $('histClear').disabled = !list.length;
  if (!list.length) { t.append(h('tbody', {}, h('tr', {}, h('td', {colspan: 7, class: 'empty', text: '저장된 기록이 없습니다.'})))); return; }
  t.append(h('thead', {}, h('tr', {}, ['일시', '재료', '오늘 본 가격(경로)', '평소 시장가', '선택한 구성', '변경 내용', '합계'].map(x => h('th', {text: x})))),
    h('tbody', {}, list.map(r => h('tr', {}, h('td', {text: r.at}), h('td', {text: r.target}), h('td', {text: r.quote ? `${r.quote.toLocaleString('ko-KR')}원/kg (${r.channel}, ${r.pct >= 0 ? '+' : ''}${r.pct}%)` : `가정 +${r.pct}%`}), h('td', {text: `${r.market.toLocaleString('ko-KR')}원/kg`}), h('td', {text: r.plan}), h('td', {text: r.change}), h('td', {text: won(r.total)})))));
}

// ---------- 화면 전환(상단 메뉴) ----------
const VIEWS = {
  home: {crumb: '홈', title: '퐁당퐁당', desc: ''},
  main: {crumb: '가격 비교', title: '식재료 가격 비교', desc: '재료와 오늘 본 가격을 넣으면 바로 비교해 드려요.'},
  forecast: {crumb: '재료 보기', title: '재료 살펴보기', desc: '재료를 고르면 이번 달·이번 주 조언을 알려 드려요.'},
  check: {crumb: '제품·라벨 확인', title: '제품·라벨 확인', desc: '급하게 산 대체 제품의 가격과 알레르기를 확인해요.'},
  about: {crumb: '자료·확장', title: '자료 출처와 확장 계획', desc: '사용한 공공 자료의 출처와 한계, 다음 단계 확장 계획을 안내합니다.'},
};
function showView(name) {
  if (!VIEWS[name]) name = 'home';
  document.querySelectorAll('.view').forEach(v => { v.hidden = v.id !== `view-${name}`; });
  document.querySelectorAll('#tabs a').forEach(a => { if (a.dataset.view === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  $('crumbNow').textContent = VIEWS[name].crumb; $('pageTitle').textContent = VIEWS[name].title; $('pageDesc').textContent = VIEWS[name].desc;
  document.title = `${VIEWS[name].title} | 퐁당퐁당`; const changed = document.body.dataset.view !== name; document.body.dataset.view = name;
  if (changed) window.scrollTo(0, 0);
}
function initRouter() {
  const route = () => showView((location.hash.match(/^#\/(\w+)/) || [])[1] || 'home');
  window.addEventListener('hashchange', route);
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    const id = a.getAttribute('href').slice(1); if (!id || id.startsWith('/')) return;
    const t = document.getElementById(id), v = t?.closest('.view'); if (!v) return;
    e.preventDefault(); const name = v.id.replace('view-', ''); showView(name); history.replaceState(null, '', `#/${name}`);
    t.scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth', block: 'start'});
  });
  route();
}

// ---------- 시작 ----------
async function init() {
  initRouter();
  try { data = await (await fetch('./data/real_catalog.json')).json(); }
  catch { $('resultEmpty').textContent = '데이터를 불러오지 못했습니다. python3 app/server.py 로 실행한 주소로 접속해 주십시오.'; return; }
  renderFacts(); renderSponsors(); renderSources();
  S.basket = EXAMPLE_BASKET.filter(([k]) => entry(k)?.price).map(([key, kg]) => ({key, kg}));
  S.target = S.basket.find(r => entry(r.key).group)?.key || S.basket[0]?.key;
  if (loadState()) { $('packMode').value = S.pack; $('quoteChannel').value = S.channel; }
  document.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => applyPreset(b.dataset.preset)));
  $('printBtn').addEventListener('click', () => window.print());
  $('saveBtn').addEventListener('click', addHistory);
  initOrderForm();
  $('histClear').addEventListener('click', () => { saveHist([]); renderHistory(); });
  $('histCsv').addEventListener('click', () => download('퐁당퐁당_대응기록.csv', toCSV(['일시', '재료', '오늘 본 가격(원/kg)', '구매 경로', '평소 시장가(원/kg)', '시장가 대비(%)', '선택한 구성', '변경 내용', '합계(원)'], loadHist().map(r => ({'일시': r.at, '재료': r.target, '오늘 본 가격(원/kg)': r.quote ?? '', '구매 경로': r.channel, '평소 시장가(원/kg)': r.market, '시장가 대비(%)': r.pct, '선택한 구성': r.plan, '변경 내용': r.change, '합계(원)': r.total})))));
  renderHistory();
  $('addRow').addEventListener('click', addRow);
  $('targetSel').addEventListener('change', () => { S.target = $('targetSel').value; S.targetManual = true; renderTrend(); renderPct(); schedule(); });
  $('packMode').addEventListener('change', () => { S.pack = $('packMode').value; schedule(); });
  $('quoteChannel').addEventListener('change', () => { S.channel = $('quoteChannel').value; schedule(); });
  renderBasket(); renderRisers(); initLabel(); initSearch();
  try {
    const [daegu, kamis] = await Promise.all([fetch('./data/history.json').then(r => r.json()), fetch('./data/history_kamis.json').then(r => r.json()).catch(() => null)]);
    HS.daegu = {id: 'daegu', label: '대구 도매시장', unitLabel: '원/kg', note: `${daegu.source.region} · 도매 · 월별 거래량 가중 평균`, months: daegu.months, items: Object.fromEntries(Object.entries(daegu.items).map(([k, v]) => [k, {...v, unit: '1kg'}])), excluded: daegu.excluded};
    if (kamis) for (const [id, reg, lab] of [['nat', '전국', '전국 소매(KAMIS)'], ['pohang', '포항', '포항 소매(KAMIS)']]) HS[id] = {id, label: lab, note: `${kamis.source.name} · ${reg} · 소매`, months: kamis.months, items: kamis.regions[reg].items, excluded: kamis.regions[reg].excluded};
    hist = [HS.nat, HS.daegu].filter(Boolean); // 가격 대응의 3개월 전망은 전국 소매 → 대구 도매 순으로 찾는다
    for (const id of ['nat', 'pohang', 'daegu']) if (HS[id]) $('sourceList').append(h('div', {class: 'srow'}, h('b', {text: `시세 분석 자료 · ${HS[id].label}`}), h('span', {text: `${HS[id].note} · ${HS[id].months[0]}~${HS[id].months.at(-1)} · ${Object.keys(HS[id].items).length}개 품목`})));
    PAIR = await fetch('./data/history_pair.json').then(r => r.json()).catch(() => null);
    WK = await fetch('./data/weekly_kamis.json').then(r => r.json()).catch(() => null);
    initForecast(); renderHome(); initRoutine();
  } catch { $('view-forecast').innerHTML = '<div class="panel"><p class="empty">시세 분석 자료를 불러오지 못했습니다.</p></div>'; }
  schedule(true);
}

// ---------- 구매 목록(오늘 본 가격 포함) ----------
function renderBasket() {
  const body = clear($('basketRows'));
  const keys = priceKeys().sort((a, b) => entry(a).label.localeCompare(entry(b).label, 'ko'));
  S.basket.forEach((row, idx) => {
    const e = entry(row.key);
    const sel = h('select', {'aria-label': '재료', onchange: () => { row.key = sel.value; renderBasket(); schedule(); }}, keys.map(k => h('option', {value: k, text: `${entry(k).label}${entry(k).group ? ` · ${entry(k).group}` : ''}`})));
    sel.value = row.key;
    const kg = h('input', {type: 'number', min: '0.1', max: '1000', step: '0.5', value: String(row.kg), inputmode: 'decimal', 'aria-label': `${e.label} 구매량(kg)`, oninput: () => { row.kg = Number(kg.value) || 0; schedule(); }});
    const qs = h('span', {class: 'qs', 'aria-live': 'polite'});
    const q = h('input', {type: 'number', min: '1', step: '10', placeholder: '5000', inputmode: 'numeric', 'aria-label': `${e.label} 오늘 본 가격(원/kg)`, value: S.quotes[row.key] > 0 ? String(S.quotes[row.key]) : '',
      oninput: () => { const v = Number(q.value); if (v > 0) S.quotes[row.key] = v; else delete S.quotes[row.key]; updateQuoteStatus(row.key, qs); q.setAttribute('aria-invalid', quoteStatus(entry(row.key), S.quotes[row.key])?.absurd ? 'true' : 'false'); autoTarget(); schedule(); }});
    updateQuoteStatus(row.key, qs);
    body.append(h('div', {class: `bcard${row.key === S.target ? ' target' : ''}`, 'data-key': row.key},
      h('div', {class: 'bhead'}, sel, h('button', {type: 'button', class: 'btn btn-outline btn-sm', 'aria-label': `${e.label} 빼기`, onclick: () => { S.basket.splice(idx, 1); renderBasket(); schedule(); }}, '삭제')),
      h('div', {class: 'bgrid'},
        h('label', {class: 'fld'}, '구매량', h('div', {class: 'with-unit'}, kg, h('em', {text: 'kg'}))),
        h('label', {class: 'fld'}, '오늘 본 가격', h('div', {class: 'with-unit'}, q, h('em', {text: '원/kg'})))),
      h('div', {class: 'bmeta'}, h('span', {class: 'num', text: `평소 시장가 ${Math.round(perKg(e)).toLocaleString('ko-KR')}원/kg (${e.price.month})`}), qs)));
  });
  $('basketHint').textContent = S.basket.length >= 10 ? '재료는 10개까지 입력할 수 있습니다.' : '';
  $('addRow').disabled = S.basket.length >= 10;
  fillTargets();
}
function markTargetCard() { document.querySelectorAll('#basketRows .bcard').forEach(c => c.classList.toggle('target', c.dataset.key === S.target)); }
function updateQuoteStatus(key, el) {
  const st = quoteStatus(entry(key), S.quotes[key]);
  el.className = `qs ${st?.cls || ''}`; el.textContent = st ? st.label + (st.aboveAll ? ' · 관측 최고가 초과' : '') : '';
}
function addRow() {
  const used = new Set(S.basket.map(r => r.key));
  S.basket.push({key: priceKeys().find(k => !used.has(k)) || priceKeys()[0], kg: 10}); renderBasket(); schedule();
}
// 오늘 가격을 입력한 재료 중 시장가보다 가장 많이 비싼 재료를 자동으로 가격이 오른 재료로 선택(직접 고르지 않았을 때)
function autoTarget() {
  if (S.targetManual) return fillTargets();
  const cand = S.basket.map(r => ({k: r.key, st: quoteStatus(entry(r.key), S.quotes[r.key])})).filter(x => x.st && x.st.pct > 0).sort((a, b) => b.st.pct - a.st.pct)[0];
  if (cand) S.target = cand.k;
  fillTargets();
}
function fillTargets() {
  const sel = clear($('targetSel')), seen = new Set();
  for (const r of S.basket) {
    if (seen.has(r.key)) continue; seen.add(r.key);
    const e = entry(r.key);
    sel.append(h('option', {value: r.key, text: `${e.label}${e.group ? ` · 대체 후보 있음(${e.group})` : ' · 같은 식품군 후보 없음'}`}));
  }
  if (!S.target || !seen.has(S.target)) S.target = [...seen][0] || null;
  if (S.target) sel.value = S.target;
  markTargetCard(); renderTrend(); renderPct();
}

function sparkline(series) {
  const W = 320, H = 86, pad = 8, vals = series.map(s => s[1]);
  const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
  const pts = series.map(([, v], i) => [pad + (i / (series.length - 1 || 1)) * (W - 2 * pad), H - pad - ((v - lo) / span) * (H - 2 * pad)]);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `월별 가격 흐름: ${series[0][0]} ${won(series[0][1])}에서 ${series.at(-1)[0]} ${won(series.at(-1)[1])}`);
  const line = document.createElementNS(ns, 'polyline');
  line.setAttribute('points', pts.map(p => p.join(',')).join(' ')); line.setAttribute('fill', 'none'); line.setAttribute('stroke', 'var(--g)'); line.setAttribute('stroke-width', '2.5'); line.setAttribute('stroke-linejoin', 'round');
  const dot = document.createElementNS(ns, 'circle'); const lp = pts.at(-1);
  dot.setAttribute('cx', lp[0]); dot.setAttribute('cy', lp[1]); dot.setAttribute('r', '4.5'); dot.setAttribute('fill', '#b45309');
  svg.append(line, dot);
  return svg;
}
function renderTrend() {
  const box = clear($('trend'));
  const e = S.target && entry(S.target);
  if (!e?.price) return;
  const p = e.price, st = seriesStats(p.series), cls = n => (n > 0 ? 'up' : 'down');
  box.append(sparkline(p.series), h('div', {},
    h('h3', {text: `${e.label} 최근 가격 흐름`}),
    h('p', {}, `${p.series[0][0]} ${won(p.series[0][1])} → ${p.month} `, h('b', {class: 'num', text: won(p.price_krw)}), ` (${p.pack_g >= 1000 ? p.pack_g / 1000 + 'kg' : p.pack_g + 'g'} 거래단위)`),
    st.yoyPct != null ? h('p', {}, '1년 전 대비 ', h('span', {class: cls(st.yoyPct), text: pctTxt(st.yoyPct)})) : null,
    st.threeMonthPct != null ? h('p', {}, '3개월 전 대비 ', h('span', {class: cls(st.threeMonthPct), text: pctTxt(st.threeMonthPct)})) : null,
    h('p', {}, '관측 기간 최저가 대비 ', h('span', {class: cls(st.riseFromMinPct), text: pctTxt(st.riseFromMinPct)})),
    h('p', {class: 'src', text: `출처: aT 월별 농축수산물 도매가격 · ${p.spec} · ${p.month} 기준`})));
}
const hintFor = o => (o.note === '가정' ? '계산을 위한 가정입니다. 실제 가격과 다를 수 있습니다.' : '실제 관측된 가격 흐름에서 계산한 상승률입니다.');
function renderPct() {
  const box = clear($('pctGroup')), e = S.target && entry(S.target);
  const locked = S.target && S.quotes[S.target] > 0;
  box.classList.toggle('locked', !!locked);
  const st = e?.price ? seriesStats(e.price.series) : null;
  const opts = [10, 30, 50, 100].map(v => ({v, t: `+${v}%`, note: '가정'}));
  if (st && st.riseFromMinPct > 0 && !opts.some(o => o.v === st.riseFromMinPct)) opts.unshift({v: st.riseFromMinPct, t: `실제 +${st.riseFromMinPct}%`, note: '관측 최저가 대비 현재'});
  if (!opts.some(o => o.v === S.pct)) S.pct = opts[0].v;
  for (const o of opts) box.append(h('label', {}, h('input', {type: 'radio', name: 'pct', value: o.v, checked: o.v === S.pct, disabled: !!locked, onchange: () => { S.pct = o.v; $('pctHint').textContent = hintFor(o); schedule(); }}), h('span', {text: o.t})));
  $('pctHint').textContent = locked ? '오늘 본 가격을 입력하셨으므로 입력하신 가격으로 계산합니다(상승률 가정은 사용하지 않습니다).' : hintFor(opts.find(o => o.v === S.pct));
}
function renderRisers() {
  const box = clear($('risers'));
  box.append(h('p', {class: 'hint', text: '관측 기간 중 가장 낮았던 달보다 지금 얼마나 높은지 계산했습니다. 선택하면 해당 재료가 가격이 오른 재료로 지정됩니다.'}),
    h('div', {class: 'riser-list'}, risers(data, 8).map(r => h('button', {type: 'button', class: 'riser', onclick: () => pickRiser(r.key)},
      h('b', {text: `${r.label}  +${r.stats.riseFromMinPct}%`}), h('span', {text: `${r.stats.min[0]} ${won(r.stats.min[1])} → ${r.stats.last[0]} ${won(r.stats.last[1])}`})))));
}
function pickRiser(key) {
  if (!S.basket.some(r => r.key === key)) S.basket.push({key, kg: 10});
  S.target = key; S.targetManual = true; renderBasket(); schedule();
}

// ---------- 자동 계산 ----------
let timer = null;
function schedule(first) {
  clearTimeout(timer);
  const chip = $('resultChip'); chip.textContent = '계산 중'; chip.className = 'status busy';
  saveState();
  timer = setTimeout(compute, first ? 0 : 200);
}
const basketValid = () => S.basket.some(r => r.key && r.kg > 0);
function showEmpty(msg) {
  $('resultEmpty').textContent = msg; $('resultEmpty').hidden = false; $('resultBody').hidden = true; $('s3').hidden = true;
  $('resultChip').textContent = '입력 대기'; $('resultChip').className = 'status'; S.run = null; updateStepper();
}
function compute() {
  const basket = S.basket.filter(r => r.key && r.kg > 0);
  if (!basket.length || !S.target) return showEmpty('구매 목록을 입력하면 결과가 이곳에 표시됩니다.');
  const {catalog, result, shocks, relaxed} = runBasketWithFallback(data, basket, S.target, S.pct, S.pack, activeQuotes());
  S.run = {catalog, result, basket, shocks, relaxed: !!relaxed};
  $('resultEmpty').hidden = true; $('resultBody').hidden = false;
  renderResult();
  updateStepper(); updateMobileBar();
}
function updateMobileBar() {
  const bar = $('mbar'), plan = currentPlan(), chip = $('resultChip');
  if (!S.run) { bar.hidden = true; return; }
  bar.hidden = false;
  $('mbarText').textContent = plan ? `${chip.textContent} · ${won(plan.total)}` : chip.textContent;
}
function updateStepper() {
  const items = [...document.querySelectorAll('#stepper li')], st = S.target && quoteStatus(entry(S.target), S.quotes[S.target]);
  const ok = basketValid(), r = S.run?.result, swaps = ok && S.target && entry(S.target).group;
  const cls = [ok ? 'done' : 'now', !ok ? '' : st?.cls === 'spike' ? 'alert-step' : 'done', !ok ? '' : (r && (swaps || r.status === STATUS.FEASIBLE) ? 'done' : 'now'), currentPlan() ? 'now' : ''];
  items.forEach((li, i) => { li.className = cls[i]; });
}

function animateNumber(el, to, fmt, from) {
  if (reduceMotion || from == null || from === to) { el.textContent = fmt(to); return; }
  const t0 = performance.now(), dur = 450;
  const step = now => { const k = Math.min(1, (now - t0) / dur), e = 1 - (1 - k) ** 3; el.textContent = fmt(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
const prevNums = new Map();
function countUp(el, key, to, fmt) {
  const prev = prevNums.get(key);
  animateNumber(el, to, fmt, prev); prevNums.set(key, to);
  if (prev != null && prev !== to) { const box = el.closest('.sum,.opt'); box?.classList.remove('flash'); void box?.offsetWidth; box?.classList.add('flash'); }
}

// ---------- 분석 결과(오른쪽 패널) ----------
function algChips(before, added, removed) {
  return h('div', {class: 'alg-row'}, ALLERGENS19.map(g => {
    const cls = added.includes(g.no) ? 'alg add' : removed.includes(g.no) ? 'alg maybe' : before.has(g.no) ? 'alg has' : 'alg';
    const t = added.includes(g.no) ? ' · 추가' : removed.includes(g.no) ? ' · 제외' : '';
    return h('span', {class: cls, text: `${g.no} ${g.name}${t}`});
  }));
}
const algLegend = () => h('div', {class: 'legend'}, h('span', {class: 'alg has', text: '현재 구매 목록에 해당'}), h('span', {class: 'alg add', text: '변경 시 추가'}), h('span', {class: 'alg maybe', text: '변경 시 제외'}));
const algText = nos => (nos.length ? nos.map(n => `${n} ${data.allergen_names[n] || ''}`.replace(/\(.*?\)/, '')).join(', ') : '해당 없음');
const outlookChip = label => { const o = outlookOf(hist, label, fcCache); if (!o) return h('span', {class: 'src', text: '자료 없음'}); return h('span', {class: `chip ${o.outlook === 'up' ? 'chip-amber' : o.outlook === 'down' ? 'chip-teal' : 'chip-gray'}`, title: `과거 검증 오차 ${Math.round(o.mape * 100)}%`, text: `${{up: '오를 가능성', down: '내릴 가능성', flat: '비슷'}[o.outlook]}${o.reliability === 'low' ? '(참고)' : ''}`}); };
const trendChip = t => h('span', {class: `chip ${t.cls === 'up' ? 'chip-amber' : t.cls === 'down' ? 'chip-teal' : 'chip-gray'}`, text: t.label});

// 대체안이 없을 때의 대응 제안
function renderTips(issues, target, kg) {
  const t = swapTable(data, S.target, kg, S.pct, activeQuotes());
  const cheapest = t.list[0];
  issues.append(h('div', {class: 'alert warn'}, h('b', {text: '대응 제안'}), h('div', {},
    h('p', {text: cheapest ? `같은 식품군 후보(${t.list.map(x => x.label).join(', ')})가 모두 ${target.label}의 현재 가격보다 비싸거나 구성 조건을 만족하지 못합니다. 가장 낮은 후보는 ${cheapest.label}(${won(cheapest.perKg)}/kg)입니다.` : '가격이 연결된 같은 식품군 후보가 없습니다.'}),
    h('ul', {class: 'tips'}, [
      '구매 경로를 바꿔 견적을 다시 받아 위 "오늘 본 가격"에 입력하십시오(직송·도매시장·마트).',
      '후보 재료의 오늘 가격을 표에 입력하면 즉시 다시 계산합니다.',
      '시세 전망을 확인하고 구매 시기나 구매량을 나누는 방법을 검토하십시오.',
    ].map(x => h('li', {text: x}))))));
}

function renderResult() {
  const {catalog, result, basket} = S.run;
  const summary = clear($('summary')), issues = clear($('issues')), options = clear($('options')), pc = clear($('priceCheck'));
  $('diff').hidden = true; $('reviewNote').hidden = true;
  const target = entry(S.target), tq = S.quotes[S.target], st = tq > 0 ? quoteStatus(target, tq) : null;
  const kg = basket.filter(r => r.key === S.target).reduce((s, r) => s + r.kg, 0);
  const chip = $('resultChip');

  // 가격 점검
  if (st) {
    const kind = st.cls === 'spike' ? 'danger' : st.cls === 'high' ? 'warn' : st.cls === 'low' ? 'info' : 'ok';
    pc.append(h('div', {class: `alert ${kind}`}, h('b', {text: st.cls === 'spike' ? '가격 이상' : '가격 점검'}),
      h('p', {text: `${target.label} 오늘 본 가격(${S.channel}) ${won(tq)}/kg은 평소 도매 시장 가격(${won(st.market)}/kg)보다 ${st.pct >= 0 ? '+' : ''}${st.pct}%입니다.${st.absurd ? ' 입력값이 시장가의 20배를 넘습니다. 단위(원/kg)를 확인하십시오.' : ''}${st.aboveAll ? ` 관측 기간 최고가(${won(st.maxSeries)}/kg)를 넘었습니다.` : ''}${st.cls === 'spike' || st.cls === 'high' ? ' 바로 구매하기 전에 아래 대체 재료와 가격을 확인하십시오.' : ''}`})));
  } else {
    pc.append(h('div', {class: 'alert info'}, h('b', {text: '가정'}), h('p', {text: `${target.label} 가격이 +${S.pct}% 오른 것으로 가정하여 계산합니다. 현장에서 확인한 가격이 있으면 왼쪽 표의 "오늘 본 가격"에 입력하십시오.`})));
  }

  // 검토 우선 대안 한 줄 요약
  const rec = recommend(data, S.target, kg, S.pct, activeQuotes(), hist, fcCache);
  const recBox = clear($('reco'));
  recBox.append(h('div', {class: `alert ${rec.kind === 'pick' ? 'ok' : 'warn'}`}, h('b', {text: rec.kind === 'pick' ? '검토 우선 대안' : '대안 없음'}), h('p', {text: recommendText(data, rec, target.label, kg) + (rec.kind === 'pick' ? ' (참고이며 맛·조리 적합성은 담당자가 확인합니다.)' : '')})));
  // 10년 시세 분석 연결: 대상 재료의 앞으로 3개월 전망
  const ol = outlookOf(hist, target.label, fcCache);
  if (ol) {
    const word = {up: '오를 가능성이 있습니다', down: '내릴 가능성이 있습니다', flat: '큰 변동 없이 비슷할 것으로 보입니다'}[ol.outlook], rel = {good: '비교적 믿을 만함', ok: '참고용', low: '예측이 어려워 방향만 참고'}[ol.reliability];
    pc.append(h('div', {class: 'alert info'}, h('b', {text: '시세 전망'}), h('p', {}, (ol.mom != null ? `지난달(${ol.prevMonth})보다 이번 달(${ol.last.month})은 ${Math.abs(ol.mom) < 0.02 ? '가격이 비슷합니다' : `${Math.round(Math.abs(ol.mom) * 100)}% ${ol.mom > 0 ? '비쌉니다' : '쌉니다'}`}. ` : '') + ol.next + ` ${ol.source} 10년 분석 기준 ${target.label}${eunneun(target.label)} ${ol.last.month}에 10년 평균보다 ${Math.abs(Math.round(ol.vsAll * 100))}% ${ol.vsAll >= 0 ? '높고' : '낮고'}, 앞으로 3개월은 ${word}(과거 검증 오차 ${Math.round(ol.mape * 100)}% · ${rel}). `, h('a', {href: '#forecast', onclick: () => showForecast(target.label, HS.nat?.items[target.label] ? 'nat' : 'daegu'), text: '시세 분석 보기'}))));
  }

  if (result.c0 != null) {
    const parts = [['c0', '평소 시장 가격 기준 구매 비용', result.c0, ''], ['shock', `${target.label} 가격 반영 후 비용`, result.shockedOriginal.total, 'warn'], ['diff', '증감액', result.shockedOriginal.total - result.c0, 'warn']];
    for (const [key, label, val, cls] of parts) {
      const strong = h('strong', {text: ''});
      summary.append(h('div', {class: `sum ${cls}`}, h('small', {text: label}), strong));
      countUp(strong, `sum-${key}`, val, v => (key === 'diff' && v >= 0 ? '+' : '') + won(v));
    }
  }
  renderAction(target, tq, st, rec, ol, kg);
  renderSwapTable(kg);

  if (result.status !== STATUS.FEASIBLE) {
    chip.textContent = !target.group ? '대체 후보 없음' : result.status === STATUS.INFEASIBLE ? '대체안 없음 · 대응 제안' : '입력 확인 필요'; chip.className = 'status warn';
    if (!target.group) issues.append(h('div', {class: 'issue info'}, h('b', {text: `${target.label}${eunneun(target.label)} 지침의 동일 식품군 대체 목록에 없어 후보를 만들지 않았습니다. `}), '가격이 오른 상태로 구매하거나 다른 방법을 검토하십시오.'));
    if (target.group && result.status === STATUS.INFEASIBLE) {
      renderTips(issues, target, kg);
    } else {
      for (const i of result.issues || []) issues.append(h('div', {class: result.status === STATUS.INFEASIBLE ? 'issue info' : 'issue', text: i.message}));
    }
    $('s3').hidden = true; return;
  }
  const cheap = result.lowestCost[0], few = result.minChanges[0];
  if (S.run.relaxed && cheap.changes === 0 && few.changes === 0) { // 오른 가격의 원안보다 싼 대체 구성이 없음
    chip.textContent = '대체안 없음 · 대응 제안'; chip.className = 'status warn';
    renderTips(issues, target, kg); $('s3').hidden = true; return;
  }
  chip.textContent = st?.cls === 'spike' ? '가격 이상 · 대체안 있음' : '분석 완료'; chip.className = st?.cls === 'spike' ? 'status danger' : 'status ok';
  if (S.run.relaxed) issues.append(h('div', {class: 'issue info'}, h('b', {text: '평소 비용 안에서는 구성이 어렵습니다. '}), `대신 ${target.label}${eulreul(target.label)} 오른 가격 그대로 사는 비용(${won(result.shockedOriginal.total)}) 이하인 구성을 보여 드립니다.`));
  for (const p of [{key: 'cheap', title: '가장 싸게', sub: '구매 비용이 가장 낮은 구성(비용이 같으면 변경이 적은 쪽)', plan: cheap}, {key: 'min', title: '가장 적게 바꾸기', sub: '변경하는 재료가 가장 적은 구성(변경 수가 같으면 비용이 낮은 쪽)', plan: few}]) options.append(optionCard(p, result));
  const d = result.difference;
  $('diff').textContent = cheap.key === few.key ? '두 방법의 결과가 같습니다. 이 조건에서는 가장 싼 구성이 가장 적게 바꾸는 구성이기도 합니다.'
    : `두 구성의 차이: ${won(Math.abs(d.additionalCost))} ${d.additionalCost >= 0 ? '더 들지만' : '덜 들고'} 변경하는 재료가 ${Math.abs(d.changes)}개 ${d.changes >= 0 ? '적습니다.' : '많습니다.'}`;
  $('diff').hidden = false;
  const rn = clear($('reviewNote'));
  rn.append(h('b', {text: '유의'}), h('p', {text: `${data.rules.doc}의 "동일 식품군 안에서 같은 조리법" 기준을 따랐습니다. 맛·조리 적합성과 알레르기는 업장 담당자가 최종 확인하십시오. 영양 변화는 이번 버전에서 다루지 않습니다(추후 확장).`}));
  rn.hidden = false;
  renderOrder();
}

// 바꿀 수 있는 재료: 같은 양 비용 · 가격 흐름 · 알레르기. 후보의 오늘 가격도 입력할 수 있다.
function renderSwapTable(kg) {
  const active = document.activeElement?.dataset?.qkey, caret = document.activeElement?.selectionStart;
  const box = clear($('swapBox'));
  const t = swapTable(data, S.target, kg, S.pct, activeQuotes());
  $('swapGroup').textContent = t.group ? t.group : '';
  if (!t.list.length) { box.append(h('p', {class: 'empty', text: '같은 식품군에서 바꿀 수 있는 재료가 없어요.'})); return; }
  const o = t.original;
  const hasHist = !!(HS.nat?.items[o.label] || HS.daegu?.items[o.label]);
  const olText = label => { const ol = outlookOf(hist, label, fcCache); return ol ? {up: '다음 달 오를 듯', down: '다음 달 내릴 듯', flat: '다음 달 비슷'}[ol.outlook] : ''; };
  const row = x => {
    const qi = h('input', {type: 'number', min: '1', step: '10', class: 'qin', placeholder: `${Math.round(x.marketPerKg).toLocaleString('ko-KR')}`, inputmode: 'numeric', value: S.quotes[x.key] > 0 ? String(S.quotes[x.key]) : '', 'aria-label': `${x.label} 오늘 본 가격(원/kg)`, 'data-qkey': x.key,
      oninput: () => { const v = Number(qi.value); if (v > 0) S.quotes[x.key] = v; else delete S.quotes[x.key]; schedule(); }});
    const name = x.label.replace(/\(.*?\)/, '');
    const meta = [`1kg ${won(x.perKg)}${x.quoted ? '(입력)' : ''}`, x.trend.label.replace('최근 3개월 ', '3개월 '), olText(x.key), x.allergens.length ? `알레르기 ${x.allergens.join('·')}번` : '알레르기 없음'].filter(Boolean).join(' · ');
    return h('details', {class: `cand${x.good ? ' good' : ''}`, open: active === x.key ? '' : null},
      h('summary', {}, h('div', {class: 'cmain'}, h('b', {text: name}), x.good ? h('span', {class: 'tag swap', text: '추천'}) : null, h('span', {class: 'cmeta', text: meta})),
        h('strong', {class: x.diff <= 0 ? 'down' : 'up', text: `${x.diff <= 0 ? '−' : '+'}${won(Math.abs(Math.round(x.diff)))}`})),
      h('div', {class: 'cedit'}, h('label', {}, '가게에서 본 1kg 가격', qi, '원'), h('span', {class: 'src', text: `${kg}kg 사면 ${won(x.cost)}`})));
  };
  const top = t.list.slice(0, 4), rest = t.list.slice(4);
  box.append(h('p', {class: 'hint', text: `${o.label.replace(/\(.*?\)/, '')} ${kg}kg 대신 샀을 때의 비용 차이예요. 누르면 가게 가격을 직접 넣을 수 있어요.`}),
    h('div', {class: 'cand-list'}, top.map(row)),
    rest.length ? h('details', {class: 'adv'}, h('summary', {text: `후보 ${rest.length}개 더 보기`}), h('div', {class: 'cand-list'}, rest.map(row))) : '',
    hasHist ? h('a', {class: 'more-link', href: '#forecast', onclick: () => showForecast(o.label, HS.nat?.items[o.label] ? 'nat' : 'daegu'), text: `${o.label.replace(/\(.*?\)/, '')} 시세 자세히 보기 ›`}) : '');
  if (active) { const el = box.querySelector(`[data-qkey="${active}"]`); if (el) { el.focus(); try { el.setSelectionRange(caret, caret); } catch { /* number 입력은 커서 위치를 지원하지 않음 */ } } }
}

function optionCard(p, result) {
  const {plan} = p, chosen = S.planKey === p.key;
  const swaps = plan.selected.filter(s => s.sku !== s.original), ch = planAllergenChange(data, plan);
  const swapEls = swaps.map(s => h('div', {class: 'swap'}, h('span', {class: 't', text: `${entry(s.original).label} → ${entry(s.sku).label}`}),
    h('span', {class: 'chips'}, h('span', {class: 'chip chip-teal', text: entry(s.original).group}), h('span', {class: 'chip chip-amber', text: '지침 허용 · 팀 검토 대기'})),
    h('span', {text: `같은 양(중량 1:1 가정)으로 변경합니다. 가격 흐름: ${trendOf(entry(s.sku)).label}`})));
  const totalEl = h('strong', {text: ''});
  const card = h('article', {class: `opt${chosen ? ' chosen' : ''}`, 'aria-label': p.title},
    h('div', {class: 'row', style: 'margin:0;justify-content:space-between'}, h('h3', {text: p.title}), chosen ? h('span', {class: 'chip chip-green', text: '선택됨'}) : null),
    h('p', {class: 'sub', text: p.sub}),
    h('div', {class: 'big-nums'}, h('div', {}, h('small', {text: '구매 비용'}), totalEl), h('div', {}, h('small', {text: '변경 재료'}), h('strong', {}, String(plan.changes), h('em', {text: '개'})))),
    stage(2, '변경 재료', swaps.length ? swapEls : [h('p', {class: 'keep', text: '변경하는 재료가 없습니다. 현재 구성 그대로입니다.'})]),
    stage(3, '원재료 확인', [h('p', {text: swaps.length ? '변경 재료는 농·수산물 원재료입니다. 가공식품으로 바꿀 때는 "제품·라벨 확인"에서 원재료와 알레르기를 확인하십시오.' : '확인할 새 원재료가 없습니다.'}), h('a', {href: '#label', text: '라벨 스캔으로 이동'})]),
    stage(4, '알레르기 비교', [algChips(ch.before, ch.added, ch.removed), algLegend(), h('p', {class: 'hint', text: swaps.length ? (ch.added.length ? `변경하면 ${algText(ch.added)} 표시가 새로 필요합니다.` : '변경해도 새로 추가되는 알레르기 번호는 없습니다(재료 이름 기준 참고).') : '변경 재료가 없어 그대로입니다.'})]),
    stage(5, '가격 비교', [h('p', {text: S.run.relaxed ? `구매 비용은 ${won(plan.total)}이며 오른 가격 그대로 사는 비용(${won(result.shockedOriginal.total)})보다 ${won(result.shockedOriginal.total - plan.total)} 낮습니다. 평소 비용(${won(result.c0)})은 ${plan.total <= result.c0 ? '이내입니다' : `${won(plan.total - result.c0)} 초과합니다`}.` : `구매 비용은 ${won(plan.total)}이며 평소 시장 가격 기준 비용(${won(result.c0)}) ${plan.total <= result.c0 ? '이내입니다' : '을 넘습니다'}.`})]),
    h('div', {class: 'pick'}, h('button', {type: 'button', class: chosen ? 'btn btn-primary' : 'btn btn-outline', onclick: () => { S.planKey = p.key; renderResult(); updateStepper(); }}, chosen ? '선택됨 · 발주표 확인' : '이 구성으로 발주표 작성')));
  countUp(totalEl, `opt-${p.key}`, plan.total, won);
  return card;
}
const stage = (n, title, kids) => h('div', {class: 'stage'}, h('span', {class: 'n', text: String(n)}), h('div', {}, h('h4', {text: title}), kids));

// ---------- 발주서 문구(전송은 담당자가 직접) ----------
const ORD_IDS = ['ordSupplier', 'ordDate', 'ordPlace', 'ordContact', 'ordNote'];
function orderText(plan, quotes) {
  const f = Object.fromEntries(ORD_IDS.map(id => [id, ($(id)?.value || '').trim()]));
  const market = S.pack === 'market';
  const lines = plan.lines.map((l, i) => {
    const swapped = plan.selected.find(s => s.sku === l.sku && s.original !== l.sku);
    const qty = `${Math.round(l.required_g / 10) / 100}kg`;
    const pack = market ? ` (${l.pack_size_g >= 1000 ? l.pack_size_g / 1000 + 'kg' : l.pack_size_g + 'g'} × ${l.pack_count})` : '';
    const price = quotes[l.sku] ? `${Math.round(quotes[l.sku]).toLocaleString('ko-KR')}원/kg(입력 단가)` : `${Math.round(entry(l.sku).price.price_krw / entry(l.sku).price.pack_g * 1000).toLocaleString('ko-KR')}원/kg(도매 월평균 참고)`;
    return `${i + 1}. ${l.name} ${qty}${pack} · ${price}${swapped ? ` · ${entry(swapped.original).label} 대체` : ''}`;
  });
  return ['[발주서]', `발주일: ${new Date().toLocaleDateString('ko-KR')}`, `업체: ${f.ordSupplier || '(미입력)'} 귀하`, `납품 희망일: ${f.ordDate || '(미입력)'}`, `납품 장소: ${f.ordPlace || '(미입력)'}`, `담당자·연락처: ${f.ordContact || '(미입력)'}`, '', '품목', ...lines, '', `합계(참고): ${won(plan.total)}`, f.ordNote ? `요청사항: ${f.ordNote}` : '', '※ 단가는 참고 금액이며 최종 단가·수량은 업체 견적과 협의에 따릅니다.'].filter((x, i, arr) => x !== '' || arr[i - 1] !== '').join('\n');
}
function initOrderForm() {
  const refresh = () => { const p = currentPlan(); if (p) $('ordText').value = orderText(p, activeQuotes()); saveState(); };
  for (const id of ORD_IDS) { $(id).value = S.order[id] || ''; $(id).addEventListener('input', () => { S.order[id] = $(id).value; refresh(); }); }
  $('ordCopy').addEventListener('click', async () => {
    const t = $('ordText').value; if (!t) return;
    try { await navigator.clipboard.writeText(t); $('ordMsg').textContent = '복사했습니다. 업체에 직접 전달하십시오.'; }
    catch { $('ordText').select(); $('ordMsg').textContent = '복사 권한이 없어 문구를 선택했습니다. 직접 복사(Ctrl+C)하십시오.'; }
  });
  $('ordPrint').addEventListener('click', () => window.print());
  S.refreshOrderText = refresh;
}

// ---------- 구매처 바로가기(주문은 각 사이트에서 직접. 퐁당퐁당은 주문을 전송하지 않는다) ----------
const SHOPS = [
  ['쿠팡', q => `https://www.coupang.com/np/search?q=${encodeURIComponent(q)}`],
  ['네이버 쇼핑', q => `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(q)}`],
  ['마켓컬리', q => `https://www.kurly.com/search?sword=${encodeURIComponent(q)}`],
];
function renderShops(plan) {
  const box = clear($('shopList'));
  for (const l of plan.lines) {
    const qty = `${Math.round(l.required_g / 10) / 100}kg`;
    box.append(h('div', {class: 'shop-row'}, h('div', {}, h('b', {text: l.name}), h('span', {text: `필요 ${qty} · 참고 단가 ${won(l.pack_price_krw / (l.pack_size_g / 1000))}/kg`})),
      h('div', {class: 'shop-links'}, SHOPS.map(([name, url]) => h('a', {class: 'shop', href: url(l.name), target: '_blank', rel: 'noopener noreferrer', 'aria-label': `${l.name} ${name}에서 검색(새 창)`, text: `${name}에서 찾기`})))));
  }
}

// ---------- 발주표 ----------
const currentPlan = () => { const r = S.run?.result; return r?.status === STATUS.FEASIBLE ? (S.planKey === 'cheap' ? r.lowestCost[0] : r.minChanges[0]) : null; };
function renderOrder() {
  const plan = currentPlan(); if (!plan) return;
  const {catalog} = S.run, market = S.pack === 'market', quotes = activeQuotes();
  $('s3').hidden = false;
  $('orderTitle').textContent = `발주표 (${S.planKey === 'cheap' ? '가장 싸게' : '가장 적게 바꾸기'})`;
  const t = clear($('orderTable'));
  t.append(h('thead', {}, h('tr', {}, ['품목', '구분', '필요량(g)', market ? '거래단위' : '계산 단위', market ? '포장 수' : '단위 수', '구매량(g)', '잔량(g)', market ? '포장 단가' : '단위 단가', '금액', '가격 기준'].map(x => h('th', {text: x})))));
  const swapped = new Map(plan.selected.filter(s => s.sku !== s.original).map(s => [s.sku, s.original]));
  t.append(h('tbody', {}, plan.lines.map(l => {
    const e = entry(l.sku), isSwap = swapped.has(l.sku);
    return h('tr', {}, h('td', {text: l.name}), h('td', {}, h('span', {class: `tag ${isSwap ? 'swap' : 'keep'}`, text: isSwap ? `대체(←${entry(swapped.get(l.sku)).label})` : '현재'})),
      h('td', {text: String(Math.round(l.required_g * 10) / 10)}), h('td', {text: l.pack_size_g >= 1000 ? `${l.pack_size_g / 1000}kg` : `${l.pack_size_g}g`}),
      h('td', {text: String(l.pack_count)}), h('td', {text: String(l.purchased_g)}), h('td', {text: String(Math.round(l.leftover_g * 10) / 10)}),
      h('td', {text: won(l.pack_price_krw)}), h('td', {text: won(l.line_cost_krw)}), h('td', {}, h('span', {class: 'src', text: quotes[l.sku] ? '입력 단가' : `도매 ${e.price.month}`})));
  })));
  t.append(h('tfoot', {}, h('tr', {}, h('td', {colspan: 8, text: '합계'}), h('td', {text: won(plan.total)}), h('td'))));
  $('csvBtn').disabled = false; $('saveBtn').disabled = false; S.refreshOrderText?.(); renderShops(plan);
  $('csvBtn').onclick = () => download('퐁당퐁당_발주표.csv', orderCSV(data, catalog, plan, {title: '구매 목록', servings: '-', pct: S.pct, target: entry(S.target).label, quotes, channel: S.channel, quoteKg: quotes[S.target] || null, quotePct: quotes[S.target] ? quoteStatus(entry(S.target), quotes[S.target])?.pct : null}));
}

// ---------- 10년 시세 분석 · 예측 ----------
const KIND = {now: '지금', mom: '지난달 대비', next: '다음 달', rank: '10년 중', season: '계절', trend: '최근 흐름', forecast: '앞으로 3개월', trust: '믿을 정도'};
let fcSrc = 'nat';
const unitText = u => String(u || '1kg').replace(/^1(?=[가-힣a-z])/i, '');
function initForecast() {
  fcSrc = HS.nat ? 'nat' : 'daegu';
  const reg = clear($('fcRegion')); reg.append(h('option', {value: fcSrc, text: HS[fcSrc].label})); reg.value = fcSrc;
  $('fcItem').addEventListener('change', () => showForecast($('fcItem').value, fcSrc));
  $('fcSearch').addEventListener('input', renderChips);
  fillFcItems(); renderChips(); showForecast($('fcItem').value, fcSrc);
}
function renderChips() {
  const box = clear($('fcChips')), q = $('fcSearch').value.trim(), cur = $('fcItem').value;
  const names = Object.keys(HS[fcSrc].items).filter(n => !q || n.includes(q)).sort((x, y) => x.localeCompare(y, 'ko'));
  if (!names.length) box.append(h('p', {class: 'empty', text: '찾는 재료가 없어요.'}));
  for (const n of names) box.append(h('button', {class: 'chip-i', type: 'button', role: 'option', 'aria-selected': String(n === cur), onclick: () => showForecast(n, fcSrc)}, n));
  box.querySelector('[aria-selected=true]')?.scrollIntoView({inline: 'center', block: 'nearest'});
}
function fillFcItems(keep) {
  const sel = clear($('fcItem')), items = HS[fcSrc].items;
  for (const n of Object.keys(items).sort((a, b) => a.localeCompare(b, 'ko'))) sel.append(h('option', {value: n, text: `${n} (${unitText(items[n].unit)}당)`}));
  sel.value = keep && items[keep] ? keep : (items['시금치'] ? '시금치' : sel.options[0]?.value);
}
function showForecast(name, src) {
  if (src && src !== fcSrc && HS[src]) { fcSrc = src; $('fcRegion').value = src; fillFcItems(name); }
  const H = HS[fcSrc];
  if (!H.items[name]) { fillFcItems(); name = $('fcItem').value; }
  $('fcItem').value = name;
  const unit = unitText(H.items[name].unit);
  $('fcSource').textContent = `${H.note} · ${H.months[0]}~${H.months.at(-1)} · 원/${unit}`;
  const key = `${H.id}:${name}`;
  const a = fcCache[key] || (fcCache[key] = analyze(H.items[name], H.months));
  const st = a.stats, relTxt = {good: '비교적 믿을 만해요', ok: '참고용이에요', low: '예측이 어려워요'}[a.reliability].replace('해요', '합니다').replace('예요', '입니다');
  const cards = clear($('fcCards'));
  cards.append(
    h('div', {class: 'sum'}, h('small', {text: `${a.last.month} ${H.label}`}), h('strong', {text: `${won(a.last.price)}/${unit}`})),
    h('div', {class: `sum${st.vsAll > 0.1 ? ' warn' : ''}`}, h('small', {text: '10년 평균 대비'}), h('strong', {text: `${st.vsAll > 0 ? '+' : ''}${Math.round(st.vsAll * 100)}%`})),
    h('div', {class: `sum${a.outlook === 'up' ? ' warn' : ''}`}, h('small', {text: `앞으로 3개월 전망 · ${relTxt}`}), h('strong', {text: {up: '오를 가능성', down: '내릴 가능성', flat: '비슷할 것'}[a.outlook]})));
  renderPair(name); renderAdvice(name); renderChips();
  drawChart(clear($('fcChart')), a);
  const ul = clear($('fcLines'));
  for (const l of describe(name, a, unit)) ul.append(h('li', {class: l.kind}, h('b', {text: KIND[l.kind]}), h('span', {text: l.text})));
  const t = clear($('fcBack'));
  t.append(h('thead', {}, h('tr', {}, ['예측 방법', `평균 오차(과거 ${a.backtest.origins}번 검증)`, '고른 방법'].map(x => h('th', {text: x})))),
    h('tbody', {}, METHODS.map(m => h('tr', {class: a.method === m.key ? 'best' : ''}, h('td', {text: m.name}), h('td', {text: `${Math.round(a.backtest.byMethod[m.key].mape * 100)}%`}), h('td', {text: a.method === m.key ? '← 오차가 가장 작은 방법' : ''})))));
  const ex = Object.entries(H.excluded || {}).map(([k, v]) => `${k}(${v.split(' / ')[0].replace(/\(.*\)/, '')})`).join(', ');
  clear($('fcNote')).append(h('b', {text: '읽는 법: '}), `${H.label} 자료로 계산했고 ${H.months.at(-1)}까지입니다. ${H.id === 'daegu' ? '대구(영남권) 도매 자료이며 전국 평균·포항 시세가 아닙니다.' : '소매 가격이며 도매·산지 가격이 아닙니다. 일부 품목은 포기·개 단위 가격입니다.'} 예측은 과거 패턴을 이어 본 통계 계산이라 틀릴 수 있고 날씨·작황은 반영하지 않습니다. 문장은 계산한 숫자를 규칙대로 풀어 쓴 자동 해설입니다.${ex ? ` 분석에서 제외한 품목: ${ex}.` : ''}`);
}
const CHANCE = {high: ['오를 가능성 높음', 'warn'], maybe: ['오를 가능성 있음', 'warn'], flat: ['비슷할 것으로 예상', ''], low: ['내릴 가능성 있음', '']};
function renderPair(name) {
  const box = clear($('pairBox'));
  const item = PAIR?.items[name];
  if (!item) { box.hidden = true; return; }
  box.hidden = false;
  const key = `pair:${name}`, a = fcCache[key] || (fcCache[key] = analyzePair(item, PAIR.months));
  const sign = x => `${x > 0 ? '+' : ''}${Math.round(x * 100)}%`;
  const col = (title, role, S) => h('div', {class: `pcol ${S.chance === 'high' || S.chance === 'maybe' ? 'rise' : ''}`},
    h('div', {class: 'phead'}, h('b', {text: title}), h('span', {class: 'src', text: role})),
    h('div', {class: 'pnow'}, h('small', {text: `${S.last.month} 현재`}), h('strong', {text: `${won(S.last.price)}/kg`}), h('span', {text: S.mom == null ? '' : `지난달 대비 ${sign(S.mom)}`})),
    h('div', {class: 'pnext'}, h('small', {text: `다음 달(${S.next.month}) 예상`}), h('strong', {text: `${won(S.next.mid)}/kg`}), h('span', {text: `예상 변동률 ${sign(S.change)} (${sign(S.band[0])}~${sign(S.band[1])})`}), h('em', {text: CHANCE[S.chance][0]})));
  box.append(h('div', {class: 'card-head'}, h('div', {}, h('span', {class: 'eyebrow'}, '도매와 소매를 나눠서 봅니다'), h('h3', {class: 'h3', style: 'margin:0', text: `${name}: 도매가격 · 소매가격 (전국, 원/kg)`}))),
    h('div', {class: 'pair'}, col('도매가격', '핵심 예측', a.W), col('소매가격', '보조 예측', a.R)),
    h('ul', {class: 'fc-lines'}, a.lines.map(l => h('li', {class: l.kind}, h('span', {text: l.text})))));
}
function drawChart(box, a) {
  const W = 760, H = 270, L = 58, R = 12, T = 12, B = 30;
  const f = a.forecast, vals = [...a.price, ...f.map(x => x.hi)], hi = Math.max(...vals) * 1.05, lo = 0;
  const n = a.price.length, total = n + f.length;
  const X = i => L + (i / (total - 1)) * (W - L - R), Y = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ns = 'http://www.w3.org/2000/svg', el = (tag, at, txt) => { const e = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(at)) e.setAttribute(k, v); if (txt != null) e.textContent = txt; return e; };
  const svg = el('svg', {viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `${a.months[0]}부터 ${a.last.month}까지 월별 도매 가격과 앞으로 3개월 예측`});
  for (let k = 0; k <= 4; k++) { const v = lo + ((hi - lo) * k) / 4, y = Y(v); svg.append(el('line', {x1: L, x2: W - R, y1: y, y2: y, stroke: '#e4eae6'}), el('text', {x: L - 6, y: y + 4, 'text-anchor': 'end', 'font-size': 11, fill: '#6a786f'}, Math.round(v).toLocaleString('ko-KR'))); }
  a.months.forEach((m, i) => { if (m.endsWith('-01')) svg.append(el('text', {x: X(i), y: H - 8, 'text-anchor': 'middle', 'font-size': 11, fill: '#6a786f'}, m.slice(0, 4))); });
  const band = [...f.map((x, i) => [X(n + i), Y(x.hi)]), ...f.map((x, i) => [X(n + f.length - 1 - i), Y(f[f.length - 1 - i].lo)])];
  const base = [X(n - 1), Y(a.price[n - 1])];
  svg.append(el('polygon', {points: [base, ...band.slice(0, f.length), ...band.slice(f.length), base].map(p => p.join(',')).join(' '), fill: '#b4530922'}));
  svg.append(el('polyline', {points: a.price.map((v, i) => `${X(i)},${Y(v)}`).join(' '), fill: 'none', stroke: 'var(--g)', 'stroke-width': 2, 'stroke-linejoin': 'round'}));
  svg.append(el('polyline', {points: [base, ...f.map((x, i) => [X(n + i), Y(x.mid)])].map(p => p.join(',')).join(' '), fill: 'none', stroke: '#b45309', 'stroke-width': 2.5, 'stroke-dasharray': '6 4'}));
  svg.append(el('circle', {cx: base[0], cy: base[1], r: 4.5, fill: 'var(--g)'}));
  box.append(svg, h('div', {class: 'lg'}, h('span', {}, h('i', {style: 'background:var(--g)'}), '월별 도매 가격(원/kg)'), h('span', {}, h('i', {style: 'background:#b45309'}), '예측(점선)'), h('span', {}, h('i', {style: 'background:#b4530944;height:10px'}), '예측 범위 80%')));
}

// ---------- 표시사항 확인(OCR 초안 + 사람 확인) ----------
const LF = [['product_name', '제품명'], ['food_type', '식품유형'], ['net_amount', '내용량'], ['origin', '원산지'], ['ingredients', '원재료명'], ['allergens_contained', '알레르기 유발물질(함유)'], ['allergens_precaution', '같은 시설·혼입 가능'], ['storage', '보관방법'], ['expiry', '소비기한'], ['nutrition', '영양정보']];
const STATUS_TXT = {EXTRACTED: '읽음 · 확인 필요', UNREADABLE: '읽지 못함 · 직접 확인', REDACTED: '가려짐 · 직접 확인', INSTRUCTION_ONLY: '날짜가 아닌 안내문만', UNKNOWN: '미확인', MANUAL_EDIT: '직접 고침'};
let labelState = null;

function initLabel() {
  $('labelImage').addEventListener('change', () => { const ok = $('labelImage').files.length > 0; $('ocrBtn').disabled = !ok; $('ocrWhy').textContent = ok ? '' : '사진을 고르면 눌러 볼 수 있습니다.'; });
  $('ocrBtn').addEventListener('click', ocr);
  $('parseBtn').addEventListener('click', () => showLabel(parseLabelText($('labelRaw').value), $('labelRaw').value, '붙여 넣은 글'));
  $('labelConfirm').addEventListener('change', syncSave);
  $('labelSave').addEventListener('click', saveLabel);
  $('camBtn').addEventListener('click', startCam);
  $('camStop').addEventListener('click', stopCam);
}
async function ocr() {
  const f = $('labelImage').files[0];
  if (!f) return;
  if (!['image/png', 'image/jpeg'].includes(f.type)) { $('labelStatus').textContent = 'PNG 또는 JPEG 사진만 읽을 수 있습니다.'; return; }
  $('ocrBtn').disabled = true; $('labelStatus').textContent = '글자를 읽는 중입니다…';
  try {
    const res = await fetch('/ocr', {method: 'POST', headers: {'Content-Type': f.type}, body: f});
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || '읽지 못했습니다.');
    $('labelRaw').value = body.text || '';
    showLabel(parseLabelText(body.text || ''), body.text || '', f.name);
  } catch (e) {
    $('labelStatus').textContent = '웹 시연판에서는 사진을 읽지 못합니다(Mac에서 로컬 서버로 열었을 때만 동작). 아래 칸에 라벨 글자를 붙여 넣어 확인해 보세요.';
  } finally { $('ocrBtn').disabled = !$('labelImage').files.length; }
}
function showLabel(parsed, original, source) {
  labelState = {parsed, original, source, edits: {}};
  const box = clear($('labelFields'));
  for (const [k, label] of LF) {
    const f = parsed.fields[k] || {value: '', status: 'UNKNOWN'};
    const ta = h('textarea', {id: `lf_${k}`, rows: 2, 'aria-label': label, oninput: () => { labelState.edits[k] = ta.value; syncSave(); }});
    ta.value = f.value || '';
    const isAlg = k.startsWith('allergens_');
    let sText = STATUS_TXT[f.status] || f.status, sCls = f.status === 'EXTRACTED' ? 'chip-teal' : 'chip-amber';
    if (isAlg) {
      // 알레르기는 '없음'으로 쓰지 않는다: 표시됨=주의, 못 읽음=확인 불가
      if (f.status === 'EXTRACTED' && f.value) { sText = '주의 · 표시되어 있습니다'; sCls = 'chip-red'; }
      else { sText = '확인 불가 · 사진으로 직접 확인'; sCls = 'chip-amber'; }
    }
    const status = h('span', {class: `chip ${sCls}`, text: sText});
    box.append(h('div', {class: 'lf'}, h('header', {}, h('label', {for: `lf_${k}`, text: label}), status), ta,
      f.evidence ? h('small', {class: 'src', text: `읽은 줄: ${String(f.evidence).slice(0, 90)}`}) : null));
  }
  $('labelStatus').textContent = `${source}에서 칸을 나누었습니다. 사진과 비교해 고쳐 주십시오.`;
  renderAlg(original);
  syncSave();
}
function syncSave() {
  const ok = !!labelState && $('labelConfirm').checked;
  $('labelSave').disabled = !ok;
  $('labelSaveWhy').textContent = ok ? '' : (labelState ? '확인란에 체크하면 눌러 볼 수 있습니다.' : '칸을 만든 뒤 확인란에 체크하면 눌러 볼 수 있습니다.');
}
function saveLabel() {
  const rows = LF.map(([k, label]) => ({'항목': label, '확인한 값': $(`lf_${k}`).value, '자동 읽기 상태': STATUS_TXT[labelState.parsed.fields[k]?.status] || '미확인', '직접 고침': labelState.edits[k] != null ? '예' : '아니오'}));
  rows.push({'항목': '확인한 사람', '확인한 값': $('labelReviewer').value || '(미입력)', '자동 읽기 상태': '', '직접 고침': ''});
  rows.push({'항목': '확인 시각', '확인한 값': new Date().toLocaleString('ko-KR'), '자동 읽기 상태': '', '직접 고침': ''});
  rows.push({'항목': '안내', '확인한 값': '이 기록은 알레르기 안전 판정이 아닙니다. 읽지 못한 항목은 없음이 아니라 미확인입니다.', '자동 읽기 상태': '', '직접 고침': ''});
  download('퐁당퐁당_표시사항_확인기록.csv', toCSV(['항목', '확인한 값', '자동 읽기 상태', '직접 고침'], rows));
}

// ---------- 정보 섹션 ----------
function renderFacts() {
  const facts = [
    ['5,176,280명', '2024학년도 학교급식 일평균 급식 학생', '교육부 「2024학년도 학교급식 실시현황」 원문 확인'],
    ['4조 3,013억 원', '학교급식 식품비(총 급식 경비 8조 2,633억 원 중)', '교육부 「2024학년도 학교급식 실시현황」 원문 확인'],
    ['26,064개소', '전국 어린이집(현원 887,764명, 경북 1,162개소 · 포항 228개소)', '보육통계 2025.12.31 기준'],
  ];
  $('facts').append(...facts.map(([b, t, s]) => h('div', {class: 'fact'}, h('b', {text: b}), h('span', {text: t}), h('small', {text: s}))));
}
const SPONSORS = [
  ['BIG WAVE AI', '문서·DB·API 연계 AI', '식단·가격·영양 자료를 연결해 근거와 함께 질문에 답하는 도우미를 검토'],
  ['OceanLight AI', '비전 품질 점검', '포장 사진이 흐리거나 반사될 때 "다시 찍어 주십시오"를 알려 주는 기능을 검토'],
  ['J SOLUTION', '입고·재고 관제', '발주 이후 입고·재고 기록과 이어 가는 방법을 검토(회사 정보 추가 확인 필요)'],
  ['UNIVA', 'HWP 문서 처리', '식단표 문서를 읽어 입력을 채우고 결과를 문서로 내보내는 방법을 검토'],
  ['금도시스템', '웹앱 서비스화', '시설별 계정·검수 이력·모바일 화면으로 서비스화하는 방법을 검토'],
];
function renderSponsors() {
  $('sponsors').append(...SPONSORS.map(([n, r, t]) => h('div', {class: 'sp'}, h('header', {}, h('b', {text: n}), h('span', {class: 'chip chip-gray', text: '협의 전'})), h('span', {class: 'chip chip-green', text: r}), h('p', {text: t}))));
}
function renderSources() {
  const box = $('sourceList');
  for (const s of data.sources) {
    box.append(h('div', {class: 'srow'}, h('b', {text: s.desc}), h('span', {text: `파일: ${s.file}${s.retrieved ? ` · 받은 시각 ${s.retrieved}` : ''}`}), h('span', {text: `이용 조건: ${s.terms || '미확인'}${s.url ? ` · ${s.url}` : ''}`})));
  }
  box.append(h('h3', {class: 'h3', text: '함께 읽은 연구'}),
    h('div', {class: 'srow'}, h('b', {text: 'Chan & Tagkopoulos (2026). Translating dietary standards into healthy meals with few-ingredient substitutions. PLOS Digital Health.'}), h('span', {text: '식품 1~3개만 바꿔 식단을 조정하는 방법의 선행 연구(미국 식사 자료·모형값). 우리 효과의 근거가 아니라 방법 참고입니다.'})),
    h('div', {class: 'srow'}, h('b', {text: '이정민 외 (2025). 가공식품 라벨 분석을 통한 알레르기 성분 자동 탐지 시스템. 한국정보기술학회 하계학술대회, 893–897쪽.'}), h('span', {text: '라벨 OCR과 알레르기 성분 DB 매칭이 구현 가능하다는 선행 사례(초록 확인). 이 기술은 우리의 새로움이 아니라 기능 모듈로 활용합니다.'})));
  const limits = [
    '가격은 aT 월별 도매시장 가격(거래단위 기준)입니다. 업장이 실제로 내는 납품가나 계약가가 아닙니다. 재료마다 기준월이 다를 수 있어 표에 표시했습니다.',
    '소매가격 원본의 2026-07 이후 월 값은 원본 기준일 이후라서 사용하지 않았습니다.',
    '바꿀 수 있는 재료는 2025 어린이급식관리지원센터 지침의 "동일 식품군 안에서 같은 조리법" 대체 목록을 따랐습니다. 환산 비율은 문서에 없어 중량 1:1로 가정했고, 영양 전공 팀원이 검토할 때까지 "팀 검토 대기"입니다. 구내식당·식당은 시설 담당자 확인 뒤 결정해 주십시오.',
    '"가격 대비 좋은 후보"는 오른 재료보다 같은 양 비용이 낮고 최근 3개월 가격이 오르는 중이 아닌 재료입니다. 맛이나 품질은 판단하지 않습니다.',
    '알레르기 번호는 재료 이름 기준 참고입니다. 가공식품은 포장 표시사항을 직접 확인해야 합니다.',
    '달걀·육류·우유 등 일부 재료는 가격 파일에 없어 목록에서 빠졌습니다. 제품 검색의 최저가는 참가격 조사 제품에만 있습니다.',
    '영양 정보는 이번 버전에서 뺐습니다(추후 확장). 라벨 OCR 정확도 독립 평가는 아직 없습니다.',
  ];
  $('limits').append(...limits.map(t => h('li', {text: t})));
}

// ---------- 알레르기 19종 패널 + 카메라 실시간 스캔 ----------
function renderAlg(text) {
  const a = analyzeLabel(text);
  const box = clear($('algPanel')); box.hidden = false;
  const cls = {CAUTION: 'caution', UNKNOWN: 'unknown', NOT_FOUND: 'notfound'}[a.verdict];
  const label = {CAUTION: '주의 · 알레르기 표시가 있습니다', UNKNOWN: '확인 불가', NOT_FOUND: '표시에서 찾지 못함 (안전하다는 뜻이 아닙니다)'}[a.verdict];
  const row = h('div', {class: 'alg-row'}, ALLERGENS19.map(g => {
    let c = 'alg', t = '';
    if (a.contains.includes(g.no)) { c = 'alg add'; t = ' · 함유'; }
    else if (a.precaution.includes(g.no)) { c = 'alg pre'; t = ' · 같은 시설'; }
    else if (a.found.includes(g.no)) { c = 'alg found'; t = ' · 원재료명에서 발견'; }
    return h('span', {class: c, text: `${g.no} ${g.name}${t}`});
  }));
  box.append(h('h3', {text: '알레르기 유발물질 19종 대조'}), h('span', {class: `verdict ${cls}`, text: label}), row,
    h('div', {class: 'legend'}, h('span', {class: 'alg add', text: '포장에 함유라고 적힘'}), h('span', {class: 'alg pre', text: '같은 시설 사용 문구'}), h('span', {class: 'alg found', text: '원재료명에서 짚은 참고'})),
    h('p', {class: 'hint', text: a.note}));
  return a;
}

const cam = {stream: null, timer: null, busy: false};
async function startCam() {
  if (!navigator.mediaDevices?.getUserMedia) { $('labelStatus').textContent = '이 브라우저는 카메라를 쓸 수 없습니다. 사진을 올려 주십시오.'; return; }
  try {
    cam.stream = await navigator.mediaDevices.getUserMedia({video: {facingMode: {ideal: 'environment'}, width: {ideal: 1920}, height: {ideal: 1080}}, audio: false});
  } catch {
    $('labelStatus').textContent = '카메라를 켜지 못했습니다. 브라우저의 카메라 허용을 눌러 주십시오. (사진을 올려서도 쓸 수 있습니다)'; return;
  }
  const v = $('camVideo'); v.srcObject = cam.stream; await v.play().catch(() => {});
  $('camBox').hidden = false; $('camBtn').disabled = true;
  $('labelStatus').textContent = '카메라로 읽는 중입니다. 라벨을 화면 가운데에 크게 맞춰 주십시오.';
  clearInterval(cam.timer); cam.timer = setInterval(grabFrame, 2600); grabFrame();
}
function stopCam() {
  clearInterval(cam.timer); cam.timer = null;
  cam.stream?.getTracks().forEach(t => t.stop()); cam.stream = null;
  $('camBox').hidden = true; $('camBtn').disabled = false;
  $('labelStatus').textContent = '카메라를 껐습니다. 읽은 글은 아래에서 고칠 수 있습니다.';
}
async function grabFrame() {
  const v = $('camVideo');
  if (cam.busy || !v.videoWidth || (labelState && Object.keys(labelState.edits).length)) return; // 직접 고치는 중이면 덮어쓰지 않음
  cam.busy = true;
  try {
    const sc = Math.min(1, 1600 / Math.max(v.videoWidth, v.videoHeight));
    const cv = document.createElement('canvas'); cv.width = Math.round(v.videoWidth * sc); cv.height = Math.round(v.videoHeight * sc);
    cv.getContext('2d').drawImage(v, 0, 0, cv.width, cv.height);
    const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.85));
    const res = await fetch('/ocr', {method: 'POST', headers: {'Content-Type': 'image/jpeg'}, body: blob});
    const body = await res.json();
    if (res.ok && body.text) { $('labelRaw').value = body.text; showLabel(parseLabelText(body.text), body.text, '카메라 화면'); }
  } catch { /* 다음 프레임에서 다시 시도 */ } finally { cam.busy = false; }
}

// ---------- 제품 검색(영양 · 최저가 · 알레르기 확인) ----------
const EXAMPLES = ['델몬트 알로에', '서울우유', '신라면', '오뚜기 참기름', '델몬트 오렌지'];
const picked = [];
function initSearch() {
  $('examples').append(...EXAMPLES.map(t => h('button', {type: 'button', onclick: () => { $('searchQ').value = t; doSearch(t); }}, t)));
  $('searchForm').addEventListener('submit', e => { e.preventDefault(); doSearch($('searchQ').value.trim()); });
}
async function doSearch(q) {
  if (!q) { $('searchStatus').textContent = '제품명이나 브랜드를 입력해 주십시오.'; return; }
  $('searchStatus').textContent = '찾는 중입니다…';
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || '검색하지 못했습니다.');
    $('searchStatus').textContent = '';
    window.__lastSearch = d;
    renderSearch(d);
  } catch (e) {
    $('searchStatus').textContent = '웹 시연판에는 제품 DB(약 33만 건)를 올리지 않아 검색이 되지 않습니다. 로컬 서버로 열었을 때만 동작합니다.';
  }
}
const f1 = v => (v == null ? '–' : (Math.round(v * 10) / 10).toLocaleString('ko-KR'));
function nutriBox(p) {
  const items = [['열량', p.kcal, 'kcal'], ['탄수화물', p.carb, 'g'], ['당류', p.sugar, 'g'], ['단백질', p.protein, 'g'], ['지방', p.fat, 'g'], ['나트륨', p.sodium, 'mg'], ['칼슘', p.calcium, 'mg'], ['철', p.iron, 'mg']];
  return h('div', {class: 'nutri'}, items.map(([l, v, u]) => h('div', {title: v == null ? '영양 DB에 값이 없습니다(미확인)' : ''}, l, h('b', {text: v == null ? '미확인' : `${f1(v)}${u}`}))));
}
function renderSearch(d) {
  const box = clear($('searchResult'));
  const left = h('div', {class: 'res-col'}, h('h3', {text: `영양 정보 · ${d.nutrition_total.toLocaleString('ko-KR')}개 중 ${d.nutrition.length}개`}));
  if (!d.nutrition.length) left.append(h('div', {class: 'empty', text: '식약처 영양 DB에서 찾지 못했습니다. 다른 이름이나 브랜드로 검색해 보십시오.'}));
  for (const p of d.nutrition) {
    const on = picked.some(x => x.code === p.code);
    left.append(h('article', {class: 'prod'},
      h('header', {}, h('div', {}, h('b', {text: p.name}), h('div', {class: 'mk', text: `${p.maker || '제조사 미기재'} · ${p.basis} 기준${p.weight ? ` · 식품중량 ${p.weight}` : ''}`})),
        h('button', {type: 'button', class: 'btn btn-secondary btn-sm', onclick: () => togglePick(p)}, on ? '비교에서 빼기' : '비교에 담기')),
      h('details', {class: 'nutri-details'}, h('summary', {text: '영양 정보 보기 (참고 · 추후 확장 기능)'}), nutriBox(p)), h('div', {class: 'src', text: `품목제조보고번호 ${p.report_no || '미기재'} · 자료 기준일 ${p.data_date || '미기재'}`})));
  }
  const right = h('div', {class: 'res-col'}, h('h3', {text: '최저가 · 한국소비자원 참가격'}));
  if (!d.prices.length) right.append(h('div', {class: 'empty'}, h('b', {text: '이 제품의 가격은 연결된 공개 자료에 없습니다. '}), '참가격 조사 대상(약 590개 생필품)에 들어 있는 제품만 가격을 보여 드립니다. 없다고 0원으로 보지 않습니다.'));
  for (const p of d.prices) {
    right.append(h('article', {class: 'prod'},
      h('header', {}, h('div', {}, h('b', {text: p.prod}), h('div', {class: 'mk', text: `${p.maker || '제조사 미기재'} · ${p.n}개 점포 가격`}))),
      h('div', {class: 'price-big', text: won(p.min_price)}),
      h('div', {class: 'hint', text: `최저가 · ${p.min_store} · ${p.min_date}${p.min_flag ? ` · ${p.min_flag} 가격 포함` : ''}`}),
      p.per100 ? h('div', {class: 'hint', text: `${p.per100_unit === 'ml' ? '100ml' : '100g'}당 ${won(p.per100)}`}) : null,
      h('div', {class: 'hint', text: `중앙값 ${won(p.median)} · 최고가 ${won(p.max_price)}`}),
      h('div', {class: 'hint', text: p.min_gb ? `대구·경북 점포 최저 ${won(p.min_gb)} · ${p.min_gb_store}` : '대구·경북 점포 가격은 조사 자료에 없습니다.'}),
      h('div', {class: 'src', text: `조사 ${p.asof}`})));
  }
  box.append(h('div', {class: 'res-grid'}, left, right),
    h('div', {class: 'note-amber'}, h('b', {text: '알레르기 주의 원료: '}), '이 영양 DB에는 원재료·알레르기 정보가 없어서 제품 이름만으로는 알 수 없습니다. 포장 라벨을 카메라로 비추거나 사진을 올리면 19종과 바로 대조해 드립니다. ',
      h('a', {href: '#label', text: '라벨 스캔으로 이동'})),
    h('p', {class: 'hint', text: '영양은 식약처 DB, 가격은 한국소비자원 참가격이라 서로 다른 자료입니다. 같은 제품인지는 이름과 용량을 직접 확인해 주십시오. 영양 기준량은 제품마다 100g 또는 100ml입니다.'}));
}
function togglePick(p) {
  const i = picked.findIndex(x => x.code === p.code);
  if (i >= 0) picked.splice(i, 1); else { if (picked.length >= 2) picked.shift(); picked.push(p); }
  renderCompare();
  const last = window.__lastSearch; // 버튼 라벨 갱신을 위해 다시 그림
  if (last) renderSearch(last);
}
function renderCompare() {
  const box = clear($('comparePanel'));
  if (picked.length < 2) { box.hidden = picked.length === 0; if (picked.length === 1) { box.hidden = false; box.append(h('p', {class: 'hint', text: `"${picked[0].name}"을(를) 담았습니다. 하나 더 담으면 영양을 나란히 비교합니다.`})); } return; }
  box.hidden = false;
  const [A, B] = picked;
  box.append(h('h3', {text: '영양 나란히 비교 (참고 · 추후 확장 기능)'}));
  if (A.basis !== B.basis) { box.append(h('p', {class: 'hint', text: `기준량이 다릅니다(${A.basis} / ${B.basis}). 단위를 바꿔 계산하지 않고 그대로 두었습니다.`})); }
  const rows = [['열량', 'kcal', 'kcal'], ['탄수화물', 'carb', 'g'], ['당류', 'sugar', 'g'], ['단백질', 'protein', 'g'], ['지방', 'fat', 'g'], ['나트륨', 'sodium', 'mg'], ['칼슘', 'calcium', 'mg'], ['철', 'iron', 'mg']];
  box.append(h('div', {class: 'table-wrap'}, h('table', {style: 'min-width:600px'},
    h('thead', {}, h('tr', {}, h('th', {text: '항목'}), h('th', {text: A.name}), h('th', {text: B.name}), h('th', {text: '차이'}))),
    h('tbody', {}, rows.map(([l, k, u]) => {
      const a = A[k], b = B[k], diff = a != null && b != null && A.basis === B.basis ? Math.round((b - a) * 10) / 10 : null;
      return h('tr', {}, h('td', {text: l}), h('td', {text: a == null ? '미확인' : `${f1(a)}${u}`}), h('td', {text: b == null ? '미확인' : `${f1(b)}${u}`}), h('td', {text: diff == null ? '비교 불가' : `${diff > 0 ? '+' : ''}${f1(diff)}${u}`}));
    })))));
  box.append(h('p', {class: 'hint', text: '알레르기 차이는 두 제품의 라벨을 각각 스캔해 확인해 주십시오. 영양 DB에는 알레르기 정보가 없습니다.'}));
}

init();

// 첫 화면이 준비되면 시작 화면을 걷어 낸다(최소 0.9초는 보여 준다).
{ const t0 = performance.now(), sp = document.getElementById('splash'); const done = () => { if (!sp) return; sp.classList.add('hide'); setTimeout(() => sp.remove(), 600); }; const go = () => setTimeout(done, Math.max(0, 900 - (performance.now() - t0))); (document.readyState === 'complete' ? go() : addEventListener('load', go)); setTimeout(done, 4000); }

// ---------- 홈: 이번 달 많이 오른 재료 · 다음 달 전망 ----------
const homeName = n => n;
function renderHome() {
  const H = HS.nat; if (!H) return;
  const rows = Object.entries(H.items).map(([name, it]) => {
    const key = `${H.id}:${name}`, a = fcCache[key] || (fcCache[key] = analyze(it, H.months));
    return {name, unit: unitText(it.unit), a, mom: a.stats.mom, next: a.forecast[0].mid / a.last.price - 1, rel: a.reliability, price: a.last.price};
  });
  const sign = x => `${x > 0 ? '+' : ''}${Math.round(x * 100)}%`;
  const go = r => () => { location.hash = '#/forecast'; showForecast(r.name, 'nat'); };
  const rising = rows.filter(r => r.mom != null).sort((x, y) => y.mom - x.mom).slice(0, 6);
  const asof = H.months.at(-1);
  $('homeAsof').textContent = `${asof} 기준 · 지난달 대비`;
  const box = clear($('homeRisers'));
  for (const r of rising) box.append(h('button', {class: 'rcard', type: 'button', onclick: go(r)}, h('b', {text: r.name}), h('small', {text: `${won(r.price)}/${r.unit}`}), h('span', {class: `pct${r.mom < 0 ? ' dn' : ''}`, text: sign(r.mom)}), h('span', {text: r.mom >= 0.1 ? '많이 올랐어요' : r.mom >= 0.02 ? '조금 올랐어요' : r.mom <= -0.02 ? '내렸어요' : '비슷해요'})));
  const fill = (id, list, cls, emptyText) => { const ul = clear($(id)); if (!list.length) ul.append(h('li', {class: 'empty', text: emptyText})); for (const r of list) ul.append(h('li', {onclick: go(r)}, h('b', {text: r.name}), h('em', {class: cls, text: `${sign(r.next)}`}))); };
  const ok = rows.filter(r => r.rel !== 'low');
  fill('homeUp', ok.filter(r => r.next >= 0.05).sort((x, y) => y.next - x.next).slice(0, 4), 'u', '오를 것 같은 재료가 없어요.');
  fill('homeDown', ok.filter(r => r.next <= -0.05).sort((x, y) => x.next - y.next).slice(0, 4), 'd', '내릴 것 같은 재료가 없어요.');
  const ups = rows.filter(r => r.mom >= 0.1).length, ups2 = ok.filter(r => r.next >= 0.05).length;
  const mood = ups + ups2 >= 4 ? 'worry' : ups + ups2 === 0 ? 'happy' : 'wow';
  const hr = new Date().getHours();
  $('heroHello').textContent = hr < 11 ? '좋은 아침이에요!' : hr < 17 ? '안녕하세요!' : '오늘도 수고했어요!';
  $('heroTitle').textContent = '식재료 가격, 오르내려도 대응해요';
  $('heroSub').textContent = mood === 'worry' ? `이번 달은 오른 재료가 꽤 있어요 (${ups}개 +10%↑)` : mood === 'happy' ? '이번 달 물가는 비교적 잠잠해요' : `눈여겨볼 재료가 있어요 (${ups}개 +10%↑)`;
  const m = clear($('heroMascot')); m.insertAdjacentHTML('beforeend', mascotSVG(mood, '100%'));
  [rising[0], rising[1]].forEach((r, i) => { const c = $(`chip${i + 1}`); if (!r) return; c.hidden = false; c.className = `h2-chip c${i + 1}${r.mom < 0 ? ' dn' : ''}`; c.textContent = r.name; c.append(h('b', {text: sign(r.mom)})); });
  const watch = loadWatch().filter(n => H.items[n]);
  $('homeWatch').hidden = !watch.length;
  const wl = clear($('homeWatchList'));
  for (const n of watch) { const r = rows.find(x => x.name === n); if (!r) continue; const v = verdictOf(r.a); wl.append(h('li', {onclick: () => { location.hash = '#/forecast'; showForecast(n, 'nat'); }}, h('b', {text: n}), h('span', {class: 'src', text: v.head}))); }
  const recent = loadHist().slice(0, 3);
  $('homeRecent').hidden = !recent.length;
  const rl = clear($('homeRecentList'));
  for (const r of recent) rl.append(h('li', {onclick: () => { location.hash = '#/main'; }}, h('b', {text: r.target}), h('span', {class: 'src', text: `${r.at} · ${r.total?.toLocaleString?.('ko-KR') ?? r.total}원`})));
}

// ---------- 시연 모드: 홈 → 가격 비교 → 시세 → 홈을 자막과 함께 자동으로 보여 준다 ----------
let demoTimers = [], demoRtBackup; // undefined = 시연 중이 아님
// 시연용 정기 구매(대파·시금치·양파)를 잠깐 넣었다가 시연이 끝나면 원래 기록으로 되돌린다
function seedDemoRoutine() {
  try { demoRtBackup = localStorage.getItem(RT_KEY); } catch { demoRtBackup = null; }
  const ago = n => { const d = new Date(); d.setDate(d.getDate() - n); return isoDay(d); };
  saveRt([{id: 'demo1', name: '대파', kg: 12, cycle: 7, last: ago(6), log: [{d: ago(13), kg: 11}, {d: ago(6), kg: 12}]}, {id: 'demo2', name: '시금치', kg: 8, cycle: 7, last: ago(5), log: []}, {id: 'demo3', name: '양파', kg: 30, cycle: 14, last: ago(3), log: []}]);
  renderRoutine(); renderHomeHero();
}
function restoreRoutine() {
  if (demoRtBackup === undefined) return;
  try { if (demoRtBackup == null) localStorage.removeItem(RT_KEY); else localStorage.setItem(RT_KEY, demoRtBackup); } catch {}
  demoRtBackup = undefined; renderRoutine(); renderHome(); renderHomeHero();
}
function stopDemo() { demoTimers.forEach(clearTimeout); demoTimers = []; $('demoCap').hidden = true; restoreRoutine(); }
function runDemo() {
  stopDemo();
  const cap = t => { $('demoText').textContent = t; $('demoCap').hidden = false; };
  const to = (el, block = 'start') => (typeof el === 'string' ? document.getElementById(el) : el)?.scrollIntoView({behavior: 'smooth', block});
  seedDemoRoutine();
  // 약 18초: 장면마다 3~4초씩 머물러 자막을 읽을 수 있게 한다
  const steps = [
    [0, () => { location.hash = '#/home'; window.scrollTo({top: 0, behavior: 'smooth'}); cap('퐁당퐁당 · 오르기 전엔 미리, 오른 뒤엔 바로'); }],
    [2500, () => { cap('① 자주 사는 재료가 오르기 전에 알려줘요'); to(document.querySelector('.ritem.buy') || 'homeRoutine', 'center'); }],
    [6500, () => { location.hash = '#/forecast'; showForecast('대파', 'nat'); window.scrollTo({top: 0}); cap('10년 시세와 이번 주 흐름으로 예측해요'); }],
    [10000, () => { location.hash = '#/main'; applyPreset('spinach'); window.scrollTo({top: 0}); cap('② 가게 가격이 올랐다면, 대응법을 바로'); }],
    [11000, () => { to('actionBox'); }],
    [14000, () => { cap('고른 대응 그대로, 발주표 파일까지 한 번에'); to($('s3').hidden ? 's2' : 's3'); }],
    [15300, () => { const b = $('csvBtn'); b.classList.add('press'); setTimeout(() => { b.classList.remove('press'); if (!b.disabled) b.click(); }, 350); }],
    [18000, () => { stopDemo(); location.hash = '#/home'; window.scrollTo({top: 0}); }],
  ];
  for (const [t, fn] of steps) demoTimers.push(setTimeout(fn, t));
}
$('demoBtn')?.addEventListener('click', runDemo);
$('demoStop')?.addEventListener('click', stopDemo);
if (new URLSearchParams(location.search).get('demo') === '1') addEventListener('load', () => setTimeout(runDemo, 2500));

// ---------- 재료 살펴보기: 이번 달·이번 주 조언 + 이건 어떠세요? ----------
const pctAbs = x => `${Math.round(Math.abs(x) * 100)}%`;
function verdictOf(a) {
  const st = a.stats, next = a.forecast[0].mid / a.last.price - 1, strong = a.reliability !== 'low';
  if (next >= 0.05 && (strong || next >= 0.15)) return {kind: 'buy', mood: 'wow', head: '미리 사 두면 좋아요', next};
  if (next <= -0.05 && (strong || next <= -0.15)) return {kind: 'wait', mood: 'happy', head: '조금 기다려 봐도 좋아요', next};
  if (st.vsAll >= 0.2) return {kind: 'pricey', mood: 'worry', head: '평소보다 비싸요, 필요한 만큼만요', next};
  if (st.vsAll <= -0.1) return {kind: 'cheap', mood: 'happy', head: '평소보다 싸요, 지금 사도 좋아요', next};
  return {kind: 'ok', mood: 'happy', head: '지금 사도 괜찮아요', next};
}
function renderAdvice(name) {
  const box = clear($('advice')), H = HS[fcSrc], a = fcCache[`${H.id}:${name}`];
  if (!a) return;
  const v = verdictOf(a), unit = unitText(H.items[name].unit), st = a.stats, f = a.forecast[0];
  const wk = WK?.items[name]?.price?.filter(x => x != null);
  const wow = wk && wk.length >= 2 ? wk.at(-1) / wk.at(-2) - 1 : null, w4 = wk && wk.length >= 5 ? wk.at(-1) / wk.at(-5) - 1 : null;
  const watch = loadWatch();
  const BM = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4h12v17l-6-4-6 4z"/></svg>';
  const setStar = (b, on) => { b.setAttribute('aria-pressed', String(on)); b.innerHTML = BM + `<span>${on ? '관심 재료' : '관심 재료로 담기'}</span>`; };
  const star = h('button', {class: 'vstar', type: 'button', onclick: e => { const w = loadWatch(), i = w.indexOf(name); if (i >= 0) w.splice(i, 1); else w.push(name); saveWatch(w); setStar(e.currentTarget, i < 0); renderHome(); }});
  setStar(star, watch.includes(name));
  const vm = h('div', {class: 'vm'}); vm.insertAdjacentHTML('beforeend', mascotSVG(v.mood, '100%'));
  box.append(h('div', {class: `verdict ${v.kind}`}, vm, h('div', {}, h('small', {text: `${name} · 지금 ${won(a.last.price)}/${unit}`}), h('h3', {text: `${name}${eunneun(name)} ${v.head}`}), h('p', {text: `다음 달(${Number(f.month.slice(5))}월)엔 ${Math.abs(v.next) < 0.03 ? '지금과 비슷할 것 같아요' : `${pctAbs(v.next)} 정도 ${v.next > 0 ? '오를' : '내릴'} 것 같아요`}.`})), star));
  const tips = [];
  tips.push(['달', '이번 달', `평소(10년 평균)보다 ${Math.abs(st.vsAll) < 0.03 ? '비슷해요' : `${pctAbs(st.vsAll)} ${st.vsAll > 0 ? '비싸요' : '싸요'}`}. 지난달보다는 ${st.mom == null || Math.abs(st.mom) < 0.02 ? '비슷해요' : `${pctAbs(st.mom)} ${st.mom > 0 ? '올랐어요' : '내렸어요'}`}.`]);
  if (wow != null) tips.push(['주', '이번 주', `지난주보다 ${Math.abs(wow) < 0.01 ? '비슷해요' : `${pctAbs(wow)} ${wow > 0 ? '올랐어요' : '내렸어요'}`}${w4 != null && Math.abs(w4) >= 0.03 ? ` · 최근 4주로 보면 ${pctAbs(w4)} ${w4 > 0 ? '오르는' : '내리는'} 중이에요` : ''}.`]);
  const ph = pohangGap(name);
  if (ph) tips.push(['포', `포항 가격 (${ph.month.slice(5).replace(/^0/, '')}월)`, `포항은 ${won(ph.pohang)}/${unit}로 전국 평균보다 ${Math.abs(ph.gap) < 0.02 ? '비슷해요' : `${pctAbs(ph.gap)} ${ph.gap > 0 ? '비싸요' : '싸요'}`}.${ph.avg12 != null ? ` 최근 1년 평균으로는 ${Math.abs(ph.avg12) < 0.02 ? '전국과 비슷했어요' : `${pctAbs(ph.avg12)} ${ph.avg12 > 0 ? '비쌌어요' : '쌌어요'}`}.` : ''}`]);
  tips.push(['때', '사기 좋은 때', `보통 ${st.troughMonth}월에 가장 싸고 ${st.peakMonth}월에 가장 비싸요.`]);
  const tl = h('div', {class: 'vtips'}, tips.map(([i, t, p]) => h('div', {class: 'vtip'}, h('div', {}, h('b', {text: t}), h('p', {text: p})))));
  if (wk && wk.length >= 4) {
    const mx = Math.max(...wk), mn = Math.min(...wk);
    tl.append(h('div', {class: 'vtip'}, h('div', {style: 'flex:1'}, h('b', {text: `최근 ${wk.length}주 가격 흐름`}), h('div', {class: 'wk'}, wk.map(x => h('i', {style: `height:${18 + (mx === mn ? 40 : (x - mn) / (mx - mn) * 82)}%`, title: won(x)}))), h('div', {class: 'wk-cap'}, h('span', {text: `${WK.weeks[WK.weeks.length - wk.length].slice(5)} 주`}), h('span', {text: '이번 주'})))));
  }
  box.append(tl);
  box.append(h('button', {class: 'ask-link', type: 'button', 'data-ask': `${name} 지금 사도 돼요?`, text: `${name}, 퐁당이에게 더 물어보기 ›`}));
  renderAlternatives(name, v);
}
function renderAlternatives(name, v) {
  const box = clear($('altBox')); box.hidden = true;
  if (!data) return;
  const key = data.catalog[name] ? name : Object.values(data.catalog).find(c => c.price?.item === name)?.key;
  if (!key) return;
  const t = swapTable(data, key, 1, 0, {});
  if (!t.group) return;
  const base = t.original.perKg;
  const picks = t.list.filter(x => x.good).map(x => ({...x, ol: outlookOf(hist, x.key, fcCache)})).filter(x => x.ol?.outlook !== 'up').slice(0, 3);
  if (!picks.length) return;
  box.hidden = false;
  box.append(h('h3', {text: v.kind === 'buy' || v.kind === 'pricey' ? `${name} 대신 이건 어떠세요?` : `같이 보면 좋은 재료예요`}),
    h('div', {class: 'alts'}, picks.map(x => {
      const diff = 1 - x.marketPerKg / base, inHist = HS.nat?.items[x.key];
      const added = x.allergens.filter(n => !(t.original.allergens || []).includes(n));
      return h('button', {class: 'alt', type: 'button', onclick: () => { if (inHist) { window.scrollTo({top: 0, behavior: 'smooth'}); showForecast(x.key, 'nat'); } else { location.hash = '#/main'; } }},
        h('b', {text: `${x.label.replace(/\(.*\)/, '')}${euroro(x.label.replace(/\(.*\)/, ''))} 바꿔 볼까요?`}),
        h('span', {text: `평소 시장가가 ${pctAbs(diff)} 더 싸요 · ${x.trend.label}${added.length ? ` · 알레르기 ${added.length}종 추가 확인` : ''}${x.ol?.outlook === 'down' ? ' · 다음 달도 내릴 것 같아요' : ''}`}),
        h('em', {text: `−${pctAbs(diff)}`}));
    })));
}

// ---------- 대응 카드: 가격이 올랐을 때 바로 할 일 3가지 ----------
function renderAction(target, tq, st, rec, ol, kg) {
  const box = clear($('actionBox'));
  const pct = st ? st.pct : S.pct, market = st ? st.market : null;
  const level = pct >= 30 ? 'spike' : pct >= 10 ? 'high' : pct <= -5 ? 'low' : 'normal';
  const mood = level === 'spike' ? 'worry' : level === 'high' ? 'wow' : 'happy';
  const name = target.label.replace(/\(.*?\)/, '');
  const head = {spike: `${name}${eunneun(name)} 평소보다 ${pct}% 비싸요`, high: `${name}${eunneun(name)} 조금 비싸요 (+${pct}%)`, normal: `${name} 가격은 평소와 비슷해요`, low: `${name}${eunneun(name)} 평소보다 싸요 (${pct}%)`}[level];
  const sub = {spike: '이렇게 대응해 보세요.', high: '이렇게 하면 부담을 줄일 수 있어요.', normal: '그대로 사도 괜찮아요.', low: '필요하면 넉넉히 사 둬도 좋아요.'}[level];
  const perKgNow = tq > 0 ? tq : (market ?? 0) * (1 + pct / 100);
  const cards = [];
  if (level === 'spike' || level === 'high') {
    if (rec.kind === 'pick') {
      const saved = rec.table.original.afterCost - rec.pick.cost, p = rec.pick.label.replace(/\(.*?\)/, '');
      cards.push(['바꾸기', `${p}${euroro(p)} 바꿔요`, `같은 양(${kg}kg) 기준으로 ${p}${eulreul(p)} 사면 비용을 줄일 수 있어요. ${rec.pick.trend.label}.`, saved > 0 ? `−${won(saved)}` : null]);
    } else cards.push(['바꾸기', '마땅한 대체 재료가 없어요', rec.reason === 'no-group' ? '같은 식품군 대체 목록에 없는 재료예요.' : '지금 가격보다 싸면서 가격이 안정적인 후보가 없어요.', null]);
    const cut = Math.round(perKgNow * kg * 0.2);
    if (kg >= 2 && cut > 0) cards.push(['줄이기', `이번엔 20% 줄여 사요`, `${kg}kg → ${Math.round(kg * 0.8 * 10) / 10}kg로 줄이고, 부족한 분량은 가격이 내려가면 채워요.`, `−${won(cut)}`]);
    const w = ol?.outlook;
    cards.push(['미루기', w === 'up' ? '오를 것 같아요, 미루지 마세요' : w === 'down' ? '급하지 않으면 미뤄요' : '며칠 뒤 다시 확인해요', w === 'up' ? '다음 달에도 오를 가능성이 있어요. 꼭 필요한 양은 지금 사는 게 나아요.' : w === 'down' ? '다음 달엔 내릴 것 같아요. 필요한 만큼만 사고 나머지는 기다려 보세요.' : '큰 변화가 없을 것 같아요. 급하지 않다면 며칠 뒤 가격을 다시 확인해 보세요.', null]);
  } else {
    cards.push([level === 'low' ? '사두기' : '그대로', level === 'low' ? '싼 김에 여유 있게 사요' : '그대로 구매해요', level === 'low' ? '보관이 되는 재료라면 조금 더 사 두는 것도 방법이에요.' : '평소 시세 범위 안이라 따로 대응하지 않아도 돼요.', null]);
  }
  const vm = h('div', {class: 'vm'}); vm.insertAdjacentHTML('beforeend', mascotSVG(mood, '100%'));
  box.append(h('div', {class: `act-head ${level}`}, vm, h('div', {}, h('h3', {text: head}), h('p', {text: sub}))),
    h('ol', {class: 'acts'}, cards.map(([tag, title, desc, eff], i) => h('li', {class: 'act'}, h('b', {class: 'n', text: String(i + 1)}), h('div', {}, h('small', {text: tag}), h('strong', {text: title}), h('p', {text: desc})), eff ? h('em', {text: eff}) : ''))));
}

// ---------- 퐁당이를 누르면 반응해요 ----------
{
  const LINES = ['퐁당!', '간질간질해요~', '오늘도 장 보러 가요?', '가격부터 확인해요!', '헤헤, 반가워요', '살살 눌러 주세요~'];
  let taps = 0, last = 0, timer = null;
  document.addEventListener('click', e => {
    const m = e.target.closest('.mascot'); if (!m) return;
    const box = m.parentElement, now = Date.now();
    taps = now - last < 900 ? taps + 1 : 1; last = now;
    const baseMood = box.dataset.mood || (box.dataset.mood = (m.getAttribute('class').match(/mascot-(\w+)/) || [])[1] || 'happy');
    const ouch = taps >= 5, mood = ouch ? 'ouch' : 'wow';
    clearTimeout(timer);
    box.querySelectorAll('.m-bubble').forEach(b => b.remove());
    box.innerHTML = mascotSVG(mood, '100%');
    const svg = box.querySelector('svg'); svg.classList.add('poked');
    box.append(h('div', {class: 'm-bubble', text: ouch ? '으앗! 그만~ 어지러워요' : LINES[Math.floor(Math.random() * LINES.length)]}));
    timer = setTimeout(() => { box.innerHTML = mascotSVG(baseMood, '100%'); taps = 0; }, ouch ? 1600 : 1100);
  });
}

// ---------- 정기 구매 알림: 자주 사는 재료의 다음 구매 전에 가격이 오를 것 같은지 알려 준다 ----------
const RT_KEY = 'pongdang.routine.v1';
const loadRt = () => { try { const v = JSON.parse(localStorage.getItem(RT_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const saveRt = v => { try { localStorage.setItem(RT_KEY, JSON.stringify(v)); } catch {} };
const isoDay = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const CYCLE_TXT = {1: '매일', 2: '이틀마다', 7: '매주', 14: '2주마다', 30: '매달'};
function routineAdvice(r) {
  const H = HS.nat, it = H?.items[r.name];
  if (!it) return null;
  const a = fcCache[`${H.id}:${r.name}`] || (fcCache[`${H.id}:${r.name}`] = analyze(it, H.months));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(`${r.last}T00:00:00`); due.setDate(due.getDate() + r.cycle);
  const left = Math.round((due - today) / 86400000);
  const fm = a.forecast[0].mid / a.last.price - 1, okRel = a.reliability !== 'low';
  const wk = WK?.items[r.name]?.price?.filter(x => x != null);
  const wow = wk && wk.length >= 2 ? wk.at(-1) / wk.at(-2) - 1 : 0, w4 = wk && wk.length >= 5 ? wk.at(-1) / wk.at(-5) - 1 : 0;
  const rising = (fm >= 0.05 && okRel) || w4 >= 0.05 || (wow >= 0.03 && w4 > 0);
  const falling = (fm <= -0.05 && okRel) || w4 <= -0.05;
  const change = Math.max(fm, w4, 0), e = data?.catalog[r.name]?.price, perKg = e ? e.price_krw / e.pack_g * 1000 : null;
  const extra = rising && perKg ? Math.round(perKg * r.kg * change / 100) * 100 : null;
  const when = left < 0 ? `${-left}일 지났어요` : left === 0 ? '오늘' : left === 1 ? '내일' : left <= 7 ? `${left}일 뒤` : `${left}일 뒤`;
  const dueTxt = `${due.getMonth() + 1}/${due.getDate()}`;
  let kind, head, desc;
  if (rising && left <= 7) { kind = 'buy'; head = '지금 미리 사 두세요'; desc = `다음 구매일(${dueTxt}, ${when})이 가까운데 가격이 오를 것 같아요${extra ? `. 그대로 두면 약 ${won(extra)} 더 들 수 있어요` : ''}.`; }
  else if (rising) { kind = 'watch'; head = '오름세예요, 지켜보세요'; desc = `구매일(${dueTxt})까지 여유는 있지만 가격이 오르는 흐름이에요. 필요하면 일부만 미리 사 두는 것도 방법이에요.`; }
  else if (falling) { kind = 'wait'; head = '기다려도 좋아요'; desc = `내릴 것 같아요. 구매일(${dueTxt}, ${when})까지 기다리면 더 싸게 살 수 있어요.`; }
  else { kind = 'ok'; head = left <= 0 ? '오늘 사도 괜찮아요' : '예정대로 사도 괜찮아요'; desc = `큰 변동은 없을 것 같아요. 다음 구매일은 ${dueTxt}(${when})예요.`; }
  return {kind, head, desc, left, extra};
}
function renderRoutine() {
  const list = loadRt(), ul = clear($('routineList'));
  const res = list.map(r => ({r, adv: routineAdvice(r)}));
  const buy = res.filter(x => x.adv?.kind === 'buy').length;
  $('routineSum').textContent = list.length ? (buy ? `지금 사면 좋은 재료 ${buy}개` : `${list.length}개 지켜보는 중`) : '';
  if (!list.length) ul.append(h('li', {class: 'rempty', text: '아직 등록한 재료가 없어요. 아래에서 추가해 보세요.'}));
  res.sort((x, y) => (x.adv?.kind === 'buy' ? -1 : 0) - (y.adv?.kind === 'buy' ? -1 : 0));
  for (const {r, adv} of res) {
    const avg = r.log?.length ? Math.round(r.log.reduce((s, x) => s + x.kg, 0) / r.log.length * 10) / 10 : null;
    const kgIn = h('input', {type: 'number', min: '0.1', step: '0.1', value: String(r.kg), inputmode: 'decimal', 'aria-label': `${r.name} 오늘 산 양(kg)`});
    ul.append(h('li', {class: `ritem ${adv?.kind || 'ok'}`},
      h('div', {class: 'rtop'}, h('b', {text: r.name}), h('span', {class: 'src', text: `${CYCLE_TXT[r.cycle] || r.cycle + '일마다'} ${r.kg}kg${avg ? ` · 평균 ${avg}kg` : ''}`}), h('button', {class: 'rdel', type: 'button', 'aria-label': `${r.name} 삭제`, onclick: () => { saveRt(loadRt().filter(x => x.id !== r.id)); renderRoutine(); renderHomeHero(); }, text: '삭제'})),
      adv ? h('div', {class: 'rmsg'}, h('strong', {text: adv.head}), h('p', {text: adv.desc})) : h('p', {class: 'src', text: '이 재료는 가격 자료가 없어서 알림을 줄 수 없어요.'}),
      h('div', {class: 'rbuy'}, h('label', {}, '오늘 산 양', kgIn, 'kg'), h('button', {class: 'btn btn-outline btn-sm', type: 'button', onclick: () => {
        const v = Number(kgIn.value); if (!(v > 0)) return;
        const all = loadRt(), t = all.find(x => x.id === r.id); if (!t) return;
        t.last = isoDay(new Date()); t.kg = v; t.log = [...(t.log || []), {d: t.last, kg: v}].slice(-20);
        saveRt(all); renderRoutine(); renderHomeHero();
      }, text: '오늘 샀어요'}))));
  }
}
function renderHomeHero() {
  const list = loadRt(); if (!list.length || !HS.nat) return;
  const buy = list.filter(r => routineAdvice(r)?.kind === 'buy');
  if (buy.length) { $('heroSub').textContent = `정기 구매 중 ${buy.map(r => r.name).slice(0, 2).join('·')}${buy.length > 2 ? ` 외 ${buy.length - 2}개` : ''}, 지금 사 두면 좋아요.`; }
}
function initRoutine() {
  if (!HS.nat) return;
  const sel = clear($('rtItem'));
  for (const n of Object.keys(HS.nat.items).sort((a, b) => a.localeCompare(b, 'ko'))) sel.append(h('option', {value: n, text: n}));
  $('rtLast').value = isoDay(new Date());
  $('rtAddBtn').addEventListener('click', () => {
    const kg = Number($('rtKg').value), name = $('rtItem').value, last = $('rtLast').value;
    if (!(kg > 0) || !name || !last) return;
    saveRt([...loadRt(), {id: Date.now().toString(36), name, kg, cycle: Number($('rtCycle').value), last, log: [{d: last, kg}]}]);
    $('routineAdd').open = false; renderRoutine(); renderHomeHero();
  });
  renderRoutine(); renderHomeHero();
}

// 스크롤하면 상단(상태 표시줄) 영역에 바탕을 깔아 글자가 겹쳐 보이지 않게 한다
addEventListener('scroll', () => document.body.classList.toggle('scrolled', scrollY > 40), {passive: true});

// ---------- 퐁당이에게 물어보기(AI) ----------
// 서버의 /api/ask가 Claude로 답한다. AI가 꺼져 있으면(SDK·자격 증명 없음, 오프라인) 같은 공공 자료로 계산한 답을 대신 보여 준다.
function itemFacts(name) {
  const H = HS.nat, it = H?.items[name]; if (!it) return null;
  const a = fcCache[`${H.id}:${name}`] || (fcCache[`${H.id}:${name}`] = analyze(it, H.months));
  const wk = WK?.items[name]?.price?.filter(x => x != null);
  return {name, unit: unitText(it.unit), a, v: verdictOf(a), next: a.forecast[0].mid / a.last.price - 1, wow: wk && wk.length >= 2 ? wk.at(-1) / wk.at(-2) - 1 : null};
}
function askContext(q) {
  const names = Object.keys(HS.nat?.items || {});
  const hit = names.filter(n => q.includes(n));
  const pick = hit.length ? hit : names;
  const p = x => `${x > 0 ? '+' : ''}${Math.round(x * 100)}%`;
  return pick.map(itemFacts).filter(Boolean).map(f => `${f.name}: ${f.a.last.month} 전국 소매 ${won(f.a.last.price)}/${f.unit}, 지난달 대비 ${f.a.stats.mom == null ? '자료 없음' : p(f.a.stats.mom)}, 10년 평균 대비 ${p(f.a.stats.vsAll)}, 다음 달 예상 ${p(f.next)}(예측 신뢰 ${f.a.reliability}), 이번 주 지난주 대비 ${f.wow == null ? '자료 없음' : p(f.wow)}, 판단: ${f.v.head}`).join('\n');
}
function localAnswer(q) {
  const names = Object.keys(HS.nat?.items || {}), hit = names.filter(n => q.includes(n));
  const pc = x => `${Math.round(Math.abs(x) * 100)}%`;
  if (hit.length) return hit.slice(0, 3).map(n => { const f = itemFacts(n); return `${n}${eunneun(n)} ${f.v.head}. 다음 달엔 ${Math.abs(f.next) < 0.03 ? '지금과 비슷할 것 같아요' : `${pc(f.next)} 정도 ${f.next > 0 ? '오를' : '내릴'} 것 같아요`}${f.wow != null && Math.abs(f.wow) >= 0.01 ? `, 이번 주는 지난주보다 ${pc(f.wow)} ${f.wow > 0 ? '올랐어요' : '내렸어요'}` : ''}.`; }).join(' ');
  const all = names.map(itemFacts).filter(f => f && f.a.reliability !== 'low');
  if (/오를|비싸|올라|상승/.test(q)) { const l = all.filter(f => f.next >= 0.05).sort((x, y) => y.next - x.next).slice(0, 4); return l.length ? `다음 달 오를 것 같은 재료는 ${l.map(f => `${f.name}(+${pc(f.next)})`).join(', ')}예요. 자주 사는 재료라면 미리 사 두는 걸 생각해 보세요.` : '다음 달 크게 오를 것 같은 재료는 없어요.'; }
  if (/내릴|싸|저렴|떨어|하락/.test(q)) { const l = all.filter(f => f.next <= -0.05).sort((x, y) => x.next - y.next).slice(0, 4); return l.length ? `다음 달 내릴 것 같은 재료는 ${l.map(f => `${f.name}(−${pc(f.next)})`).join(', ')}예요. 급하지 않다면 기다려 봐도 좋아요.` : '다음 달 크게 내릴 것 같은 재료는 없어요.'; }
  return `재료 이름을 넣어 물어봐 주세요. 예를 들어 "시금치 지금 사도 돼요?"처럼요. 지금 볼 수 있는 재료는 ${names.slice(0, 8).join(', ')} 등 ${names.length}가지예요.`;
}
{
  const sheet = $('askSheet'), log = $('askLog'), input = $('askInput');
  const SUG = ['다음 달 오를 재료는?', '다음 달 싸지는 재료는?', '시금치 지금 사도 돼요?', '대파 미리 사 둘까요?'];
  const bubble = (who, text) => { const b = h('div', {class: `ask-b ${who}`}, text); log.append(b); log.scrollTop = log.scrollHeight; return b; };
  const open = q => {
    sheet.hidden = false; document.body.classList.add('ask-open');
    const m = clear($('askMascot')); m.insertAdjacentHTML('beforeend', mascotSVG('happy', '100%'));
    if (!log.childElementCount) bubble('bot', '안녕하세요, 퐁당이에요! 재료 이름을 넣어 물어보면 이번 달·다음 달 가격 흐름으로 답해 드릴게요.');
    clear($('askSug')).append(...SUG.map(s => h('button', {type: 'button', onclick: () => send(s), text: s})));
    if (q) send(q); else setTimeout(() => input.focus(), 60);
  };
  const close = () => { sheet.hidden = true; document.body.classList.remove('ask-open'); };
  async function send(q) {
    q = String(q || '').trim(); if (!q) return;
    input.value = ''; bubble('me', q);
    const wait = bubble('bot wait', '생각하는 중이에요…');
    let res = null;
    try {
      const r = await fetch('./api/ask', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({question: q, context: askContext(q)})});
      if (r.ok) res = await r.json();
    } catch { /* 서버가 없거나 오프라인이면 아래에서 직접 계산 */ }
    wait.remove();
    if (res?.mode === 'ai' && res.answer) { bubble('bot', res.answer); $('askMode').textContent = 'AI(Claude)가 공공 가격 자료를 바탕으로 답해요'; }
    else { bubble('bot', localAnswer(q)); $('askMode').textContent = 'AI 연결 전이라 퐁당이가 공공 자료로 계산해 답해요'; }
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-ask]'); if (b) { e.preventDefault(); open(b.dataset.ask); } if (e.target.closest('[data-ask-close]')) close(); });
  $('askForm').addEventListener('submit', e => { e.preventDefault(); send(input.value); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden) close(); });
}

// 포항 소매가와 전국 소매가 비교(같은 규격·같은 달만). 대회 지역(포항)의 체감 물가를 함께 보여 준다.
function pohangGap(name) {
  const N = HS.nat?.items[name], P = HS.pohang?.items[name];
  if (!N || !P || N.spec !== P.spec || N.unit !== P.unit) return null;
  const ms = HS.nat.months, idx = ms.map((_, i) => i).filter(i => N.price[i] && P.price[i]);
  if (!idx.length) return null;
  const i = idx.at(-1), last12 = idx.filter(j => j > i - 12);
  const avg12 = last12.length >= 6 ? last12.reduce((s, j) => s + P.price[j] / N.price[j], 0) / last12.length - 1 : null;
  return {month: ms[i], pohang: P.price[i], nat: N.price[i], gap: P.price[i] / N.price[i] - 1, avg12};
}
