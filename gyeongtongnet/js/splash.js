/* 경통넷 — 진입 로딩화면. 캐릭터 이미지를 미리 불러오며 진행률을 보여준다.
 * 세션당 1회만 보이고(?splash=1 로 강제, ?splash=0 으로 생략), 건너뛰기를 항상 제공한다. */
(function (root) {
  "use strict";
  const G = root.GT;
  const KEY = "gt-splash-seen";
  const TIPS = ["작년엔 이랬대요!", "남의 정답을 복사하지 않아요", "근거를 눌러 원문을 확인해요", "없는 숫자는 만들지 않아요", "결정은 사람이 해요"];

  function seen() { try { return sessionStorage.getItem(KEY) === "1"; } catch { return false; } }
  function mark() { try { sessionStorage.setItem(KEY, "1"); } catch { /* 무시 */ } }

  /** @returns Promise — 로딩이 끝나거나 건너뛰면 resolve */
  function run() {
    const box = document.getElementById("splash");
    if (!box) return Promise.resolve();
    const q = new URLSearchParams(location.search).get("splash");
    if (q === "0" || (q !== "1" && seen())) { box.remove(); return Promise.resolve(); }

    const fill = document.getElementById("splashFill");
    const track = document.getElementById("splashTrack");
    const tip = document.getElementById("splashTip");
    const stageEl = document.getElementById("splashStage");
    const runner = document.getElementById("splashRunner");
    const crew = ["splashCrew1", "splashCrew2", "splashCrew3"].map((id) => document.getElementById(id));
    const STAGES = [[0, "자료를 모으는 중…"], [34, "경험을 연결하는 중…"], [67, "출처를 확인하는 중…"], [100, "준비 끝!"]];
    const done3 = ["assets/characters/yellow-cheer.anim.svg", "assets/characters/red-cheer.anim.svg", "assets/characters/green-cheer.anim.svg"];
    const skip = document.getElementById("splashSkip");
    const urls = [...new Set((G.MASCOTS || []).flatMap((m) => [m.static, m.animated]))];
    const minMs = G.ui.reducedMotion() ? 300 : 1600;
    const started = Date.now();
    let done = false, loaded = 0, tipIdx = 0;

    return new Promise((resolve) => {
      function finish() {
        if (done) return;
        done = true;
        clearInterval(tipTimer);
        mark();
        box.classList.add("out");
        setTimeout(() => { box.remove(); resolve(); }, G.ui.reducedMotion() ? 0 : 350);
      }
      function progress() {
        const pct = urls.length ? Math.round((loaded / urls.length) * 100) : 100;
        const timePct = Math.min(100, Math.round(((Date.now() - started) / minMs) * 100));
        const shown = Math.min(pct, timePct);
        fill.style.width = shown + "%";
        if (runner) runner.style.left = "calc(" + shown + "% - 18px)";
        if (stageEl) { const st = [...STAGES].reverse().find((s) => shown >= s[0]); if (st && stageEl.textContent !== st[1]) stageEl.textContent = st[1]; }
        if (shown >= 100) crew.forEach((img, i) => { if (img && img.getAttribute("src") !== done3[i]) img.setAttribute("src", done3[i]); });
        track.setAttribute("aria-valuenow", String(shown));
        if (shown >= 100) finish();
      }
      const tipTimer = setInterval(() => { tipIdx = (tipIdx + 1) % TIPS.length; tip.textContent = TIPS[tipIdx]; progress(); }, 400);
      tip.textContent = TIPS[0];
      skip.addEventListener("click", finish);
      skip.focus();
      for (const u of urls) {
        const img = new Image();
        const step = () => { loaded += 1; progress(); };
        img.onload = step; img.onerror = step; // 실패해도 진행 (오프라인/누락 대비)
        img.src = u;
      }
      progress();
      setTimeout(finish, 6000); // 어떤 경우에도 6초 안에 진입
    });
  }

  root.GT = Object.assign(root.GT || {}, { splash: { run } });
})(window);
