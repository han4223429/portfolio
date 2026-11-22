// 김한용 포트폴리오: 메뉴 현재 위치, 경통넷 시연 불러오기, 콘텐츠 목록과 크게 보기, 메일 복사.
// 빌드 없이 그대로 실행되는 ES 모듈이다.

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const PAGE_SIZE = 6;
const INSTAGRAM = /^https:\/\/www\.instagram\.com\/(p|reel)\/[\w-]+\/$/;

/* ---------- 메뉴와 차례: 지금 보고 있는 구간 표시 ---------- */
const WORKS = ["gyeongtongnet", "rescue", "oldam", "nettwin", "sunsia", "content"];
function watchSections() {
  const links = $$(".top__nav a");
  const tocLinks = $$(".toc a");
  const toc = $(".toc");
  const groups = { work: ["wiring", "work", "gyeongtongnet", "rescue", "oldam", "nettwin", "sunsia"], content: ["content"], about: ["about"], activity: ["activity"], contact: ["contact"] };
  const owner = new Map(Object.entries(groups).flatMap(([menu, ids]) => ids.map((id) => [id, menu])));
  const visible = new Set();
  const root = document.documentElement;
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) entry.isIntersecting ? visible.add(entry.target.id) : visible.delete(entry.target.id);
    const order = [...owner.keys()].filter((id) => visible.has(id));
    const id = order[0] ?? null;
    const current = id ? owner.get(id) : null;
    for (const link of links) {
      if (link.hash === `#${current}`) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    }
    // 차례 바는 작업 구간 안에서만 보인다.
    const inWork = WORKS.includes(id);
    root.dataset.toc = inWork ? "on" : "off";
    if (id) root.dataset.section = id; else delete root.dataset.section;
    for (const link of tocLinks) {
      const on = link.hash === `#${id}`;
      if (on) {
        link.setAttribute("aria-current", "true");
        toc.scrollTo({ left: link.offsetLeft - toc.clientWidth / 2 + link.offsetWidth / 2 });
      } else link.removeAttribute("aria-current");
      link.tabIndex = inWork ? 0 : -1;
    }
  }, { rootMargin: "-45% 0px -50% 0px" });
  for (const id of owner.keys()) { const el = document.getElementById(id); if (el) observer.observe(el); }
}

/* ---------- 차례: 줄에 올리면 그 작업의 화면이 따라온다(마우스가 있을 때만) ---------- */
function setupPeek() {
  const peek = $("#peek");
  const list = $(".index");
  if (!peek || !list || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  peek.hidden = false;
  let x = 0, y = 0, queued = false;
  const place = () => { queued = false; peek.style.translate = `${x + 24}px ${y - 80}px`; };
  list.addEventListener("pointermove", (event) => {
    x = Math.min(event.clientX, innerWidth - 300);
    y = event.clientY;
    if (!queued) { queued = true; requestAnimationFrame(place); }
  });
  for (const row of $$(".index__row", list)) {
    row.addEventListener("pointerenter", () => {
      if (!row.dataset.peek) { peek.classList.remove("is-on"); return; }
      peek.src = row.dataset.peek;
      peek.classList.add("is-on");
    });
  }
  list.addEventListener("pointerleave", () => peek.classList.remove("is-on"));
}

/* ---------- 상 도장: 화면에 들어올 때 한 번 찍힌다 ---------- */
function setupStamps() {
  document.documentElement.classList.add("js");
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-in");
      observer.unobserve(entry.target);
    }
  }, { rootMargin: "0px 0px -20% 0px" });
  for (const stamp of $$(".stamp")) observer.observe(stamp);
}

