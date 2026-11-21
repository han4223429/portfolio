/* 경통넷 허브 — 진입 로딩 실행과 로딩 다시 보기 */
(function () {
  "use strict";
  const G = window.GT;
  G.splash.run();
  document.getElementById("replay").addEventListener("click", () => { location.href = "index.html?splash=1"; });
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
