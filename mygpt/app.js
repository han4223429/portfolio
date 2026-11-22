// my-gpt의 tools.rules_lint(규정 문서 기계 점검)를 그대로 옮긴 것. 모델을 쓰지 않는다.
const VAGUE = ["가능하면", "가급적", "원칙적으로", "필요한 경우", "필요시", "적절히", "적절한", "상당한", "등을", "기타", "되도록", "노력한다", "할 수도 있다"];
const SAMPLE = [
  "제1조(목적) 이 회칙은 총학생회를 정한다.",
  "제2조(회원) 재학생은 회원이 된다.",
  "제4조(총회) ① 총회는 매 학기 1회 개최하여야 하며, 필요한 경우 임시총회를 소집할 수 있다. ② 총회의 의결은 제9조에 따른다.",
  "제5조(임원) 회장은 가급적 경험자로 한다.",
  "제5조(감사) 감사는 회계를 감사한다.",
  "제6조(준용) 민법 제32조를 준용한다.",
].join("\n");

export function rulesLint(text) {
  const out = [];
  const arts = [...text.matchAll(/^\s*제\s*(\d+)\s*조(?:\s*의\s*(\d+))?\s*[(（]/gm)].map((m) => ({ start: m.index, n: Number(m[1]), b: Number(m[2] || 0) }));
  const key = (n, b) => `${n}:${b}`;
  const counts = new Map();
  for (const a of arts) counts.set(key(a.n, a.b), (counts.get(key(a.n, a.b)) || 0) + 1);
  for (const [k, count] of counts) {
    if (count > 1) { const [n, b] = k.split(":").map(Number); out.push(["번호 중복", `제${n}조${b ? `의${b}` : ""}`, "같은 조 번호가 두 번 이상 나옴"]); }
  }
  const mains = [...new Set(arts.filter((a) => a.b === 0).map((a) => a.n))].sort((x, y) => x - y);
  const missing = [];
  for (let i = 0; i + 1 < mains.length && missing.length < 10; i += 1) {
    const [left, right] = [mains[i], mains[i + 1]];
    if (right > left + 1) for (let x = left + 1; x < Math.min(right, left + 11); x += 1) missing.push(x);
  }
  if (missing.length) out.push(["번호 빠짐", missing.slice(0, 10).map((x) => `제${x}조`).join(", "), "중간 조 번호가 비어 있음 (삭제된 조라면 ‘제N조 삭제’로 남기는 것이 일반적)"]);
  const defined = new Set(arts.map((a) => key(a.n, a.b)));
  const heads = arts.map((a) => a.start);
  for (const m of text.matchAll(/제\s*(\d+)\s*조(?:\s*의\s*(\d+))?/g)) {
    if (heads.some((h) => Math.abs(m.index - h) < 3)) continue;
    const before = text.slice(Math.max(0, m.index - 15), m.index);
    if (/(법|령|규칙|헌법|법률)\s*$/.test(before)) continue; // 다른 법령 조문 참조는 제외
    if (!defined.has(key(Number(m[1]), Number(m[2] || 0)))) out.push(["없는 조 참조", m[0], "문서 안에 없는 조문을 참조함"]);
  }
  for (const sent of text.split(/(?<=다\.)\s*|\n+/)) {
    const s = sent.trim();
    if (!s) continue;
    const loc = s.slice(0, 25) + (s.length > 25 ? "…" : "");
    const found = VAGUE.filter((v) => s.includes(v));
    if (found.length) out.push(["모호한 표현", loc, `${found.join(", ")}: 기준, 주체, 기한을 구체적으로`]);
    if (/(하여야|해야)\s*(한다|하며|하고|하나|하되)/.test(s) && /할\s*수\s*있/.test(s)) out.push(["의무·재량 혼재", loc, "한 문장에 ‘~하여야 한다’(의무)와 ‘~할 수 있다’(재량)가 섞임. 항을 나눠 구분"]);
  }
  const seen = new Set();
  return out.filter((row) => { const k = row.join("|"); if (seen.has(k)) return false; seen.add(k); return true; });
}

const $ = (id) => document.getElementById(id);
function render() {
  const text = $("draft").value;
  const list = $("result");
  if (!text.trim()) { list.innerHTML = ""; const li = document.createElement("li"); li.className = "empty"; li.textContent = "점검할 글이 없습니다. 회칙을 붙여 넣거나 ‘예시 다시 넣기’를 눌러 주세요."; list.append(li); $("count").textContent = ""; return; }
  const rows = rulesLint(text);
  list.innerHTML = "";
  $("count").textContent = `${rows.length}건`;
  if (!rows.length) { const li = document.createElement("li"); li.className = "empty"; li.textContent = "이 규칙으로 찾은 문제가 없습니다. 내용이 옳다는 뜻은 아닙니다."; list.append(li); return; }
  for (const [kind, where, why] of rows) {
    const li = document.createElement("li");
    const k = document.createElement("strong"); k.textContent = kind;
    const w = document.createElement("span"); w.className = "where"; w.textContent = where;
    const y = document.createElement("span"); y.textContent = why;
    li.append(k, w, y);
    list.append(li);
  }
}
$("draft").value = SAMPLE;
$("run").addEventListener("click", render);
$("sample").addEventListener("click", () => { $("draft").value = SAMPLE; render(); });
$("clear").addEventListener("click", () => { $("draft").value = ""; render(); $("draft").focus(); });