/* ---------- 배선도: 노드를 고르면 위아래로 이어진 선만 남긴다 ---------- */
function setupWiring() {
  const board = $("[data-wiring]");
  if (!board) return;
  const svg = $(".wiring__lines", board);
  const nodes = new Map($$(".node", board).map((el) => [el.dataset.id, el]));
  const edges = [];
  for (const [id, el] of nodes) for (const to of (el.dataset.to || "").split(" ").filter(Boolean)) if (nodes.has(to)) edges.push({ from: id, to });
  const NS = "http://www.w3.org/2000/svg";
  for (const edge of edges) { edge.path = document.createElementNS(NS, "path"); svg.append(edge.path); }

  // 회로도처럼 직각으로 꺾는다. 꺾이는 자리는 선마다 조금씩 달리해 겹치지 않게 한다.
  const draw = () => {
    const box = board.getBoundingClientRect();
    svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
    const lanes = new Map();
    edges.forEach((edge) => {
      const a = nodes.get(edge.from).getBoundingClientRect();
      const b = nodes.get(edge.to).getBoundingClientRect();
      const side = b.left >= a.right - 1;
      const key = nodes.get(edge.from).parentElement === board.children[1] ? "first" : "second";
      const lane = lanes.get(key) || 0;
      lanes.set(key, lane + 1);
      const total = edges.filter((e) => (nodes.get(e.from).parentElement === board.children[1] ? "first" : "second") === key).length;
      const t = (lane + 1) / (total + 1);
      if (side) {
        const x1 = a.right - box.left, y1 = a.top + a.height / 2 - box.top, x2 = b.left - box.left, y2 = b.top + b.height / 2 - box.top;
        const mid = x1 + (x2 - x1) * t;
        edge.path.setAttribute("d", `M${x1} ${y1}H${mid}V${y2}H${x2}`);
      } else {
        // 좁은 화면: 왼쪽 여백을 배선 통로로 쓴다. 선이 노드를 가로지르지 않는다.
        const x1 = a.left - box.left, y1 = a.top + a.height / 2 - box.top, x2 = b.left - box.left, y2 = b.top + b.height / 2 - box.top;
        const lane = 4 + (Math.min(x1, x2) - 12) * t;
        edge.path.setAttribute("d", `M${x1} ${y1}H${lane}V${y2}H${x2}`);
      }
    });
  };

  const reach = (start, dir) => {
    const seen = new Set([start]);
    const queue = [start];
    while (queue.length) {
      const id = queue.pop();
      for (const edge of edges) {
        const next = dir === "down" && edge.from === id ? edge.to : dir === "up" && edge.to === id ? edge.from : null;
        if (next && !seen.has(next)) { seen.add(next); queue.push(next); }
      }
    }
    return seen;
  };
  let picked = null;
  const show = (id) => {
    const down = id ? reach(id, "down") : new Set();
    const up = id ? reach(id, "up") : new Set();
    for (const [key, el] of nodes) {
      const on = down.has(key) || up.has(key);
      el.classList.toggle("is-on", Boolean(id) && on);
      el.classList.toggle("is-off", Boolean(id) && !on);
      if (el.tagName === "BUTTON") el.setAttribute("aria-pressed", String(key === picked));
    }
    for (const edge of edges) {
      const on = Boolean(id) && ((down.has(edge.from) && down.has(edge.to)) || (up.has(edge.from) && up.has(edge.to)));
      edge.path.classList.toggle("is-on", on);
      if (on) edge.path.style.setProperty("--c", getComputedStyle(nodes.get(edge.to)).getPropertyValue("--c"));
    }
  };
  for (const [id, el] of nodes) {
    // 읽어 주는 이름에 이어진 곳을 함께 적는다.
    const names = [...reach(id, "down"), ...reach(id, "up")].filter((key) => key !== id).map((key) => nodes.get(key).firstChild.textContent.trim());
    el.setAttribute("aria-label", `${el.textContent.trim()}. 이어진 곳: ${names.join(", ")}`);
    el.addEventListener("pointerenter", () => show(id));
    el.addEventListener("focus", () => show(id));
    el.addEventListener("pointerleave", () => show(picked));
    el.addEventListener("blur", () => show(picked));
    if (el.tagName === "BUTTON") el.addEventListener("click", () => { picked = picked === id ? null : id; show(picked); });
  }
  new ResizeObserver(draw).observe(board);
  document.fonts?.ready.then(draw);
  draw();
  picked = "gdm";
  show(picked);
}

