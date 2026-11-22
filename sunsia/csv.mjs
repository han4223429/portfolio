export function parseCSV(raw){
  const text=String(raw).replace(/^\uFEFF/,'');let rows=[],row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++;}else if(c==='"')quoted=false;else field+=c;}
    else if(c==='"'){if(field)throw Error('CSV 따옴표 위치 오류');quoted=true;}
    else if(c===','){row.push(field);field='';}
    else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(x=>x!==''))rows.push(row);row=[];field='';}
    else field+=c;
  }
  if(quoted)throw Error('CSV 따옴표가 닫히지 않았습니다.');
  row.push(field);if(row.some(x=>x!==''))rows.push(row);
  if(!rows.length)throw Error('CSV가 비었습니다.');
  const headers=rows.shift();if(new Set(headers).size!==headers.length||headers.some(x=>!x))throw Error('CSV 열 이름이 비었거나 중복됐습니다.');
  return rows.map((r,index)=>{if(r.length!==headers.length)throw Error(`${index+2}행의 열 수가 다릅니다.`);return Object.fromEntries(headers.map((h,j)=>[h,r[j]]));});
}
export function csvCell(value){
  let s=String(value??'');
  if(/^\s*[=+\-@\t\r]/.test(s))s="'"+s;
  return `"${s.replaceAll('"','""')}"`;
}
export function toCSV(headers,rows){return '\uFEFF'+[headers,...rows.map(r=>headers.map(h=>r[h]??''))].map(r=>r.map(csvCell).join(',')).join('\r\n')+'\r\n';}
export function catalogFromCSVs(files){
  const required=['메뉴.csv','원재료.csv','후보표.csv'];for(const n of required)if(!files[n])throw Error(`${n} 파일이 필요합니다.`);
  const menus=parseCSV(files['메뉴.csv']), ingredients=parseCSV(files['원재료.csv']),candidates=parseCSV(files['후보표.csv']);
  if(!menus.length||!ingredients.length)throw Error('메뉴와 원재료 데이터가 최소 1행씩 필요합니다.');
  const need=(rows,keys,name)=>{for(const k of keys)if(rows.length&&!Object.hasOwn(rows[0],k))throw Error(`${name}: ${k} 열이 없습니다.`);};
  need(menus,['menu_id','menu_name'],'메뉴');need(ingredients,['menu_id','ingredient_id','grams_per_serving','pack_size_g','baseline_pack_price_krw','culinary_use'],'원재료');need(candidates,['menu_id','original_ingredient_id','candidate_ingredient_id','conversion_ratio','pack_size_g','baseline_pack_price_krw','review_status','culinary_use'],'후보표');
  const n=v=>v===''?NaN:Number(v);
  for(const m of menus)m.servings=n(m.servings||'500');
  for(const i of ingredients){for(const k of ['grams_per_serving','pack_size_g','baseline_pack_price_krw'])i[k]=n(i[k]);i.is_primary=String(i.is_primary).toLowerCase()==='true'||i.is_primary==='1';}
  for(const c of candidates)for(const k of ['conversion_ratio','pack_size_g','baseline_pack_price_krw'])c[k]=n(c[k]);
  return {menus,ingredients,candidates,forbidden_ingredients:[]};
}
