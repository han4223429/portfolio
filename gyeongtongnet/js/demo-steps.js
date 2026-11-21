/* 경통넷 — 시연 시나리오 정의(순수 데이터). 화면 동작은 app.js가 action을 해석해 실행한다.
 * 기획: "학생회 경험의 순환 구조" — 기록 → AI 지식화 → 질문 → 경험 검색·종합 → 다음 행사에 활용 → 다시 기록.
 * 예시: 토마토 대학교 토마토들 학생회 신입생 OT. 전년도 자료에는 "프로그램 5개"만 있고 "왜 5개?"는 없다.
 * 모든 자료·수치·결과는 가상이다. */
(function (root) {
  "use strict";

  const QUESTION_OT = "작년 신입생 OT에서 왜 프로그램을 5개 했지? 5개가 적당했던 건가?";
  const QUESTION_SCALE = "이번에 80명 정도 규모의 행사를 준비하는데 이전에는 어떻게 진행했나요?";
  const QUESTION_SIMILAR = "100명 정도가 참여하는 신입생 행사를 준비하고 있어. 이전에 비슷한 행사를 진행한 사례가 있을까?";
  const QUESTION_MISSING = "올해 신입생 OT 예상 참여 인원은 몇 명이야?";
  const QUESTION_EXCHANGE = "신입생 대상 교류 프로그램을 처음 기획하는데 참고할 만한 사례가 있을까?";
  const QUESTION_RECEPTION = "작년 개강총회에서 접수가 왜 밀렸고 올해 접수 인력이 한 명이면 뭘 바꿀까?";
  const QUESTION_WAIT = "올해 평균 대기시간이 몇 분이야?";

  // 결정 초안(유형별). 사람이 고치고 저장한다 — AI가 대신 결정하지 않는다.
  const DRAFTS = {
    "신입생 OT": {
      title: "프로그램을 4개로 줄이고 프로그램당 시간을 늘린다. 후반 프로그램 시간은 쉬는 시간과 함께 먼저 확보하고 80명 기준 인력 배치를 확인한다.",
      ownerRole: "OT 기획 담당",
      dueDate: "2027-02-20",
      measure: "프로그램별 참가자 후기 수집, 정시 종료 여부",
    },
    "신입생 교류 프로그램": {
      title: "신입생 교류 프로그램을 작은 규모로 먼저 시범 운영한다. 참가자 관심사를 사전 설문으로 받아 배정하고 이동 동선을 나눈다.",
      ownerRole: "교류 프로그램 기획 담당",
      dueDate: "2027-03-10",
      measure: "참가자 후기 수집, 운영 중 발생한 문제 기록",
    },
    "개강총회": {
      title: "접수는 한 줄 흐름으로 유지한다. 이유: 접수 인력이 1명이라 줄을 나눌 수 없다. 대신 사전 명단을 미리 정리하고 줄 안내를 붙인다.",
      ownerRole: "행사 접수 담당",
      dueDate: "2027-03-02",
      measure: "평균 대기시간(분) 실측, 정시 시작 여부",
    },
  };
  const OUTCOME_RECEPTION = "한 줄 접수로 운영. 대기시간은 행사 후 실측해 기록 예정 (시연용 가상 결과)";
  const OUTCOME = "프로그램 4개로 운영. 정시 종료 여부와 후기는 행사 후 기록 예정 (시연용 가상 결과)";

  // 경험의 순환 구조 7단계 (기획서 ⑦). 홈·시연 화면에서 공통으로 쓴다.
  const CYCLE = [
    { key: "record", label: "기록", mascot: ["red", "default"], text: "행사 자료·예산·회의록·업체·후기·만족도·시행착오를 쌓아요." },
    { key: "know", label: "AI 지식화", mascot: ["green", "think"], text: "자료를 정리해 행사·문제·결과·개선점을 연결해요." },
    { key: "ask", label: "질문", mascot: ["yellow", "think"], text: "새 담당자가 행사를 준비하면서 물어봐요." },
    { key: "find", label: "경험 검색·종합", mascot: ["yellow", "happy"], text: "우리 학생회의 과거 경험과 다른 학생자치기구의 유사 사례를 찾아요." },
    { key: "compare", label: "비교·활용", mascot: ["green", "happy"], text: "결정 과정·문제점·반응·개선점을 조건과 함께 비교해요." },
    { key: "use", label: "다음 행사에 활용", mascot: ["red", "happy"], text: "참고하되 최종 결정은 담당자가 해요." },
    { key: "rerecord", label: "다시 기록", mascot: ["green", "cheer"], text: "결과와 시행착오를 다시 쌓아 다음 기수로 넘겨요." },
  ];

  // 경험의 범위 (기획서 ③): 한 학생회에서 같은 학교의 다른 학생자치기구로 넓힌다.
  const SCOPE = [
    { label: "1단계 · 우리 학생회의 경험", sub: "토마토들 학생회" },
    { label: "2단계 · 같은 학교의 다른 학생자치기구", sub: "학과 학생회 · 단과대 학생회 · 동아리연합회" },
    { label: "3단계 · 쌓인 운영 경험", sub: "행사 · 예산 · 운영 방식 · 문제점 · 학생 반응 · 개선 사례" },
    { label: "AI가 상황에 맞는 경험을 연결", sub: "담당자가 참고해 결정해요" },
  ];

  // 기존 인수인계와 우리가 만들고 싶은 인수인계 (기획서 ⑤)
  const CONTRAST = {
    before: "“작년에 이런 자료가 있습니다.”",
    after: "“작년에 이런 상황에서 이런 선택을 했고, 이런 문제가 있었어요. 다른 학생자치기구는 비슷한 상황에서 이렇게 풀었어요. 그래서 이번에는 이런 점을 고려해 볼 수 있어요.”",
  };

  // AI 기술 흐름 (기획서 ⑧). 이 시연은 규칙 기반이고, 실제 서비스는 RAG 방식으로 같은 순서를 따른다.
  const TECH_FLOW = [
    { label: "학생회·학생자치기구 자료", note: "회의록·기획안·예산·후기·만족도·업체·시행착오 (PDF·한글·엑셀·설문)" },
    { label: "AI 자료 분석·정보 추출", note: "행사명·유형·인원·예산·업체·문제점·반응·개선점을 뽑아요" },
    { label: "행사 단위로 구조화 → 지식 DB 축적", note: "흩어진 문서를 한 행사의 경험으로 묶어요" },
    { label: "학생회 질문 입력", note: "의미와 조건(예: 100명 규모)을 파악해요" },
    { label: "관련 과거 사례 검색", note: "필요한 자료를 먼저 찾아요 (RAG의 검색 단계)" },
    { label: "유사한 다른 학생자치기구 사례 검색", note: "권한이 허용된(공유 승인) 자료만 대상이에요" },
    { label: "관련 자료 종합·비교", note: "결정 → 결과 → 문제 → 개선점 흐름으로 이어요" },
    { label: "답변 + 시행착오 + 개선점 + 출처", note: "찾은 자료만 근거로 쓰고, 근거가 없으면 ‘확인이 필요해요’" },
    { label: "학생회 의사결정 지원", note: "최종 결정은 담당자가 해요" },
    { label: "새 행사 결과·경험 재축적", note: "결과를 다시 쌓아 경험이 순환해요" },
  ];

  // 발표용 MVP 시연: 사례 찾기 → 우리 조건과 비교하기 → 결정과 결과 남기기 (개강총회 접수)
  const SCENARIO_MVP = {
    id: "mvp",
    short: "발표용 시연 · 개강총회 접수",
    minutes: 1,
    title: "개강총회 접수, 남의 정답을 복사하지 않아요",
    summary: "토마토 대학교 토마토들 학생회 개강총회 접수예요. 다른 조직은 두 명이 접수 줄을 나눴지만 우리는 한 명이에요. 차이와 출처를 보고, 담당자가 한 줄 접수를 선택하고, 이유와 결과를 다음 기수에 남겨요.",
    steps: [
      { id: "find", phase: "사례 찾기", route: "#/ask", mascot: ["yellow", "think"], title: "1. 사례를 찾아요",
        text: "‘작년 접수가 왜 밀렸고 올해 인력이 한 명이면 뭘 바꿀까?’ 열람 권한이 있는 기록만 검색하고 우리 회고와 후기, 다른 조직 사례를 출처와 함께 보여 줘요.",
        action: { type: "ask", query: QUESTION_RECEPTION } },
      { id: "compare", phase: "우리 조건과 비교", route: "#/ask", mascot: ["green", "think"], title: "2. 우리 조건과 비교해요",
        text: "다른 조직은 두 명으로 줄을 나눴지만 우리는 한 명이에요. 화면은 ‘우리 1명 / 비교 2명’ 차이와 출처를 보여 주고 그대로 적용하지 않아요.",
        action: { type: "ask", query: QUESTION_RECEPTION, instant: true, scrollTo: "conditions" } },
      { id: "evidence", phase: "근거 확인", route: "#/evidence/evd-peer-card", mascot: ["red", "default"], title: "3. 출처를 눌러 원문을 봐요",
        text: "답 옆의 근거를 누르면 원문을 열어 직접 확인할 수 있어요. 근거가 없는 내용은 만들지 않아요." },
      { id: "missing", phase: "확인 필요", route: "#/ask", mascot: ["red", "sad"], title: "4. 근거가 없으면 ‘확인 필요’",
        text: "‘올해 평균 대기시간은?’ 기록이 없으니 추측하지 않고 확인 불가로 표시해요.",
        action: { type: "ask", query: QUESTION_WAIT } },
      { id: "decide", phase: "결정 남기기", route: "#/decisions/new", mascot: ["red", "happy"], title: "5. 담당자가 한 줄 접수를 선택해요",
        text: "선택과 그 이유, 담당·기한·확인 지표를 적어요. ‘다음’을 누르면 저장돼요. 결정은 AI가 아니라 담당자가 해요.",
        action: { type: "prefill", draft: DRAFTS["개강총회"] }, onNext: { type: "save", draft: DRAFTS["개강총회"], question: QUESTION_RECEPTION } },
      { id: "result", phase: "결과 남기기", route: "#/decisions", mascot: ["green", "cheer"], title: "6. 행사 뒤 결과를 다음 기수에 남겨요",
        text: "결과는 측정 전까지 ‘미측정’이에요. ‘다음’을 누르면 끝까지 진행해요.",
        onNext: { type: "advance", outcome: OUTCOME_RECEPTION } },
      { id: "end", phase: "마무리", route: "#/home", mascot: ["green", "cheer"], title: "7. 시연용 프로토타입이에요",
        text: "지금 본 것은 흐름을 담은 시연용 프로토타입이에요. 실제 문서 검색과 계정 권한 연동은 개발 단계에서 검증할 예정이에요." },
    ],
  };

  // 이번 MVP는 세 단계로 좁혔다.
  const MVP3 = [
    { label: "사례 찾기", mascot: ["yellow", "think"], text: "열람 권한이 있는 기록에서 비슷한 사례를 출처와 함께 찾아요." },
    { label: "우리 조건과 비교하기", mascot: ["green", "think"], text: "인원·시간 같은 조건 차이를 보고 그대로 적용할 수 있는지 살펴요." },
    { label: "결정과 결과 남기기", mascot: ["red", "happy"], text: "담당자가 고른 방법과 이유, 행사 뒤 결과를 다음 기수에 남겨요." },
  ];

  // 믿고 쓰기 위한 설계 규칙 (AI 도구의 출처 오류·입력 데이터 통제 문제, AI 과장 문제를 설계로 옮긴 것)
  const TRUST = [
    { key: "scope", title: "권한 있는 문서만 검색해요", text: "검색하기 전에 열람 권한부터 확인해요. 권한 밖 문서는 제목도 발췌도 나오지 않아요." },
    { key: "cite", title: "답 옆에 근거를 보여 줘요", text: "그럴듯한 틀린 출처를 막으려고 답마다 어떤 자료에서 확인된 내용인지 붙여요. 눌러서 원문을 볼 수 있어요." },
    { key: "hold", title: "근거가 없으면 판단을 미뤄요", text: "찾은 자료가 없으면 추측하지 않고 ‘확인이 필요해요’라고 답해요." },
    { key: "pii", title: "명단·연락처는 AI에 넘기지 않아요", text: "행사 참가자 명단, 연락처, 계좌 같은 개인정보는 입력 대상에서 빼요. 인원처럼 숫자로만 다뤄요." },
    { key: "claim", title: "AI를 부풀려 말하지 않아요", text: "AI는 근거와 조건 차이를 보여 주고 운영 결정은 담당자가 해요. ‘AI가 행사 운영을 최적화한다’는 말은 쓰지 않아요." },
  ];

  // 접근 권한 설계 (시연용 규칙표. 특정 논문의 기술을 그대로 구현했다는 뜻이 아니다.)
  const ACCESS_MODEL = {
    identity: { title: "학교 이메일", role: "본인 확인용" },
    authority: { title: "현직 임원 승인 + 임기", role: "접근 권한 확인용" },
    rules: ["승인 대기·임기 종료·일반 재학생은 앱·웹·문서 링크·AI 검색이 모두 막혀요.", "임기가 끝나면 예전에 받은 문서 링크와 AI 검색으로도 자료를 볼 수 없어요.", "다른 조직에는 공유 승인된 비식별 카드만 보여요."],
    note: "이 시연에는 계정 연동이 없어요. 권한 규칙은 시연용 표이고 실제 서버 검증은 개발 단계에서 해요.",
  };

  // 문제의 출발점 (최수빈·박진호, 한국기록관리학회지 26(1), 2026). 개강총회 인수인계 문제의 빈도를 입증한 연구는 아니다.
  const RESEARCH = {
    cite: "최수빈·박진호, 한국기록관리학회지 26권 1호, 2026 (DOI 10.14404/JKSARM.2026.26.1.015)",
    text: "대학 학생기록물 연구에서 기록관리 담당자들은 학생자치기구 회의록을 중요하게 봤지만 실제 관리 수준은 그에 못 미쳤어요.",
    limit: "다만 이 연구가 개강총회 인수인계 문제가 얼마나 자주 생기는지까지 보여 주지는 않아요.",
  };

  const SCENARIO_OT = {
    id: "ot",
    short: "전체 시연 · 신입생 OT",
    minutes: 4,
    title: "“작년에 왜 프로그램을 5개 했지?”",
    summary: "토마토 대학교 토마토들 학생회 신임 담당자가 신입생 행사를 준비해요. 전년도 자료에는 ‘5개 운영’만 있고 이유는 없어요. 과거 기록과 다른 학생자치기구의 사례를 조건과 함께 비교해 보고 결정과 결과를 다시 기록하는 과정까지 따라가 봐요.",
    steps: [
      { id: "problem", phase: "기록", route: "#/archive", mascot: ["red", "default"], title: "1. 자료는 있는데 ‘왜’가 없어요",
        text: "학생회에는 행사 자료·회의록·후기·업체 정보가 남아 있어요. 그런데 ‘프로그램 5개 운영’만 있고 왜 5개였는지는 어디에도 없어요. 그래서 다음 기수는 또 물어봐야 해요." },
      { id: "know", phase: "AI 지식화", route: "#/archive", mascot: ["green", "think"], title: "2. 흩어진 자료를 한 행사로 구조화해요",
        text: "PDF·한글·엑셀·설문 속 정보를 뽑아 행사명·인원·예산·업체·문제점·반응·개선점으로 묶어요. 판단 이유가 없는 자료는 ‘이유 기록 없음’으로 표시해요. 이 시연은 규칙 기반이에요.",
        action: { type: "scroll", target: "archive-structured" } },
      { id: "ask", phase: "질문", route: "#/ask", mascot: ["yellow", "think"], title: "3. 담당자가 물어봐요",
        text: "‘작년에 왜 5개를 했지? 5개가 적당했던 건가?’ 작년 자료를 그대로 따라 하면 같은 문제가 반복될 수 있어요.",
        action: { type: "ask", query: QUESTION_OT } },
      { id: "own", phase: "경험 검색·종합", route: "#/ask", mascot: ["red", "default"], title: "4. 여러 자료를 하나로 종합해요",
        text: "기획안·예산표·만족도·후기를 따로 늘어놓지 않고 ‘결정 → 결과 → 문제 → 개선점’ 흐름으로 묶어요. 문장마다 출처가 붙고 눌러서 원문을 확인할 수 있어요.",
        action: { type: "ask", query: QUESTION_OT, instant: true, scrollTo: "summary" } },
      { id: "evidence", phase: "경험 검색·종합", route: "#/evidence/evd-ot-minutes", mascot: ["red", "sad"], title: "5. 모르면 ‘확인이 필요해요’",
        text: "회의록에는 ‘관행대로 5개로 정했다, 이유는 논의하지 않았다’고만 있어요. 그래서 이유를 추측하지 않고 ‘확인이 필요하다’고 안내해요." },
      { id: "compare", phase: "비교·활용", route: "#/ask", mascot: ["green", "happy"], title: "6. 다른 학생자치기구와 조건을 비교해요",
        text: "우리 80명·5개·300분, 새싹 동아리연합 45명·3개·210분, 가상 B 학과 120명·6개. 어떤 방식이 참고할 만한지, 그대로 적용하기 어려운 부분은 무엇인지 보여 줘요. 권한이 허용된(공유 승인) 자료만 써요.",
        action: { type: "ask", query: QUESTION_OT, instant: true, scrollTo: "conditions" } },
      { id: "exchange", phase: "경험 검색·종합", route: "#/ask", mascot: ["yellow", "happy"], title: "7. 우리 기록이 없으면 다른 기구의 경험을 찾아요",
        text: "‘신입생 교류 프로그램을 처음 기획하는데 참고할 사례가 있을까?’ 우리 기록이 없어서 단과대·학과·동아리연합회의 운영 방식, 문제, 개선을 비교해 보여 줘요.",
        action: { type: "ask", query: QUESTION_EXCHANGE } },
      { id: "missing", phase: "질문", route: "#/ask", mascot: ["red", "sad"], title: "8. 없는 숫자는 만들지 않아요",
        text: "‘올해 예상 참여 인원은?’ 아직 기록이 없으니 ‘확인 불가’예요. 근거 없는 수치는 만들지 않아요.",
        action: { type: "ask", query: QUESTION_MISSING } },
      { id: "decide", phase: "다음 행사에 활용", route: "#/decisions/new", mascot: ["red", "happy"], title: "9. 결정은 담당자가 해요",
        text: "AI는 결정을 대신하지 않아요. 담당자가 참고해 담당 역할·기한·확인 지표가 있는 결정을 적어요. ‘다음’을 누르면 저장돼요. 시연 안에서만 저장돼요.",
        action: { type: "prefill", draft: DRAFTS["신입생 OT"] }, onNext: { type: "save", draft: DRAFTS["신입생 OT"], question: QUESTION_OT } },
      { id: "track", phase: "다시 기록", route: "#/decisions", mascot: ["green", "cheer"], title: "10. 행사 뒤에 결과를 다시 기록해요",
        text: "무엇을 선택했고 실제 결과는 어땠는지 남겨요. 결과는 측정하기 전까지 ‘미측정’이고 자동으로 성공이 되지 않아요. ‘다음’을 누르면 끝까지 진행해요.",
        onNext: { type: "advance", outcome: OUTCOME } },
      { id: "cycle", phase: "순환", route: "#/home", mascot: ["green", "cheer"], title: "11. 학생자치 경험이 이어져요",
        text: "인수인계 문서가 아니라 ‘학생자치 경험의 순환 구조’예요. 쌓인 경험은 다음 기수와 다른 학생자치기구의 자산이 돼요. 시연을 끝내면 시연 데이터는 지워져요." },
    ],
  };

  const SCENARIOS = { mvp: SCENARIO_MVP, ot: SCENARIO_OT };

  const api = { SCENARIO: SCENARIO_OT, SCENARIOS, MVP3, TRUST, ACCESS_MODEL, RESEARCH, CYCLE, SCOPE, CONTRAST, TECH_FLOW, DRAFTS, OUTCOME, OUTCOME_RECEPTION, QUESTION_OT, QUESTION_SCALE, QUESTION_SIMILAR, QUESTION_MISSING, QUESTION_EXCHANGE, QUESTION_RECEPTION, QUESTION_WAIT };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GT = Object.assign(root.GT || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : this);
