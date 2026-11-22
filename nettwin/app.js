// NetTwin 관제 시뮬레이터(웹 시연판).
// 엣지, 통신 구간, 관제를 한 페이지 안에서 흉내 낸다. 실제 브로커나 장치에는 연결하지 않는다.

const $ = (id) => document.getElementById(id);

// 판정 설정: 로컬 장애 시험(sim_fault)에 쓴 값. stableMs, ttlMs, holdMs는 이 시연에서 정한 값이다.
const CFG = {
  tickMs: 100,        // 10Hz 발행, 같은 주기로 판정
  windowMs: 2000,     // 손실·지연을 보는 구간
  warnLoss: 0.05, limitLoss: 0.15,
  warnDelay: 200, limitDelay: 500,
  lostMs: 3000,       // 유효 수신이 없으면 끊김
  stableMs: 3000,     // 재연결 뒤 승인 전에 기다리는 안정 구간
  ttlMs: 2000,        // 명령 유효기간
  holdMs: 1000,       // 더 나은 상태로 내려갈 때 이만큼 유지돼야 바꾼다(경계에서 깜빡이지 않게)
  baseDelay: 20,      // 정상일 때의 구간 지연
  logMax: 60,
};

const FAULTS = {
  none: { delay: 0, loss: 0, cut: false, text: "정상", hint: "통신이 정상입니다. 다른 버튼을 눌러 장애를 넣어 보세요." },
  delay: { delay: 600, loss: 0, cut: false, text: "지연 600ms", hint: "모든 메시지가 600ms 늦게 도착합니다. 지연이 500ms를 넘으면 위험 제어가 잠깁니다." },
  loss: { delay: 0, loss: 0.25, cut: false, text: "손실 25%", hint: "메시지 넷 중 하나가 사라집니다. 손실이 15%를 넘으면 위험 제어가 잠깁니다." },
  cut: { delay: 0, loss: 0, cut: true, text: "단절", hint: "아무 메시지도 오가지 않습니다. 3초 뒤 관제는 끊김으로, 엣지는 안전모드로 바뀝니다." },
};

const STATE_TEXT = { NORMAL: "정상", WARN: "주의", LIMIT: "제한", LOST: "끊김" };
const REJECT_TEXT = { duplicate: "이미 처리한 명령(중복)", expired: "유효기간이 지난 명령", safe_mode: "엣지가 안전모드", wrong_device: "다른 장치의 명령" };

const start = performance.now();
const now = () => performance.now() - start;

let fault = "none";
const queue = [];          // 통신 구간을 지나는 중인 메시지
const edge = { id: "edge-01", seq: 0, lamp: false, safe: false, linkDownAt: null, seen: new Set(), values: null };
const SEVERITY = { NORMAL: 0, WARN: 1, LIMIT: 2, LOST: 3 };
const ctrl = { betterSince: null, received: [], last: null, lastAt: null, state: "NORMAL", needApproval: false, stableAt: 0, lastCmd: null, cmdCount: 0, pending: new Map() };

/* ---------- 기록 ---------- */
function log(text, kind = "info") {
  const list = $("log");
  list.querySelector(".log__empty")?.remove();
  const item = document.createElement("li");
  item.dataset.kind = kind;
  const time = document.createElement("time");
  time.textContent = `${(now() / 1000).toFixed(1)}초`;
  const body = document.createElement("span");
  body.textContent = text;
  item.append(time, body);
  list.prepend(item);
  while (list.children.length > CFG.logMax) list.lastElementChild.remove();
}

/* ---------- 통신 구간 ---------- */
const dots = [];           // 선 위에 그릴 점(그림 전용, 판정에는 쓰지 않는다)
function send(to, message) {
  const f = FAULTS[fault];
  const dropped = f.cut || Math.random() < f.loss;
  if (!f.cut) dots.push({ t0: now(), dur: 700 + f.delay, back: to === "edge", dropped, big: message.kind !== "telemetry" });
  if (dropped) return false;
  queue.push({ at: now() + CFG.baseDelay + f.delay + Math.random() * 10, to, message });
  return true;
}

/* ---------- 엣지 ---------- */
// 원본 edge_simulator.py의 수식. 원본은 1초에 한 번 발행하므로 10Hz에서는 순번을 10으로 나눠 같은 속도로 움직이게 했다.
function telemetry() {
  const s = edge.seq / 10;
  return {
    device_id: edge.id,
    timestamp: now(),
    sequence: edge.seq,
    imu: { pitch: +(12 * Math.sin(s / 4)).toFixed(2), roll: +(6 * Math.cos(s / 5)).toFixed(2) },
    distance: +(55 + 10 * Math.sin(s / 3)).toFixed(2),
    temp: +(24.5 + 1.5 * Math.sin(s / 10)).toFixed(2),
    lamp: edge.lamp,
    mode: edge.safe ? "safe" : "remote",
  };
}

