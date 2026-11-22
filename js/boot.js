// 첫 화면이 그려지기 전에 실행된다.
// 새로고침이면 로딩 화면부터 맨 위 첫 화면으로 다시 시작한다.
// 같은 탭에서 다른 페이지에 갔다가 돌아온 경우에만 로딩 화면을 건너뛴다.
try {
  const type = performance.getEntriesByType("navigation")[0]?.type;
  if (type === "reload") {
    history.scrollRestoration = "manual";
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    document.documentElement.dataset.reload = "1";
    sessionStorage.setItem("seen", "1");
  } else if (sessionStorage.getItem("seen")) {
    document.documentElement.classList.add("seen");
  } else {
    sessionStorage.setItem("seen", "1");
  }
} catch {
  // 저장을 못 쓰는 환경이면 로딩 화면을 매번 보여 준다.
}
