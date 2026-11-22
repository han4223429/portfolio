// 표시사항 텍스트 보조 추출. 이미지 OCR·안전 판정이 아니다.
const A=['알류','달걀','계란','우유','메밀','땅콩','대두','밀','고등어','게','새우','돼지고기','복숭아','토마토','아황산류','호두','닭고기','쇠고기','오징어','조개류','잣'];
const uniq=x=>[...new Set(x)];
export const canonicalAllergen=value=>{const v=String(value||'').normalize('NFKC').trim();return A.includes(v)?(['달걀','계란'].includes(v)?'알류':v):null;};
const allergens=s=>uniq((String(s||'').match(new RegExp(A.join('|'),'g'))||[]).map(canonicalAllergen));
const field=(value='',evidence='',status='UNKNOWN')=>({value,evidence,status});
// Resume only a nearby nutrition block across standalone packaging/recycling OCR lines.
// Require the WHOLE resumed line to be nutrient + numeric-unit pairs, not prose.
const nutrientNames='트랜스지방|포화지방|콜레스테롤|탄수화물|단백질|나트륨|당류|지방|열량|칼슘|철분';
const nutrientPair=new RegExp(`(?:${nutrientNames})\\s*\\d+(?:\\.\\d+)?\\s*(?:kcal|mg|μg|ug|g)(?:\\s*\\(\\s*\\d+(?:\\.\\d+)?\\s*%\\s*\\))?`,'gi');
function isNutrientValues(line){
 const text=line.replace(/^[\[\]•*\s]+|[\[\]\s]+$/g,'');
 const hits=text.match(nutrientPair);
 return !!hits?.length && /^[\s,，·;]*$/.test(text.replace(nutrientPair,''));
}
function isPackagingInterruption(line){
 return /^(?:(?:내피|필름|포장재질)(?:\s*[,·/]\s*(?:내피|필름))?\s*[:：]\s*(?:PP|PE|PET|종이|폴리프로필렌|폴리에틸렌)(?:\s*[,·/]\s*(?:PP|PE|PET|종이|폴리프로필렌|폴리에틸렌))*|종이|플라스틱|재활용|분리배출)$/i.test(line);
}