function edgeTick() {
  // 로컬 규칙: 브로커 연결이 3초 넘게 끊기면 출력을 끄고 안전모드로 간다.
  if (FAULTS[fault].cut) {
    edge.linkDownAt ??= now();
    if (!edge.safe && now() - edge.linkDownAt >= CFG.lostMs) {
      edge.safe = true;
      edge.lamp = false;
      log("엣지: 3초 동안 연결이 없어 안전모드로 전환, 경광등 출력을 껐습니다.", "bad");
    }
  } else {
    edge.linkDownAt = null;
  }
  edge.values = telemetry();
  send("ctrl", { kind: "telemetry", ...edge.values });
  edge.seq += 1;
}

function edgeReceive(command) {
  const ack = (result, reason = "") => send("ctrl", { kind: "ack", device_id: edge.id, command_id: command.command_id, result, reason });
  if (command.device_id !== edge.id) return ack("rejected", "wrong_device");
  if (edge.seen.has(command.command_id)) return ack("rejected", "duplicate");
  if (now() > command.expires_at) return ack("rejected", "expired");
  if (command.action === "restore") {
    edge.seen.add(command.command_id);
    edge.safe = false;
    return ack("ok");
  }
  if (edge.safe) return ack("rejected", "safe_mode");
  edge.seen.add(command.command_id);
  edge.lamp = command.action === "lamp_on";
  return ack("ok");
}

/* ---------- 관제 ---------- */
function ctrlReceive(message, arrivedAt) {
  if (message.device_id !== edge.id) return;
  if (message.kind === "telemetry") {
    if (ctrl.last && message.sequence <= ctrl.last.sequence) return; // 늦게 온 옛 값은 화면에 쓰지 않는다
    ctrl.last = message;
    ctrl.lastAt = now();
    ctrl.received.push({ at: now(), delay: arrivedAt - message.timestamp, seq: message.sequence });
    return;
  }
  const sent = ctrl.pending.get(message.command_id);
  ctrl.pending.delete(message.command_id);
  const took = sent ? ` (${Math.round(now() - sent.at)}ms)` : "";
  if (message.result === "ok" && sent?.action === "restore") {
    ctrl.needApproval = false;
    log(`ACK ok: ${message.command_id}, 엣지가 안전모드를 풀었습니다. 제어권을 복원합니다${took}`, "good");
  } else if (message.result === "ok") log(`ACK ok: ${message.command_id} 실행됨${took}`, "good");
  else log(`ACK 거부: ${message.command_id}, ${REJECT_TEXT[message.reason] ?? message.reason}. 실행하지 않았습니다.`, "warn");
}

function measure() {
  const t = now();
  ctrl.received = ctrl.received.filter((r) => t - r.at <= CFG.windowMs);
  const list = ctrl.received;
  const since = ctrl.lastAt === null ? 0 : t - ctrl.lastAt;
  if (!list.length) return { since, loss: null, delay: null };
  const span = list.at(-1).seq - list[0].seq + 1;
  const loss = span > 1 ? 1 - list.length / span : 0;
  const delay = list.reduce((sum, r) => sum + r.delay, 0) / list.length;
  return { since, loss, delay };
}

function judge(m) {
  if (m.since >= CFG.lostMs) return ["LOST", "3초 넘게 유효한 수신이 없습니다. 화면의 값은 마지막으로 받은 값입니다."];
  if (m.loss === null) return [ctrl.state, "수신이 멈췄습니다. 3초가 되면 끊김으로 판정합니다."];
  if (m.loss >= CFG.limitLoss) return ["LIMIT", "손실이 15% 이상입니다. 위험 제어를 잠급니다."];
  if (m.delay >= CFG.limitDelay) return ["LIMIT", "지연이 500ms 이상입니다. 위험 제어를 잠급니다."];
  if (m.loss >= CFG.warnLoss) return ["WARN", "손실이 5% 이상입니다. 제어는 되지만 경고를 띄웁니다."];
  if (m.delay >= CFG.warnDelay) return ["WARN", "지연이 200ms 이상입니다. 제어는 되지만 경고를 띄웁니다."];
  return ["NORMAL", "손실과 지연이 기준 안쪽입니다."];
}

