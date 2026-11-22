// 실데이터(real_catalog.json)를 계산 엔진 입력으로 바꾸고 결과를 사람이 읽을 수 있게 풀어 주는 순수 함수 모음.
// 값은 모두 원본 공공자료에서 온다. 없는 값은 null로 두고 화면에서 '미확인'으로 표시한다.
import {evaluate, STATUS} from './engine.mjs';
import {toCSV} from './csv.mjs';

export {STATUS};
export const PCT_OPTIONS = [10, 30, 50, 100];

export function shiftMonth(m, delta) {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// 가격 시리즈 [[월, 원/포장], ...] 에서 실제 변동 지표를 계산한다.
export function seriesStats(series) {
  if (!series?.length) return null;
  const last = series[series.length - 1];
  const min = series.reduce((a, b) => (b[1] < a[1] ? b : a));
  const find = m => series.find(([x]) => x === m)?.[1] ?? null;
  const y = find(shiftMonth(last[0], -12)), q = find(shiftMonth(last[0], -3));
  return {
    last, min, first: series[0], months: series.length,
    riseFromMinPct: Math.round((last[1] / min[1] - 1) * 100),
    yoyPct: y ? Math.round((last[1] / y - 1) * 100) : null,
    threeMonthPct: q ? Math.round((last[1] / q - 1) * 100) : null,
  };
}

// 관측 기간 최저가 대비 현재가가 높은 재료 순위(실제 가격 흐름에서 계산).
export function risers(data, n = 6) {
  return Object.values(data.catalog)
    .filter(e => e.price)
    .map(e => ({key: e.key, label: e.label, stats: seriesStats(e.price.series), price: e.price}))
    .filter(x => x.stats && x.stats.riseFromMinPct > 0)
    .sort((a, b) => b.stats.riseFromMinPct - a.stats.riseFromMinPct)
    .slice(0, n);
}

export function mealLabel(m) {
  return `${m.day} ${m.meal}`;
}

// 선택한 끼니와 요리로 엔진용 카탈로그를 만든다. 가격이 연결된 재료만 비교에 들어간다.
// 포장 기준: 'unit' = 필요한 만큼(10g 단위로 도매 단가를 환산, 소규모 시설 기본), 'market' = 도매 거래단위로 올림(잔량 발생)
const UNIT_G = 10;
export function packOf(entry, packMode) {
  const p = entry.price;
  if (packMode === 'market') return {pack_size_g: p.pack_g, price: p.price_krw};
  return {pack_size_g: UNIT_G, price: Math.max(1, Math.round(p.price_krw / p.pack_g * UNIT_G))};
}

// 같은 식품군(지침의 동일 식품군 대체) 안에서 가격이 연결된 재료를 후보로 만든다.
function makeCandidates(data, ingredients, packMode, menu_id) {
  const page = data.rules?.substitution?.page || '';
  const out = [];
  for (const ing of ingredients) {
    const orig = data.catalog[ing.ingredient_id];
    if (!orig.group) continue;
    for (const c of Object.values(data.catalog)) {
      if (c.key === orig.key || c.group !== orig.group || !c.price) continue;
      const pk = packOf(c, packMode);
      out.push({
        menu_id, original_ingredient_id: orig.key, candidate_ingredient_id: c.key, candidate_name: c.label,
        conversion_ratio: 1, culinary_use: orig.group, pack_size_g: pk.pack_size_g, baseline_pack_price_krw: pk.price,
        review_status: 'GUIDELINE_ALLOWED', data_kind: 'REAL_PUBLIC', exclusion_conditions: '',
        ratio_evidence: `${data.rules.doc} PDF ${page}쪽: 동일 식품군 내 대체 허용. 환산 비율은 문서에 없어 중량 1:1로 가정`,
      });
    }
  }
  return out;
}

export function buildEngineCatalog(data, meal, selectedDishes, packMode = 'unit') {
  const pick = new Set(selectedDishes);
  const menu_id = 'M';
  const ingredients = [];
  for (const p of meal.priced) {
    const g = Object.entries(p.by_dish || {}).filter(([d]) => pick.has(d)).reduce((s, [, v]) => s + v, 0);
    const e = data.catalog[p.key];
    if (!(g > 0) || !e?.price) continue;
    ingredients.push({
      menu_id, ingredient_id: p.key, ingredient_name: e.label, culinary_use: e.group || '일반',
      grams_per_serving: Math.round(g * 1000) / 1000, pack_size_g: packOf(e, packMode).pack_size_g, baseline_pack_price_krw: packOf(e, packMode).price,
      is_primary: false, data_kind: 'REAL_PUBLIC', price_source: `aT 도매 ${e.price.month}`,
    });
  }
  const candidates = makeCandidates(data, ingredients, packMode, menu_id);
  return {menus: [{menu_id, menu_name: `${meal.day} ${meal.meal}`}], ingredients, candidates, forbidden_ingredients: []};
}

export function runScenario(data, meal, selectedDishes, changedKey, pct, servings, packMode = 'unit') {
  const catalog = buildEngineCatalog(data, meal, selectedDishes, packMode);
  if (!catalog.ingredients.some(i => i.ingredient_id === changedKey)) {
    return {catalog, result: {status: STATUS.INPUT_INSUFFICIENT, issues: [{kind: 'scenario', message: '선택한 요리에 이 재료가 없습니다.'}]}};
  }
  const result = evaluate(catalog, {menu_id: 'M', changed_ingredient_id: changedKey, increase_pct: pct, servings});
  return {catalog, result};
}

const NUTS = [['kcal', '열량', 'kcal'], ['protein_g', '단백질', 'g'], ['fat_g', '지방', 'g'], ['carb_g', '탄수화물', 'g'], ['calcium_mg', '칼슘', 'mg'], ['iron_mg', '철분', 'mg']];
const r1 = x => Math.round(x * 10) / 10;

// 재료 하나를 바꿨을 때 1인 1끼 기준 영양·알레르기 번호 변화.
export function describeSwap(data, origKey, candKey, gPerChild) {
  const o = data.catalog[origKey], c = data.catalog[candKey];
  const nutrition = NUTS.map(([k, label, unit]) => {
    const a = o.nutrition?.[k], b = c.nutrition?.[k];
    if (a == null || b == null) return {label, unit, before: null, after: null, delta: null};
    const before = r1(a * gPerChild / 100), after = r1(b * gPerChild / 100);
    return {label, unit, before, after, delta: r1(after - before)};
  });
  const A = new Set(o.allergen_nos || []), B = new Set(c.allergen_nos || []);
  const names = data.allergen_names || {};
  const nm = n => `${n}번 ${names[n] || ''}`.trim();
  return {
    from: o.label, to: c.label, group: o.group, nutrition,
    nutritionKnown: nutrition.some(n => n.delta != null),
    allergens: {removed: [...A].filter(x => !B.has(x)).map(nm), added: [...B].filter(x => !A.has(x)).map(nm), same: [...A].filter(x => B.has(x)).map(nm)},
  };
}

export function swapsOf(plan) {
  return plan.selected.filter(s => s.sku !== s.original).map(s => ({from: s.original, to: s.sku}));
}

// 발주표 CSV(한글, BOM). 가격 출처·기준월·규격을 함께 남긴다.
export function orderCSV(data, catalog, plan, meta) {
  const unitMode = plan.lines.every(l => l.pack_size_g === UNIT_G);
  const swapTo = new Map(plan.selected.map(s => [s.sku, s.original]));
  const headers = ['구분', '품목', '원안 재료', '필요량(g)', '계산 단위(g)', '단위 수', '구매량(g)', '잔량(g)', '단위 단가(원)', '금액(원)', '가격 출처', '가격 기준월', '규격', '비고'];
  const rows = plan.lines.map(l => {
    const e = data.catalog[l.sku];
    const changed = plan.selected.some(s => s.sku === l.sku && s.original !== l.sku);
    return {
      '구분': changed ? '대체' : '원안', '품목': l.name, '원안 재료': changed ? (swapTo.get(l.sku) || '') : '',
      '필요량(g)': Math.round(l.required_g * 10) / 10, '계산 단위(g)': l.pack_size_g, '단위 수': l.pack_count, '구매량(g)': l.purchased_g,
      '잔량(g)': Math.round(l.leftover_g * 10) / 10, '단위 단가(원)': l.pack_price_krw, '금액(원)': l.line_cost_krw,
      '가격 출처': meta.quotes?.[l.sku] ? `사용자 입력 단가(${meta.channel || '현장 확인'}) ${Math.round(meta.quotes[l.sku])}원/kg` : (e?.price ? `aT 월별 농축수산물 ${e.price.channel}가격(${e.price.source_id})` : ''), '가격 기준월': meta.quotes?.[l.sku] ? '' : (e?.price?.month || ''), '규격': e?.price?.spec || '',
      '비고': changed ? '지침 허용 대체·팀 검토 대기·환산 1:1 가정' : '',
    };
  });
  rows.push({'구분': '합계', '금액(원)': plan.total});
  const note = [`# ${meta.title}`, `# ${meta.servings && meta.servings !== '-' ? `인원 ${meta.servings}명, ` : ''}${meta.quoteKg ? `${meta.target} 오늘 본 가격 ${Math.round(meta.quoteKg).toLocaleString('ko-KR')}원/kg(${meta.channel || '현장 확인'}, 평소 시장가 대비 ${meta.quotePct >= 0 ? '+' : ''}${meta.quotePct}%)` : `가격 상승 가정 +${meta.pct}% (${meta.target})`}, ${unitMode ? '필요한 만큼(10g 단위 환산)' : '도매 거래단위 올림'} 기준, 실제 계약가 아님 · 도매시장 월평균 참고가`];
  return '﻿' + note.join('\r\n') + '\r\n' + toCSV(headers, rows).replace(/^﻿/, '');
}


// ---------- 구내식당·독립구매 업장용: 구매 목록(바구니) ----------
// 메뉴나 인원 없이 "재료 + 한 번에 사는 양(kg)"만 넣는다. 엔진에는 사용량을 g/인으로 바꿔 넣는다(인원 100 고정).
const BASKET_SERVINGS = 100;

export function buildBasketCatalog(data, basket, packMode = 'market', quotes = {}) {
  const menu_id = 'M';
  const kgBy = new Map();
  for (const r of basket) if (data.catalog[r.key]?.price && r.kg > 0) kgBy.set(r.key, (kgBy.get(r.key) || 0) + r.kg);
  const ingredients = [...kgBy].map(([key, kg]) => {
    const e = data.catalog[key], pk = packOf(e, packMode);
    return {
      menu_id, ingredient_id: key, ingredient_name: e.label, culinary_use: e.group || '일반',
      grams_per_serving: kg * 1000 / BASKET_SERVINGS, pack_size_g: pk.pack_size_g, baseline_pack_price_krw: pk.price,
      is_primary: false, data_kind: 'REAL_PUBLIC',
    };
  });
  const inBasket = new Set(ingredients.map(i => i.ingredient_id));
  const candidates = makeCandidates(data, ingredients, packMode, menu_id);
  // 구매 목록에 없는 후보는 현장에서 본 가격(원/kg)이 있으면 그 가격을 쓴다(목록에 있는 재료는 shocks로 반영)
  for (const c of candidates) {
    const q = quotes[c.candidate_ingredient_id];
    if (inBasket.has(c.candidate_ingredient_id) || !(q > 0)) continue;
    c.baseline_pack_price_krw = packPriceFromQuote(data.catalog[c.candidate_ingredient_id], q, packMode);
  }
  return {menus: [{menu_id, menu_name: '구매 목록'}], ingredients, candidates, forbidden_ingredients: []};
}

// 현장에서 본 가격(원/kg)을 포장 단가로 바꾼다. 거래단위 기준이면 포장 무게만큼, 10g 단위 기준이면 10g만큼.
function packPriceFromQuote(entry, quoteKg, packMode) {
  const pk = packOf(entry, packMode);
  return Math.max(1, Math.round(quoteKg * pk.pack_size_g / 1000));
}

// 현장 가격(원/kg)이 평소 시장 가격(최근 도매 월평균)과 얼마나 다른지
export function quoteStatus(entry, quoteKg) {
  if (!(quoteKg > 0)) return null;
  const market = perKg(entry), diff = quoteKg / market - 1, pct = Math.round(diff * 100), absurd = quoteKg > market * 20; // 시장가의 20배 넘는 입력은 단위 착오 가능성
  const series = entry.price.series.map(([, v]) => v / entry.price.pack_g * 1000);
  const aboveAll = quoteKg > Math.max(...series);
  let cls, label;
  if (diff >= 0.3) { cls = 'spike'; label = `폭등 의심 · 평소 시장가보다 +${pct}%`; }
  else if (diff >= 0.1) { cls = 'high'; label = `많이 비쌉니다 · 시장가보다 +${pct}%`; }
  else if (diff <= -0.1) { cls = 'low'; label = `쌉니다 · 시장가보다 ${pct}%`; }
  else { cls = 'same'; label = `시장가와 비슷합니다 (${pct >= 0 ? '+' : ''}${pct}%)`; }
  if (absurd) label = `입력값 확인 · 시장가의 ${Math.round(quoteKg / market)}배입니다(단위가 원/kg인지 확인)`;
  return {cls: absurd ? 'spike' : cls, label, pct, market, aboveAll, absurd, maxSeries: Math.max(...series)};
}

// 재료별 가격 변동(%) 모음: 현장 가격이 있으면 그 가격으로, 없으면 대상 재료에 가정 상승률을 적용
export function shocksFrom(data, targetKey, pct, quotes = {}) {
  const shocks = {};
  for (const [k, q] of Object.entries(quotes)) {
    if (!(q > 0) || !data.catalog[k]?.price) continue;
    shocks[k] = Math.max(-90, Math.min(1000, Math.round((q / perKg(data.catalog[k]) - 1) * 100)));
  }
  if (!(targetKey in shocks)) shocks[targetKey] = pct;
  return shocks;
}

export function runBasket(data, basket, targetKey, pct, packMode = 'market', quotes = {}, budget) {
  const catalog = buildBasketCatalog(data, basket, packMode, quotes);
  if (!catalog.ingredients.some(i => i.ingredient_id === targetKey)) {
    return {catalog, result: {status: STATUS.INPUT_INSUFFICIENT, issues: [{kind: 'scenario', message: '구매 목록에 가격이 오른 재료가 없습니다.'}]}};
  }
  const shocks = shocksFrom(data, targetKey, pct, quotes);
  const result = evaluate(catalog, {menu_id: 'M', changed_ingredient_id: targetKey, increase_pct: 0, servings: BASKET_SERVINGS, shocks, budget});
  return {catalog, result, shocks};
}

// 최근 가격 흐름 한 줄 표시
export function trendOf(entry) {
  const st = seriesStats(entry.price.series);
  const q = st?.threeMonthPct;
  if (q == null) return {label: '3개월 비교 불가', cls: 'flat', stats: st};
  if (q <= -3) return {label: `최근 3개월 ${q}% 하락`, cls: 'down', stats: st};
  if (q >= 3) return {label: `최근 3개월 +${q}% 상승`, cls: 'up', stats: st};
  return {label: '최근 3개월 가격 안정', cls: 'flat', stats: st};
}

const perKg = e => e.price.price_krw / e.price.pack_g * 1000;

// 바꿀 수 있는 재료 한눈에: 같은 양을 샀을 때 비용과 가격 흐름, 알레르기 번호
// '가격 대비 좋은 후보' = 오른 재료보다 같은 양 비용이 낮고, 최근 3개월 가격이 오르는 중이 아닌 재료
export function swapTable(data, targetKey, kg, pct, quotes = {}) {
  const o = data.catalog[targetKey];
  const oq = quotes[targetKey] > 0 ? quotes[targetKey] : null;
  const nowPerKg = oq ?? perKg(o) * (1 + pct / 100);
  const original = {key: o.key, label: o.label, perKg: perKg(o), afterPerKg: nowPerKg, cost: perKg(o) * kg, afterCost: nowPerKg * kg, trend: trendOf(o), allergens: o.allergen_nos || [], quoted: !!oq};
  if (!o.group) return {original, list: [], group: null};
  const list = Object.values(data.catalog).filter(c => c.group === o.group && c.key !== targetKey && c.price).map(c => {
    const q = quotes[c.key] > 0 ? quotes[c.key] : null, nowKg = q ?? perKg(c), cost = nowKg * kg, t = trendOf(c);
    return {key: c.key, label: c.label, perKg: nowKg, marketPerKg: perKg(c), quoted: !!q, cost, diff: cost - original.afterCost, trend: t, allergens: c.allergen_nos || [], spec: c.price.spec, month: c.price.month, good: cost < original.afterCost && t.cls !== 'up'};
  }).sort((a, b) => a.cost - b.cost);
  return {original, list, group: o.group};
}

export function allergenSet(data, keys) {
  const set = new Set();
  for (const k of keys) for (const n of data.catalog[k]?.allergen_nos || []) set.add(n);
  return set;
}

// 선택한 안으로 바꿨을 때 알레르기 번호 변화(재료 기준)
export function planAllergenChange(data, plan) {
  const before = allergenSet(data, plan.selected.map(s => s.original)), after = allergenSet(data, plan.selected.map(s => s.sku));
  return {before, after, added: [...after].filter(n => !before.has(n)), removed: [...before].filter(n => !after.has(n))};
}


// 평소 비용 안에서 구성이 어렵다면, "가격이 오른 원안을 그대로 사는 비용"을 상한으로 다시 찾는다.
export function runBasketWithFallback(data, basket, targetKey, pct, packMode = 'market', quotes = {}) {
  const first = runBasket(data, basket, targetKey, pct, packMode, quotes);
  if (first.result.status !== STATUS.INFEASIBLE || !first.result.shockedOriginal) return {...first, relaxed: false};
  const second = runBasket(data, basket, targetKey, pct, packMode, quotes, first.result.shockedOriginal.total);
  return second.result.status === STATUS.FEASIBLE ? {...second, relaxed: true, firstResult: first.result} : {...first, relaxed: false};
}
