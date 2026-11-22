// 촌넷스코어 재구성판. 올담 ON과 같은 공공데이터 파일을 읽어 읍면별 접근 점수를 계산한다.
const $ = (id) => document.getElementById(id);
const NS = "http://www.w3.org/2000/svg";
const KM = 6371;
const rad = (d) => (d * Math.PI) / 180;
function distance(a, b) {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * KM * Math.asin(Math.sqrt(h));
}
const valid = (p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lng);
const grade = (s) => (s >= 80 ? ["양호", "good"] : s >= 60 ? ["보통", "fair"] : s >= 40 ? ["주의", "warn"] : ["취약", "bad"]);

export function diagnose(halls, wifi) {
  const towns = new Map();
  for (const hall of halls) {
    let best = Infinity, name = "";
    for (const w of wifi) { const d = distance(hall, w); if (d < best) { best = d; name = w.name; } }
    const row = { ...hall, km: best, nearest: name };
    if (!towns.has(hall.town)) towns.set(hall.town, []);
    towns.get(hall.town).push(row);
  }
  return [...towns].map(([town, rows]) => {
    const within = rows.filter((r) => r.km <= 0.5).length / rows.length;
    const avg = rows.reduce((s, r) => s + r.km, 0) / rows.length;
    const score = Math.round(50 * within + 50 * Math.max(0, 1 - avg / 3));
    return { town, rows, within, avg, max: Math.max(...rows.map((r) => r.km)), score };
  }).sort((a, b) => a.score - b.score);
}

function el(tag, text, cls) { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (cls) e.className = cls; return e; }

function showTown(t, wifi, buttons) {
  for (const b of buttons) b.setAttribute("aria-pressed", String(b.dataset.town === t.town));
  $("townTitle").textContent = `${t.town} 진단`;
  $("score").textContent = t.score;
  const [label, cls] = grade(t.score);
  $("grade").textContent = label;
  $("grade").className = `grade grade--${cls}`;
  const values = $("values");
  values.replaceChildren();
  for (const [k, v] of [["마을회관", `${t.rows.length}곳`], ["500m 안에 Wi-Fi 있음", `${Math.round(t.within * 100)}%`], ["평균 최단거리", `${t.avg.toFixed(2)}km`], ["가장 먼 곳", `${t.max.toFixed(2)}km`]]) {
    const row = el("div"); row.append(el("dt", k), el("dd", v)); values.append(row);
  }
  // 지도: 읍면의 마을회관과 그 둘레의 Wi-Fi만 그린다(배경 지도 없음).
  const pts = t.rows;
  const lat = pts.map((p) => p.lat), lng = pts.map((p) => p.lng);
  const pad = 0.03;
  const box = { s: Math.min(...lat) - pad, n: Math.max(...lat) + pad, w: Math.min(...lng) - pad, e: Math.max(...lng) + pad };
  const X = (v) => ((v - box.w) / (box.e - box.w)) * 380 + 10, Y = (v) => (1 - (v - box.s) / (box.n - box.s)) * 280 + 10;
  const map = $("map");
  map.replaceChildren();
  for (const w of wifi) {
    if (w.lat < box.s || w.lat > box.n || w.lng < box.w || w.lng > box.e) continue;
    const r = document.createElementNS(NS, "rect");
    r.setAttribute("x", X(w.lng) - 5); r.setAttribute("y", Y(w.lat) - 5); r.setAttribute("width", 10); r.setAttribute("height", 10); r.setAttribute("class", "wifi");
    map.append(r);
  }
  for (const p of pts) {
    const c = document.createElementNS(NS, "circle");
    c.setAttribute("cx", X(p.lng)); c.setAttribute("cy", Y(p.lat)); c.setAttribute("r", 6);
    c.setAttribute("class", p.km > 1 ? "far" : p.km > 0.5 ? "mid" : "near");
    const title = document.createElementNS(NS, "title"); title.textContent = `${p.name}, ${p.km.toFixed(2)}km`;
    c.append(title); map.append(c);
  }
  const far = $("far");
  far.replaceChildren();
  for (const p of [...pts].sort((a, b) => b.km - a.km).slice(0, 3)) { const li = el("li"); li.append(el("strong", p.name), el("span", `가장 가까운 Wi-Fi는 ${p.nearest}, ${p.km.toFixed(2)}km`)); far.append(li); }
}

async function start() {
  let data;
  try {
    const response = await fetch("../oldam-on/data/processed/oldam_on_dataset.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
  } catch {
    $("state").textContent = "자료를 불러오지 못했습니다. 새로 고침해 보세요.";
    return;
  }
  const wifi = (data.wifi || []).filter(valid);
  const halls = (data.demand || []).filter((d) => valid(d) && d.type === "마을회관" && d.town);
  if (!wifi.length || !halls.length) { $("state").textContent = "계산할 자료가 없습니다."; return; }
  const towns = diagnose(halls, wifi);
  const rank = $("rank");
  const buttons = [];
  for (const t of towns) {
    const li = el("li");
    const b = el("button"); b.type = "button"; b.dataset.town = t.town;
    const [label, cls] = grade(t.score);
    const bar = el("span", undefined, `bar bar--${cls}`); bar.style.width = `${Math.max(4, t.score)}%`;
    b.append(el("strong", t.town), el("span", `${t.score}점, ${label}`, "num"), bar);
    b.addEventListener("click", () => showTown(t, wifi, buttons));
    buttons.push(b); li.append(b); rank.append(li);
  }
  const cities = (data.summary?.wifi_by_city || []).filter(([name]) => /[시군]$/.test(name));
  const top = Math.max(...cities.map(([, n]) => n));
  for (const [name, n] of cities) { const li = el("li"); const bar = el("span", undefined, "bar"); bar.style.width = `${(n / top) * 100}%`; li.append(el("strong", name), el("span", `${n}곳`, "num"), bar); $("bars").append(li); }
  $("state").hidden = true; $("main").hidden = false; $("cities").hidden = false;
  showTown(towns[0], wifi, buttons);
}
start();