function authority() {
  if (ctrl.state === "LOST" || ctrl.state === "LIMIT") return { level: "locked", text: "잠금" };
  if (!ctrl.needApproval) return { level: "ok", text: "허용" };
  if (ctrl.state !== "NORMAL") return { level: "wait", text: "잠금, 정상 복귀 대기" };
  const left = CFG.stableMs - (now() - ctrl.stableAt);
  if (left > 0) return { level: "wait", text: `안정 구간 확인 중 ${(left / 1000).toFixed(1)}초` };
  return { level: "approve", text: "운영자 승인 대기" };
}

function command(action, { reuse = false, expired = false } = {}) {
  let cmd;
  if (reuse) cmd = ctrl.lastCmd;
  else {
    ctrl.cmdCount += 1;
    cmd = { kind: "command", device_id: edge.id, command_id: `cmd-${String(ctrl.cmdCount).padStart(3, "0")}`, action, issued_at: now(), expires_at: expired ? now() - 1 : now() + CFG.ttlMs };
    if (!expired) ctrl.lastCmd = cmd;
  }
  if (!cmd) return;
  ctrl.pending.set(cmd.command_id, { at: now(), action: cmd.action });
  const label = reuse ? "재전송" : expired ? "만료된 명령 발행" : "명령 발행";
  log(`${label}: ${cmd.command_id} (${cmd.action})`);
  send("edge", cmd);
}

function ctrlTick() {
  const m = measure();
  let [state, why] = judge(m);
  if (SEVERITY[state] < SEVERITY[ctrl.state]) {
    ctrl.betterSince ??= now();
    if (now() - ctrl.betterSince < CFG.holdMs) [state, why] = [ctrl.state, "통신이 나아지는 중입니다. 1초 동안 유지되면 상태를 내립니다."];
  } else ctrl.betterSince = null;
  if (state !== ctrl.state) {
    ctrl.betterSince = null;
    log(`관제: ${STATE_TEXT[ctrl.state]} → ${STATE_TEXT[state]}`, state === "NORMAL" ? "good" : state === "WARN" ? "warn" : "bad");
    if (state === "LOST") ctrl.needApproval = true;
    if (state === "NORMAL") ctrl.stableAt = now();
    ctrl.state = state;
  }
  // 유효기간이 지나도록 ACK가 없으면 실행 여부를 알 수 없다고 기록한다.
  for (const [id, sent] of ctrl.pending) {
    if (now() - sent.at > CFG.ttlMs + 1000) {
      ctrl.pending.delete(id);
      log(`ACK 없음: ${id}. 실행 여부를 확인하지 못했습니다.`, "warn");
    }
  }
  render(m, why);
}

/* ---------- 화면 ---------- */
function render(m, why) {
  $("clock").textContent = (now() / 1000).toFixed(1);
  const e = edge.values;
  $("eTemp").textContent = e.temp.toFixed(1);
  $("eDist").textContent = e.distance.toFixed(1);
  $("ePitch").textContent = e.imu.pitch.toFixed(1);
  $("eSeq").textContent = e.sequence;
  $("eLamp").textContent = edge.lamp ? "켜짐" : "꺼짐";
  $("eLamp").dataset.on = edge.lamp;
  $("eMode").textContent = edge.safe ? "안전모드(출력 차단)" : "원격 제어";
  $("eMode").dataset.safe = edge.safe;

  $("mSince").textContent = Math.round(m.since);
  $("mLoss").textContent = m.loss === null ? "–" : Math.round(m.loss * 100);
  $("mDelay").textContent = m.delay === null ? "–" : Math.round(m.delay);

  $("state").textContent = STATE_TEXT[ctrl.state];
  $("state").dataset.state = ctrl.state;
  $("stateWhy").textContent = why;

  const last = ctrl.last;
  const stale = m.since > 500;
  $("twin").dataset.stale = stale;
  $("twinLabel").textContent = !last ? "수신 대기 중" : stale ? `${(m.since / 1000).toFixed(1)}초 전에 받은 값` : "방금 받은 값";
  if (last) {
    $("twinBody").style.transform = `rotate(${last.imu.pitch}deg)`;
    $("cTemp").textContent = last.temp.toFixed(1);
    $("cDist").textContent = last.distance.toFixed(1);
    $("cSeq").textContent = last.sequence;
  }

  const a = authority();
  $("authority").textContent = a.text;
  $("authority").dataset.level = a.level;
  const lampOn = last?.lamp ?? false;
  $("cmdToggle").textContent = lampOn ? "경광등 끄기 명령" : "경광등 켜기 명령";
  $("cmdToggle").dataset.action = lampOn ? "lamp_off" : "lamp_on";
  const allowed = a.level === "ok";
  $("cmdToggle").disabled = !allowed;
  $("cmdExpired").disabled = !allowed;
  $("cmdDup").disabled = !allowed || !ctrl.lastCmd;
  $("approve").disabled = a.level !== "approve";
}

