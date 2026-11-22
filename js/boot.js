// 첫 화면이 그려지기 전에 실행된다. 같은 탭에서 다시 들어오면 로딩 화면을 건너뛴다.
try {
  if (sessionStorage.getItem("seen")) document.documentElement.classList.add("seen");
  else sessionStorage.setItem("seen", "1");
} catch {
  // 저장을 못 쓰는 환경이면 로딩 화면을 매번 보여 준다.
}
