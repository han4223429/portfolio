import {canonicalAllergen} from './labels.mjs';
// 썬시아 오프라인 연습 구현 · 2026-10-30. 제출 가능 여부는 현장 규정 확인 전 미정.
export const STATUS = Object.freeze({FEASIBLE:'FEASIBLE',INFEASIBLE:'INFEASIBLE',SEARCH_INCOMPLETE:'SEARCH_INCOMPLETE',INPUT_INSUFFICIENT:'INPUT_INSUFFICIENT',INVALID_INPUT:'INVALID_INPUT'});
const finite = x => typeof x === 'number' && Number.isFinite(x);
const gcd=(a,b)=>b?gcd(b,a%b):a;
function fraction(value){
  const [mantissa,expRaw]=String(value).toLowerCase().split('e');const exp=Number(expRaw||0);const [whole,decimal='']=mantissa.split('.');
  let n=BigInt(whole+decimal),d=10n**BigInt(decimal.length);if(exp>0)n*=10n**BigInt(exp);if(exp<0)d*=10n**BigInt(-exp);const g=gcd(n,d);return {n:n/g,d:d/g};
}
const add=(a,b)=>{const n=a.n*b.d+b.n*a.d,d=a.d*b.d,g=gcd(n,d);return {n:n/g,d:d/g};};
const mul=(a,b)=>{const n=a.n*b.n,d=a.d*b.d,g=gcd(n,d);return {n:n/g,d:d/g};};
const toNumber=a=>Number(a.n)/Number(a.d);
const ceilDiv=(a,b)=>(a+b-1n)/b;
const clean = x => String(x ?? '').trim();
const issue = (kind, message) => ({kind,message});
export function validateCatalog(data) {
  const errors=[], missing=[];
  if (!data || !Array.isArray(data.menus) || !Array.isArray(data.ingredients) || !Array.isArray(data.candidates)) return {errors:[issue('schema','메뉴·원재료·후보 배열이 필요합니다.')],missing};
  const ids=new Set();
  for (const m of data.menus) {
    if(!clean(m.menu_id) || ids.has(m.menu_id)) errors.push(issue('menu','메뉴 ID가 비었거나 중복됐습니다.'));
    ids.add(m.menu_id);
    if(!clean(m.menu_name)) missing.push(issue('menu','메뉴 이름이 없습니다.'));
  }
  const itemKeys=new Set(), skuSpec=new Map();
  const checkSku=(sku,pack,price,where)=>{
    if(!clean(sku)) missing.push(issue(where,'구매 SKU가 없습니다.'));
    if(!finite(pack)||pack<1||pack>1e9) errors.push(issue(where,'포장 크기는 1g 이상 10억g 이하인 숫자여야 합니다.'));
    if(!Number.isSafeInteger(price)||price<0||price>1e12) errors.push(issue(where,'포장 단가는 0 이상 1조원 이하의 정수여야 합니다.'));
    if(clean(sku)&&finite(pack)&&pack>0&&Number.isInteger(price)&&price>=0){
      const prev=skuSpec.get(sku); if(prev&&(prev.pack!==pack||prev.price!==price)) errors.push(issue(where,`SKU ${sku}의 포장 크기/가격이 서로 다릅니다.`));
      else skuSpec.set(sku,{pack,price});
    }
  };
  for(const it of data.ingredients){
    const key=`${it.menu_id}\u0000${it.ingredient_id}`;
    if(!ids.has(it.menu_id)) errors.push(issue('ingredient','존재하지 않는 메뉴를 참조합니다.'));
    if(!clean(it.ingredient_id)||itemKeys.has(key)) errors.push(issue('ingredient','원재료 ID가 비었거나 같은 메뉴에서 중복됐습니다.'));
    itemKeys.add(key);
    if(!clean(it.ingredient_name)||!clean(it.culinary_use)) missing.push(issue('ingredient','재료명 또는 조리 용도가 비었습니다.'));
    if(!finite(it.grams_per_serving)||it.grams_per_serving<=0||it.grams_per_serving>1e4) errors.push(issue('ingredient','1인 사용량은 0보다 크고 1만g 이하인 숫자여야 합니다.'));
    if(it.unit&&it.unit!=='g') errors.push(issue('ingredient','사용량 단위는 g로 통일하세요.'));
    if(it.pack_unit&&it.pack_unit!=='g') errors.push(issue('ingredient','포장 단위는 g로 통일하세요.'));
    checkSku(it.ingredient_id,it.pack_size_g,it.baseline_pack_price_krw,'ingredient');
  }
  const candidateKeys=new Set();
  for(const c of data.candidates){
    const key=`${c.menu_id}\u0000${c.original_ingredient_id}\u0000${c.candidate_ingredient_id}`;
    if(!itemKeys.has(`${c.menu_id}\u0000${c.original_ingredient_id}`)) errors.push(issue('candidate','후보가 존재하지 않는 원재료를 참조합니다.'));
    if(!clean(c.candidate_ingredient_id)||candidateKeys.has(key)) errors.push(issue('candidate','후보 ID가 비었거나 같은 재료에 중복됐습니다.'));
    candidateKeys.add(key);
    if(c.candidate_ingredient_id===c.original_ingredient_id) errors.push(issue('candidate','원안은 자동 포함되므로 후보표에 중복 입력하지 마세요.'));
    if(!finite(c.conversion_ratio)||c.conversion_ratio<=0||c.conversion_ratio>10) errors.push(issue('candidate','환산 비율은 0보다 크고 10 이하여야 합니다.'));
    if(c.pack_unit&&c.pack_unit!=='g') errors.push(issue('candidate','포장 단위는 g로 통일하세요.'));
    if(!clean(c.candidate_name)||!clean(c.culinary_use)) missing.push(issue('candidate','후보명 또는 조리 용도가 비었습니다.'));
    if(!['APPROVED','PENDING','REJECTED','SIMULATED_APPROVED'].includes(c.review_status)) errors.push(issue('candidate','검토 상태를 확인하세요.'));
    if(c.review_status==='SIMULATED_APPROVED'&&c.data_kind!=='SYNTHETIC') errors.push(issue('candidate','모의 승인 후보는 SYNTHETIC 자료에서만 사용할 수 있습니다.'));
    if(c.review_status==='APPROVED'&&c.data_kind==='SYNTHETIC') errors.push(issue('candidate','합성 후보를 실제 검토 완료로 표시할 수 없습니다.'));
    if(c.review_status==='APPROVED'&&!clean(c.ratio_evidence)) missing.push(issue('candidate','실제 승인 후보의 환산 근거가 없습니다.'));
    checkSku(c.candidate_ingredient_id,c.pack_size_g,c.baseline_pack_price_krw,'candidate');
  }
  return {errors,missing};
}
function packLine(sku,group,price){
  const required=group.required,pack=fraction(group.pack_size_g);
  const packCount=ceilDiv(required.n*pack.d,required.d*pack.n);
  const count=Number(packCount),purchased=mul(fraction(count),pack);
  const leftover=add(purchased,{n:-required.n,d:required.d});
  return {sku,name:group.name,required_g:toNumber(required),pack_size_g:group.pack_size_g,pack_count:count,purchased_g:toNumber(purchased),leftover_g:toNumber(leftover),pack_price_krw:price,line_cost_krw:count*price};
}
function calculate(items,selected,scenario){
  const grouped=new Map(); let changes=0;
  for(let i=0;i<items.length;i++){
    const it=items[i], op=selected[i]; if(op.sku!==it.ingredient_id) changes++;
    const required=mul(mul(fraction(it.grams_per_serving),fraction(scenario.servings)),fraction(op.ratio));
    const g=grouped.get(op.sku)||{name:op.name,required:{n:0n,d:1n},pack_size_g:op.pack,price:op.price};
    g.required=add(g.required,required); grouped.set(op.sku,g);
  }
  const lines=[...grouped].sort(([a],[b])=>a.localeCompare(b)).map(([sku,g])=>{
    const price=sku===scenario.changed_ingredient_id ? Number((BigInt(g.price)*(100n+BigInt(scenario.increase_pct))+50n)/100n) : g.price;
    return packLine(sku,g,price);
  });
  const total=lines.reduce((s,l)=>s+l.line_cost_krw,0);
  return {changes,total,lines,selected:selected.map((s,i)=>({original:items[i].ingredient_id,sku:s.sku,name:s.name})),key:selected.map(x=>x.sku).join('|')};
}
const sortCost=(a,b)=>a.total-b.total||a.changes-b.changes||a.key.localeCompare(b.key);
const sortChanges=(a,b)=>a.changes-b.changes||a.total-b.total||a.key.localeCompare(b.key);
export function evaluate(data,{menu_id,changed_ingredient_id,increase_pct,servings=500,maxCombinations=100000}={}){
  const check=validateCatalog(data);
  if(check.errors.length) return {status:STATUS.INVALID_INPUT,issues:check.errors};
  if(check.missing.length) return {status:STATUS.INPUT_INSUFFICIENT,issues:check.missing};
  if(!Number.isInteger(servings)||servings<=0||servings>100000||!Number.isInteger(increase_pct)||increase_pct<0||increase_pct>1000||!Number.isInteger(maxCombinations)||maxCombinations<1) return {status:STATUS.INVALID_INPUT,issues:[issue('scenario','인원(1~100,000)·상승률·탐색 상한을 확인하세요.')]};
  const items=data.ingredients.filter(i=>i.menu_id===menu_id).sort((a,b)=>a.ingredient_id.localeCompare(b.ingredient_id));
  if(!data.menus.some(m=>m.menu_id===menu_id)||!items.length||!items.some(i=>i.ingredient_id===changed_ingredient_id)) return {status:STATUS.INPUT_INSUFFICIENT,issues:[issue('scenario','메뉴·원재료·가격 상승 대상을 확인하세요.')]};
  const scenario={menu_id,changed_ingredient_id,increase_pct,servings};
  const baseline=calculate(items,items.map(i=>({sku:i.ingredient_id,name:i.ingredient_name,ratio:1,pack:i.pack_size_g,price:i.baseline_pack_price_krw})),{...scenario,increase_pct:0});
  if(!Number.isSafeInteger(baseline.total)||baseline.lines.some(l=>!Number.isSafeInteger(l.line_cost_krw))) return {status:STATUS.INVALID_INPUT,issues:[issue('number','금액이 안전한 정수 범위를 넘습니다. 단위와 수량을 확인하세요.')]};
  const c0=baseline.total;
  let pending=0,unverifiedLabels=0;
  const forbiddenRaw=(data.forbidden_allergens||[]).map(clean).filter(Boolean);
  const unsupported=forbiddenRaw.filter(x=>!canonicalAllergen(x));
  if(unsupported.length)return {status:STATUS.INPUT_INSUFFICIENT,c0,issues:[issue('allergen',`알레르기 회피 항목 ${unsupported.join(', ')}은 현재 자동 대조 목록에 없습니다. 사람 확인이 필요합니다.`)]};
  const forbidden=forbiddenRaw.map(canonicalAllergen);
  const labelAllowed=(sku)=>{
    if(!forbidden.length)return true;
    const record=data.label_records?.[sku];
    if(!record||!['HUMAN_CONFIRMED','SIMULATED_CONFIRMED'].includes(record.status)){unverifiedLabels++;return false;}
    if(!clean(record.original)||!clean(record.filename)||!clean(record.reviewer)||!clean(record.reviewed_at)||record.source_matched!==true){unverifiedLabels++;return false;}
    if(record.status==='SIMULATED_CONFIRMED'&&data.ingredients.find(i=>i.ingredient_id===sku)?.data_kind!=='SYNTHETIC'&&data.candidates.find(c=>c.candidate_ingredient_id===sku)?.data_kind!=='SYNTHETIC') {unverifiedLabels++;return false;}
    const fields=record.fields||{};
    for(const key of ['allergens_contained','allergens_precaution']){
      const field=fields[key];
      if(!field||!['EXTRACTED','MANUAL_EDIT','NONE_REPORTED_REVIEWED'].includes(field.status)||(['EXTRACTED','MANUAL_EDIT'].includes(field.status)&&(!clean(field.value)||!clean(field.evidence)))||(field.status==='NONE_REPORTED_REVIEWED'&&clean(field.value))){unverifiedLabels++;return false;}
    }
    const present=[fields.allergens_contained?.value,fields.allergens_precaution?.value].join(',').split(',').map(clean).filter(Boolean).map(canonicalAllergen);
    if(present.includes(null)){unverifiedLabels++;return false;}
    return !forbidden.some(a=>present.includes(a));
  };
  const choices=items.map(it=>{
    const own={sku:it.ingredient_id,name:it.ingredient_name,ratio:1,pack:it.pack_size_g,price:it.baseline_pack_price_krw};
    const others=data.candidates.filter(c=>c.menu_id===menu_id&&c.original_ingredient_id===it.ingredient_id);
    pending+=others.filter(c=>c.review_status==='PENDING').length;
    const allowed=others.filter(c=>['APPROVED','SIMULATED_APPROVED'].includes(c.review_status)&&c.culinary_use===it.culinary_use&&!String(c.exclusion_conditions||'').split('|').map(clean).some(x=>x&&data.forbidden_ingredients?.includes(x))&&!data.forbidden_ingredients?.includes(c.candidate_ingredient_id));
    return [own,...allowed.map(c=>({sku:c.candidate_ingredient_id,name:c.candidate_name,ratio:c.conversion_ratio,pack:c.pack_size_g,price:c.baseline_pack_price_krw}))].filter(x=>!data.forbidden_ingredients?.includes(x.sku)&&labelAllowed(x.sku)).sort((a,b)=>a.sku.localeCompare(b.sku));
  });
  const count=choices.reduce((n,c)=>n*c.length,1);
  if(!Number.isSafeInteger(count)||count>maxCombinations) return {status:STATUS.SEARCH_INCOMPLETE,c0,combinations:count,issues:[issue('search',`조합 ${count}개가 설정된 상한 ${maxCombinations}개를 초과합니다.`)]};
  const feasible=[]; let examined=0,overflow=false;
  function walk(depth,selected){
    if(depth===choices.length){examined++;const r=calculate(items,selected,scenario);if(!Number.isSafeInteger(r.total)||r.lines.some(l=>!Number.isSafeInteger(l.line_cost_krw))){overflow=true;return;}if(r.total<=c0)feasible.push(r);return;}
    for(const c of choices[depth]) walk(depth+1,[...selected,c]);
  }
  walk(0,[]);
  if(overflow) return {status:STATUS.INVALID_INPUT,issues:[issue('number','계산 금액이 안전한 정수 범위를 넘습니다. 단위와 수량을 확인하세요.')]};
  const shockedOriginal=calculate(items,items.map(i=>({sku:i.ingredient_id,name:i.ingredient_name,ratio:1,pack:i.pack_size_g,price:i.baseline_pack_price_krw})),scenario);
  if(unverifiedLabels) return {status:STATUS.INPUT_INSUFFICIENT,c0,shockedOriginal,examined,combinations:count,issues:[issue('label',`${unverifiedLabels}개 SKU의 표시사항 확인이 부족합니다. 알레르기 제외 조건을 적용한 최적안은 확정할 수 없습니다.`)]};
  if(!feasible.length) return {status:pending||unverifiedLabels?STATUS.INPUT_INSUFFICIENT:STATUS.INFEASIBLE,c0,shockedOriginal,examined,combinations:count,issues:pending||unverifiedLabels?[issue('review',`${pending}개 후보 검토 대기, ${unverifiedLabels}개 SKU 표시 확인 부족. 불가 판정을 보류합니다.`)]:[issue('budget','등록된 허용 후보의 모든 조합이 예산을 넘습니다.')]};
  const byCost=[...feasible].sort(sortCost),byChanges=[...feasible].sort(sortChanges);
  return {status:STATUS.FEASIBLE,c0,shockedOriginal,examined,combinations:count,pending,unverifiedLabels,lowestCost:byCost.slice(0,3),minChanges:byChanges.slice(0,3),difference:{changes:byCost[0].changes-byChanges[0].changes,additionalCost:byChanges[0].total-byCost[0].total}};
}
export function runMatrix(data,{maxCombinations=100000}={}){
  return data.menus.flatMap(menu=>{
    const primaries=data.ingredients.filter(i=>i.menu_id===menu.menu_id&&i.is_primary);
    const primary=primaries.length===1?primaries[0]:null;
    return [10,30,50].map(increase_pct=>({menu_id:menu.menu_id,menu_name:menu.menu_name,increase_pct,changed_ingredient_id:primary?.ingredient_id||'',result:primary?evaluate(data,{menu_id:menu.menu_id,changed_ingredient_id:primary.ingredient_id,increase_pct,maxCombinations}):{status:STATUS.INPUT_INSUFFICIENT,issues:[issue('scenario','메뉴마다 주재료 is_primary=true가 정확히 1개 필요합니다.')]}}));
  });
}