/* ---------- 통신 구간 그림 ---------- */
// 점 하나가 메시지 하나다. 보기 쉽게 실제보다 느리게 그린다. 손실된 메시지는 브로커 앞에서 빈 원으로 멈춘다.
const canvas = $("wire");
const pen = canvas.getContext("2d");
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
function drawWire() {
  const W = canvas.width, H = canvas.height, y = H / 2, x0 = 24, x1 = W - 24, mid = W / 2;
  const cut = FAULTS[fault].cut;
  const t = now();
  pen.clearRect(0, 0, W, H);
  pen.lineWidth = 4;
  pen.strokeStyle = css("--black");
  pen.setLineDash(cut ? [10, 14] : []);
  pen.beginPath();
  if (cut) { pen.moveTo(x0, y); pen.lineTo(mid - 60, y); pen.moveTo(mid + 60, y); pen.lineTo(x1, y); }
  else { pen.moveTo(x0, y); pen.lineTo(x1, y); }
  pen.stroke();
  pen.setLineDash([]);
  for (let i = dots.length - 1; i >= 0; i -= 1) {
    const d = dots[i];
    const p = (t - d.t0) / d.dur;
    if (p >= 1 || (d.dropped && p >= 0.62)) { dots.splice(i, 1); continue; }
    if (still && !d.big) continue;
    const reach = d.dropped ? Math.min(p, 0.46) : p;
    const x = d.back ? x1 - (x1 - x0) * reach : x0 + (x1 - x0) * reach;
    const r = d.big ? 11 : 6;
    pen.beginPath();
    pen.arc(x, d.back ? y + 16 : y - (d.big ? 16 : 0), r, 0, Math.PI * 2);
    if (d.dropped) { pen.lineWidth = 3; pen.strokeStyle = css("--red"); pen.stroke(); }
    else { pen.fillStyle = d.big ? css("--blue") : css("--black"); pen.fill(); }
  }
  pen.fillStyle = css("--paper");
  pen.strokeStyle = css("--black");
  pen.lineWidth = 4;
  for (const x of [x0, mid, x1]) {
    pen.beginPath();
    if (x === mid) pen.rect(x - 14, y - 14, 28, 28); else pen.arc(x, y, 14, 0, Math.PI * 2);
    pen.fill();
    pen.stroke();
  }
  if (cut) {
    pen.strokeStyle = css("--red");
    pen.lineWidth = 6;
    pen.beginPath();
    pen.moveTo(mid - 12, y - 12); pen.lineTo(mid + 12, y + 12); pen.moveTo(mid + 12, y - 12); pen.lineTo(mid - 12, y + 12);
    pen.stroke();
  }
  requestAnimationFrame(drawWire);
}
requestAnimationFrame(drawWire);

/* ---------- 조작 ---------- */
for (const button of document.querySelectorAll("[data-fault]")) {
  button.addEventListener("click", () => {
    if (fault === button.dataset.fault) return;
    fault = button.dataset.fault;
    for (const other of document.querySelectorAll("[data-fault]")) other.setAttribute("aria-pressed", String(other === button));
    $("faultHint").textContent = FAULTS[fault].hint;
    log(`통신 구간: ${FAULTS[fault].text}`, fault === "none" ? "good" : "warn");
  });
}
$("cmdToggle").addEventListener("click", () => command($("cmdToggle").dataset.action));
$("cmdDup").addEventListener("click", () => command(null, { reuse: true }));
$("cmdExpired").addEventListener("click", () => command("lamp_on", { expired: true }));
$("approve").addEventListener("click", () => {
  log("운영자가 제어권 복원을 승인했습니다.", "good");
  command("restore");
});

setInterval(() => {
  edgeTick();
  const t = now();
  for (let i = queue.length - 1; i >= 0; i -= 1) {
    if (queue[i].at > t) continue;
    const [item] = queue.splice(i, 1);
    if (item.to === "ctrl") ctrlReceive(item.message, item.at);
    else edgeReceive(item.message);
  }
  ctrlTick();
}, CFG.tickMs);
