// 표시대상 알레르기 유발물질 19종 대조(식품표시광고법 시행규칙 별표2 기준, 번호는 급식 식단표 1~19번).
// 원칙: '표시에서 찾지 못함'은 '알레르기 없음'이 아니다. 읽지 못하면 '확인 불가'로 둔다.
import {parseLabelText, canonicalAllergen} from './labels.mjs';

export const ALLERGENS19 = [
  {no: '1', name: '알류', rx: /난류|계란|달걀|난백|난황|전란|메추리알/},
  {no: '2', name: '우유', rx: /우유|유청|분유|카제인|치즈|생크림|요구르트|요거트|밀크|유당|(?<!코코아|카카오)버터/},
  {no: '3', name: '메밀', rx: /메밀/},
  {no: '4', name: '땅콩', rx: /땅콩/},
  {no: '5', name: '대두', rx: /대두|두부|된장|두유|콩기름|콩가루|콩단백/},
  {no: '6', name: '밀', rx: /(?<![가-힣])밀(?![가-힣])|밀가루|소맥|글루텐|통밀|밀단백/},
  {no: '7', name: '고등어', rx: /고등어/},
  {no: '8', name: '게', rx: /(?<![가-힣])게(?![가-힣])|꽃게|대게|게살/},
  {no: '9', name: '새우', rx: /새우|흰다리/},
  {no: '10', name: '돼지고기', rx: /돼지|돈육|베이컨/},
  {no: '11', name: '복숭아', rx: /복숭아|황도|백도/},
  {no: '12', name: '토마토', rx: /토마토/},
  {no: '13', name: '아황산류', rx: /아황산|이산화황/},
  {no: '14', name: '호두', rx: /호두/},
  {no: '15', name: '닭고기', rx: /닭|계육|치킨/},
  {no: '16', name: '쇠고기', rx: /쇠고기|소고기|우육|비프|한우/},
  {no: '17', name: '오징어', rx: /오징어/},
  {no: '18', name: '조개류', rx: /조개|굴(?![가-힣])|굴소스|전복|홍합|바지락|꼬막|재첩|가리비|백합/},
  {no: '19', name: '잣', rx: /(?<![가-힣])잣(?![가-힣])|잣가루/},
];

const BY_NAME = new Map(ALLERGENS19.map(a => [a.name, a]));
const toNo = word => { const c = canonicalAllergen(word); return c && BY_NAME.has(c) ? BY_NAME.get(c).no : null; };
const splitWords = v => String(v || '').normalize('NFKC').split(/[,，、/·\s]+/).map(x => x.trim()).filter(Boolean);

// 원재료명 글에서 19종을 짚는다(참고용). 함유 문구와 별개로 '원재료에서 발견'으로 따로 표시한다.
export function scanIngredients(text) {
  const t = String(text || '').normalize('NFKC');
  return ALLERGENS19.filter(a => a.rx.test(t)).map(a => a.no);
}

// OCR/붙여넣기 글 전체를 읽어 19종 상태를 만든다.
export function analyzeLabel(text) {
  const raw = String(text || '');
  const parsed = parseLabelText(raw);
  const f = parsed.fields;
  const contains = new Set(), precaution = new Set(), found = new Set();
  for (const w of splitWords(f.allergens_contained?.value)) { const n = toNo(w); if (n) contains.add(n); }
  for (const w of splitWords(f.allergens_precaution?.value)) { const n = toNo(w); if (n) precaution.add(n); }
  for (const n of scanIngredients(f.ingredients?.value)) if (!contains.has(n)) found.add(n);
  const readAnything = raw.trim().length > 0;
  const hasStatement = !!(f.allergens_contained?.value || f.allergens_precaution?.value);
  const hasIngredients = !!f.ingredients?.value;
  let verdict, note;
  if (contains.size || found.size) { verdict = 'CAUTION'; note = '알레르기 유발물질이 표시되어 있거나 원재료명에서 발견되었습니다. 포장 사진과 직접 비교해 확인해 주십시오.'; }
  else if (precaution.size) { verdict = 'CAUTION'; note = '같은 시설·혼입 가능 문구가 있습니다. 포장 사진과 직접 확인해 주십시오.'; }
  else if (readAnything && (hasStatement || hasIngredients)) { verdict = 'NOT_FOUND'; note = '읽은 글에서 19종은 찾지 못했습니다. 이것은 안전하다는 뜻이 아닙니다. 읽지 못한 부분이 있을 수 있어 포장을 직접 확인해 주십시오.'; }
  else { verdict = 'UNKNOWN'; note = '확인 불가: 원재료명이나 알레르기 표시를 읽지 못했습니다. 라벨이 잘 보이게 다시 비춰 주십시오.'; }
  return {parsed, contains: [...contains], precaution: [...precaution], found: [...found], verdict, note, readAnything, hasStatement, hasIngredients};
}
