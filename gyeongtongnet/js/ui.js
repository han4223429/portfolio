/* 경통넷 — 화면 공용 도우미. 사용자 입력·저장값은 항상 textContent로 렌더링한다. */
(function (root) {
  "use strict";
  const G = root.GT;
  const $ = (id) => document.getElementById(id);

  function el(tag, props, children) {
    const n = document.createElement(tag);
    if (props) for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === "class") n.className = v; else if (k === "text") n.textContent = v; else n.setAttribute(k, v === true ? "" : v);
    }
    for (const c of children || []) n.append(c);
    return n;
  }
  function mascotSrc(color, expr, animated) {
    const m = (G.MASCOTS || []).find((x) => x.id === `${color}-${expr}`);
    return m ? (animated ? m.animated : m.static) : "";
  }
  function mascotImg(color, expr, animated, cls) {
    return el("img", { src: mascotSrc(color, expr, animated), alt: "", "aria-hidden": "true", class: cls, width: 96, height: 98 });
  }
  const reducedMotion = () => !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /** 완료 효과: 토마토 색 조각이 떨어진다. 동작 줄이기 설정이면 생략하고, 지원 기기에서는 짧게 진동한다. */
  function celebrate() {
    if (reducedMotion()) return;
    try { if (root.navigator && navigator.vibrate) navigator.vibrate(18); } catch { /* 무시 */ }
    const box = el("div", { class: "confetti", "aria-hidden": "true" });
    for (let i = 0; i < 22; i++) {
      const p = el("i", { class: "c" + (i % 4) });
      p.style.left = Math.round(Math.random() * 100) + "%";
      p.style.animationDelay = Math.round(Math.random() * 250) + "ms";
      p.style.setProperty("--dx", Math.round(Math.random() * 120 - 60) + "px");
      box.append(p);
    }
    document.body.append(box);
    setTimeout(() => box.remove(), 1800);
  }

  root.GT = Object.assign(root.GT || {}, { ui: { $, el, mascotSrc, mascotImg, reducedMotion, wait, celebrate } });
})(window);
