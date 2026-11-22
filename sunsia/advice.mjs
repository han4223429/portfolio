// "검토 우선 대안" 한 줄 요약: 바꿀 수 있는 재료 중 가격·가격 흐름·3개월 전망·알레르기를 함께 보고 우선 검토할 후보를 고른다.
// 규칙은 단순하게 유지한다(아래 순서). 맛·품질·조리 적합성은 판단하지 않으며 최종 결정은 담당자가 한다.
//  1) 같은 양 비용이 지금(현재 재료의 오늘 가격)보다 낮고 최근 3개월 가격이 오르는 중이 아닌 후보(good)만 대상
//  2) 3개월 전망이 '오를 가능성'인 후보는 뒤로 미룬다(전망이 없으면 중립)
//  3) 그중 같은 양 비용이 가장 낮은 후보
import {swapTable, trendOf} from './real.mjs';
import {outlookOf} from './forecast.mjs';

export function recommend(data, targetKey, kg, pct, quotes = {}, hist = null, cache = {}) {
  const t = swapTable(data, targetKey, kg, pct, quotes);
  if (!t.group) return {kind: 'none', reason: 'no-group', table: t};
  if (!t.list.length) return {kind: 'none', reason: 'no-candidates', table: t};
  const tgt = data.catalog[targetKey];
  const scored = t.list.filter(x => x.good).map(x => {
    const ol = outlookOf(hist, x.label, cache);
    const added = x.allergens.filter(n => !(tgt.allergen_nos || []).includes(n));
    return {...x, outlook: ol?.outlook ?? null, reliability: ol?.reliability ?? null, addedAllergens: added, rank: (ol?.outlook === 'up' ? 1 : 0)};
  }).sort((a, b) => a.rank - b.rank || a.cost - b.cost);
  if (!scored.length) return {kind: 'none', reason: 'no-good', table: t, cheapest: t.list[0]};
  return {kind: 'pick', pick: scored[0], others: scored.slice(1), table: t};
}

export function recommendText(data, r, targetLabel, kg) {
  if (r.kind === 'pick') {
    const p = r.pick, saved = r.table.original.afterCost - p.cost;
    const parts = [
      `${p.label}${/[가-힣]$/.test(p.label) && ((p.label.charCodeAt(p.label.length - 1) - 0xAC00) % 28) ? '으로' : '로'} 바꾸면 같은 양(${kg}kg) 기준 ${Math.round(saved).toLocaleString('ko-KR')}원 낮습니다`,
      `가격 흐름: ${p.trend.label}`,
      p.outlook ? `3개월 전망: ${{up: '오를 가능성', down: '내릴 가능성', flat: '비슷'}[p.outlook]}${p.reliability === 'low' ? '(참고)' : ''}` : '3개월 전망: 자료 없음',
      p.addedAllergens.length ? `알레르기 번호 추가: ${p.addedAllergens.map(n => `${n}번 ${data.allergen_names[n] || ''}`.replace(/\(.*?\)/, '')).join(', ')}` : '알레르기 번호 추가 없음',
    ];
    return parts.join(' · ');
  }
  if (r.reason === 'no-group') return `${targetLabel}은(는) 지침의 동일 식품군 대체 목록에 없어 후보를 제시하지 않습니다.`;
  if (r.reason === 'no-candidates') return '가격이 연결된 같은 식품군 후보가 없습니다.';
  return `후보 중 현재 가격보다 낮고 가격이 오르는 중이 아닌 재료가 없습니다. 가장 낮은 후보는 ${r.cheapest.label}(${Math.round(r.cheapest.perKg).toLocaleString('ko-KR')}원/kg)입니다.`;
}