export function parseLabelText(raw){
 const original=String(raw||'');const lines=original.normalize('NFKC').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 const fields={product_name:field(),food_type:field(),origin:field(),net_amount:field(),ingredients:field(),allergens_contained:field(),allergens_precaution:field(),storage:field(),expiry:field(),nutrition:field()};
 const patterns={product_name:/^(?:제품명|상품명)\s*[:：]?\s*(.*)/,food_type:/^(?:식품의\s*유형|식품유형)\s*[:：]?\s*(.*)/,origin:/^(?:원산지|원산국)\s*[:：]?\s*(.*)/,net_amount:/^(?:내용량|중량)\s*[:：]?\s*(.*)/,ingredients:/^(?:원재료명\s*및\s*함량|원재료명|원재료)\s*[:：]?\s*(.*)/,storage:/^(?:보관방법|보관상\s*주의사항)\s*[:：]?\s*(.*)/,expiry:/^(?:소비기한|유통기한)\s*[:：]?\s*(.*)/,nutrition:/^(?:영양정보|영양성분)\s*[:：]?\s*(.*)/};
 let active=null,nutritionGap=0,recoveredNutrition=false;const captured={};
 for(const line of lines){let matched=false;
  for(const [key,re] of Object.entries(patterns)){const m=line.match(re);if(m){nutritionGap=0;recoveredNutrition=false;active=key;captured[key]=[line];const value=m[1]||'';fields[key]=field(value,line,/█|■|\[가림\]/.test(value)?'REDACTED':value?'EXTRACTED':'UNREADABLE');matched=true;break;}}
  if(matched)continue;
  if((active==='nutrition'||nutritionGap>0)&&isPackagingInterruption(line)){
   nutritionGap++;active=null;
   if(nutritionGap>3)nutritionGap=0;
   continue;
  }
  if(nutritionGap>0){
   nutritionGap=0;
   if(isNutrientValues(line)){
    active='nutrition';recoveredNutrition=true;captured.nutrition.push(line);
    fields.nutrition.value+=' '+line;fields.nutrition.evidence=captured.nutrition.join('\n');
    continue;
   }
   // A field, unrelated prose or incomplete numeric line ends the recovery window.
  }
  if(active==='nutrition'&&recoveredNutrition&&!isNutrientValues(line)){active=null;continue;}
  if(/^(?:알레르기|알러지|함유|같은 제조\s*시설|혼입|교차|반품|포장재질|내피|[*•]|World)/.test(line)||(/함유/.test(line)&&allergens(line).length&&active==='ingredients')){active=null;continue;}
  if(active&&['ingredients','nutrition','storage'].includes(active)){captured[active].push(line);fields[active].value+=' '+line;fields[active].evidence=captured[active].join('\n');}
 }
 const contained=[],precaution=[],containedEvidence=[],precautionEvidence=[];
 for(const line of lines)for(const segment of line.split(/[.;。]/).map(x=>x.trim()).filter(Boolean)){
  const aa=allergens(segment);if(!aa.length)continue;
  if(/같은\s*제조\s*시설|혼입\s*가능|교차.?오염|함께\s*사용|취급하는\s*시설/.test(segment)){
   precaution.push(...aa);precautionEvidence.push(line);continue;
  }
  const marker=/(함유|포함)/g;let match,last=0;
  while((match=marker.exec(segment))){const before=segment.slice(last,match.index);last=marker.lastIndex;if(/(?:미|무|불|되지\s*않|하지\s*않)\s*$/.test(before)||/^\s*(?:(?:되지|하지)\s*않|되어\s*있지\s*않)/.test(segment.slice(marker.lastIndex)))continue;const found=allergens(before);if(found.length){contained.push(...found);containedEvidence.push(line);}}
  if(active==='nutrition'&&recoveredNutrition&&!isNutrientValues(line)){active=null;continue;}
  if(/^(?:알레르기|알러지)\s*[:：]/.test(segment)&&!/(?:함유|포함)/.test(segment)){contained.push(...aa);containedEvidence.push(line);}
 }
 if(contained.length)fields.allergens_contained=field(uniq(contained).join(', '),uniq(containedEvidence).join('\n'),'EXTRACTED');
 if(precaution.length)fields.allergens_precaution=field(uniq(precaution).join(', '),uniq(precautionEvidence).join('\n'),'EXTRACTED');
 if(fields.expiry.status==='EXTRACTED'){
  const value=fields.expiry.value;
  const compact=value.match(/(?<!\d)(\d{4})(\d{2})(\d{2})(?!\d)/);
  const separated=value.match(/(?<!\d)(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})(?!\d)/);
  const exp=value.match(/EXP\s*(\d{1,2})\D+(\d{1,2})\D+(\d{4})/i);
  const parts=compact||separated;const year=parts?Number(parts[1]):exp?Number(exp[3]):null,month=parts?Number(parts[2]):exp?Number(exp[2]):null,day=parts?Number(parts[3]):exp?Number(exp[1]):null;
  if(year===null)fields.expiry.status='INSTRUCTION_ONLY';
  else {const date=new Date(Date.UTC(year,month-1,day));if(date.getUTCFullYear()!==year||date.getUTCMonth()+1!==month||date.getUTCDate()!==day)fields.expiry.status='INVALID_DATE';}
 }
 return {status:lines.length?'EXTRACTED_NEEDS_REVIEW':'UNREADABLE',fields,original};
}
export function makeLabelRecord({sku,filename,raw,reviewer,sourceMatched=false,synthetic=false,confirmed=false,now=new Date().toISOString()}){
 const parsed=parseLabelText(raw);
 if(confirmed&&!String(reviewer||'').trim())throw Error('확인자 이름을 입력하세요.');
  if(confirmed&&!sourceMatched)throw Error('원본 표시사항과 선택 SKU의 동일성을 먼저 확인하세요.');
 return {...parsed,sku:String(sku||'').trim(),filename:String(filename||'').trim(),extracted_at:now,reviewed_at:confirmed?now:'',reviewer:String(reviewer||'').trim(),source_matched:sourceMatched,status:confirmed?(synthetic?'SIMULATED_CONFIRMED':'HUMAN_CONFIRMED'):parsed.status};
}