/* ---------- 방문 수와 아산 시각 ---------- */
// 방문 수는 외부 카운터(abacus)에 숫자만 올린다. 같은 브라우저는 하루에 한 번만 센다. 응답이 없으면 표시를 비워 둔다.
async function setupLive() {
  const today = $("#visitToday");
  const total = $("#visitTotal");
  const clock = $("#clockAsan");
  if (!today || !total || !clock) return;
  const time = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false });
  const tick = () => { clock.textContent = time.format(new Date()); };
  tick();
  setInterval(tick, 20000);

  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  const local = ["localhost", "127.0.0.1"].includes(location.hostname);
  const space = local ? "pf-kr-9x4t2q-dev" : "pf-kr-9x4t2q";
  let counted = false;
  try { counted = localStorage.getItem("visit-day") === day; } catch { /* 저장을 못 쓰면 매번 조회만 한다 */ counted = true; }
  const ask = async (key, hit) => {
    const response = await fetch(`https://abacus.jasoncameron.dev/${hit ? "hit" : "get"}/${space}/${key}`, { signal: AbortSignal.timeout(5000) });
    if (response.status === 404) return 0;
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const value = Number((await response.json()).value);
    if (!Number.isFinite(value)) throw new Error("값이 숫자가 아닙니다");
    return value;
  };
  const number = new Intl.NumberFormat("ko-KR");
  try {
    const [a, b] = await Promise.all([ask(`d-${day}`, !counted), ask("total", !counted)]);
    today.textContent = number.format(a);
    total.textContent = number.format(b);
    if (!counted) { try { localStorage.setItem("visit-day", day); } catch { /* 무시 */ } }
  } catch {
    today.textContent = "–";
    total.textContent = "–";
    $("#live").title = "방문 수를 불러오지 못했습니다";
  }
}

/* ---------- 시연: 눌렀을 때만 앱을 불러온다 ---------- */
function setupDemo(demo) {
  const screen = $(".demo__screen", demo);
  const start = $(".demo__start", demo);
  start.addEventListener("click", () => {
    const frame = document.createElement("iframe");
    frame.title = demo.dataset.title || "경통넷 앱 시연";
    frame.src = demo.dataset.src;
    frame.addEventListener("error", () => { screen.replaceChildren(message("앱을 불러오지 못했습니다. 아래 링크로 새 창에서 열어 주세요.")); });
    const loading = document.createElement("p");
    loading.className = "demo__loading";
    loading.setAttribute("role", "status");
    loading.textContent = "불러오는 중";
    frame.addEventListener("load", () => loading.remove(), { once: true });
    screen.replaceChildren(frame, loading);
    demo.classList.add("is-live");
    frame.focus();
  }, { once: true });
}

/* ---------- 콘텐츠 목록 ---------- */
const state = { all: [], filter: "all", page: 0, viewing: -1 };

function label(item) {
  if (item.collection === "kalibrr") return { kind: "Kalibrr 참여 릴스", date: item.date.replace(" / ", "/") };
  return { kind: item.type === "reel" ? "릴스" : "카드뉴스", date: item.date };
}
const filtered = () => state.all.filter((item) => state.filter === "all" || (state.filter === "kalibrr" ? item.collection === "kalibrr" : item.type === state.filter));

function message(text) {
  const p = document.createElement("p");
  p.className = "posts__state";
  p.textContent = text;
  return p;
}

function embed(item, title) {
  const frame = document.createElement("iframe");
  frame.src = `${item.url}embed/`;
  frame.title = title;
  frame.loading = "lazy";
  frame.allowFullscreen = true;
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  return frame;
}

function renderPosts() {
  const list = filtered();
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  state.page = Math.min(state.page, pages - 1);
  const shown = list.slice(state.page * PAGE_SIZE, (state.page + 1) * PAGE_SIZE);
  const box = $("#posts");
  if (!shown.length) box.replaceChildren(message("이 종류의 콘텐츠가 아직 없습니다. 다른 종류를 골라 보세요."));
  else box.replaceChildren(...shown.map((item) => {
    const { kind, date } = label(item);
    const card = document.createElement("article");
    card.className = "post";
    const frameBox = document.createElement("div");
    frameBox.className = "post__frame";
    frameBox.append(embed(item, `${kind} ${date} 미리보기`));
    const meta = document.createElement("div");
    meta.className = "post__meta";
    const strong = document.createElement("strong");
    strong.textContent = kind;
    const when = document.createElement("span");
    when.textContent = date;
    const open = document.createElement("button");
    open.type = "button";
    open.textContent = "크게 보기";
    open.setAttribute("aria-label", `${kind} ${date} 크게 보기`);
    open.addEventListener("click", () => openViewer(list.indexOf(item)));
    const link = document.createElement("a");
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Instagram에서 보기";
    meta.append(strong, when, open, link);
    card.append(frameBox, meta);
    return card;
  }));
  $("#pageInfo").textContent = `${state.page + 1} / ${pages}쪽, 모두 ${list.length}편`;
  $("#prevPage").disabled = state.page === 0;
  $("#nextPage").disabled = state.page >= pages - 1;
}

function openViewer(index) {
  const list = filtered();
  const item = list[index];
  if (!item) return;
  state.viewing = index;
  const { kind, date } = label(item);
  $("#viewerTitle").textContent = `${kind} ${date} (${index + 1}/${list.length})`;
  $("#viewerFrame").replaceChildren(embed(item, `${kind} ${date}`));
  $("#viewerLink").href = item.url;
  $("#viewerPrev").disabled = index === 0;
  $("#viewerNext").disabled = index === list.length - 1;
  const dialog = $("#viewer");
  if (!dialog.open) dialog.showModal();
}

async function setupContent() {
  const box = $("#posts");
  try {
    const response = await fetch("data/content.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    // 주소 형식이 맞는 항목만 쓴다(iframe 주소로 들어가므로).
    state.all = Array.isArray(data) ? data.filter((item) => item && INSTAGRAM.test(item.url) && ["reel", "card"].includes(item.type)) : [];
  } catch {
    box.replaceChildren(message("콘텐츠 목록을 불러오지 못했습니다. 새로 고침해 보시고, 계속 안 되면 Instagram에서 직접 확인해 주세요."));
    for (const button of $$(".filters button, .pager button")) button.disabled = true;
    return;
  }
  // 버튼의 숫자는 실제 목록에서 센다(목록을 고쳐도 어긋나지 않게).
  const count = (key) => state.all.filter((item) => key === "all" || (key === "kalibrr" ? item.collection === "kalibrr" : item.type === key)).length;
  for (const button of $$(".filters button")) {
    const badge = $("span", button);
    if (badge) badge.textContent = count(button.dataset.filter);
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      state.page = 0;
      for (const other of $$(".filters button")) other.setAttribute("aria-pressed", String(other === button));
      renderPosts();
    });
  }
  const turn = (step) => { state.page += step; renderPosts(); $("#content .filters").scrollIntoView({ block: "start" }); };
  $("#prevPage").addEventListener("click", () => turn(-1));
  $("#nextPage").addEventListener("click", () => turn(1));

  const dialog = $("#viewer");
  $("#viewerClose").addEventListener("click", () => dialog.close());
  $("#viewerPrev").addEventListener("click", () => openViewer(state.viewing - 1));
  $("#viewerNext").addEventListener("click", () => openViewer(state.viewing + 1));
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener("close", () => { $("#viewerFrame").replaceChildren(); state.viewing = -1; });
  renderPosts();
}

/* ---------- 메일 주소 복사 ---------- */
function setupCopy() {
  const button = $("#copyMail");
  const status = $("#copyState");
  if (!button) return;
  let timer;
  button.addEventListener("click", async () => {
    const address = $(".contact__mail a").textContent.trim();
    try {
      await navigator.clipboard.writeText(address);
      status.textContent = "복사했습니다.";
    } catch {
      status.textContent = "복사하지 못했습니다. 주소를 길게 눌러 직접 복사해 주세요.";
    }
    clearTimeout(timer);
    timer = setTimeout(() => { status.textContent = ""; }, 4000);
  });
}

// 로딩 화면은 CSS만으로 사라지지만, 움직임이 멈춘 환경에서도 남지 않게 한 번 더 치운다.
if (!document.documentElement.classList.contains("seen")) document.documentElement.classList.add("booted");
setTimeout(() => document.documentElement.classList.add("seen"), 1800);
watchSections();
setupPeek();
setupWiring();
setupLive();
setupStamps();
$$("[data-demo]").forEach(setupDemo);
setupCopy();
setupContent();
