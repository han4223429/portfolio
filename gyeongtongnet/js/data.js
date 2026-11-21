/* 경통넷 P0 — 고정 가상 데이터. 실제 학교·인물·연락처·계좌는 포함하지 않는다. */
(function (root) {
  "use strict";

  const ORGS = {
    tomatoes: { id: "tomatoes", name: "토마토들 학생회", kind: "우리 학생회", synthetic: true },
    saessak: { id: "saessak", name: "새싹 동아리연합", kind: "동아리연합회", synthetic: true },
    other: { id: "other", name: "가상 C 학회", kind: "학회", synthetic: true },
    deptb: { id: "deptb", name: "가상 B 학과 학생회", kind: "학과 학생회", synthetic: true },
    college: { id: "college", name: "가상 D 단과대 학생회", kind: "단과대 학생회", synthetic: true },
  };

  const UNIVERSITY = "토마토 대학교"; // 가상 학교
  const CURRENT_ORG = "tomatoes";

  // 없는 수치는 null (데이터 계약).
  const EVENTS = [
    { id: "ev-2026-own", orgId: "tomatoes", cycle: "2026", type: "개강총회", title: "2026 개강총회 (우리 조직)", attendees: null, venueType: "강당", deskStaff: 1, startedOnTime: null },
    { id: "ev-2026-peer", orgId: "saessak", cycle: "2026", type: "개강총회", title: "2026 개강총회 (새싹 동아리연합)", attendees: null, venueType: "강당", deskStaff: 2, startedOnTime: null },
    { id: "ev-2026-other", orgId: "other", cycle: "2026", type: "개강총회", title: "2026 개강총회 (가상 C 학회)", attendees: null, venueType: "강의실", deskStaff: 3, startedOnTime: null },
    { id: "ev-2027-own", orgId: "tomatoes", cycle: "2027", type: "개강총회", title: "2027 개강총회 (올해)", attendees: null, venueType: "강당", deskStaff: 1, startedOnTime: null },
    // 신입생 OT — 전년도 "프로그램 5개"의 이유를 묻는 핵심 시나리오. 수치는 모두 가상.
    { id: "ev-ot-2026-own", orgId: "tomatoes", cycle: "2026", type: "신입생 OT", title: "2026 신입생 OT (우리 조직)", attendees: 80, programCount: 5, durationMin: 300, venueType: "강당", deskStaff: null, startedOnTime: null,
      // AI가 여러 자료에서 뽑아 한 행사로 묶은 구조화 정보(가상 예시). 값마다 출처 근거가 있어야 화면에 쓴다.
      structured: { budgetMan: 150, vendor: "A업체", satisfaction: 4.2, issue: "식사 배부 시간 지연", opinion: "사전 인원 확인 절차 개선 필요" } },
    { id: "ev-ot-2026-peer1", orgId: "saessak", cycle: "2026", type: "신입생 OT", title: "2026 신입생 OT (새싹 동아리연합)", attendees: 45, programCount: 3, durationMin: 210, venueType: "강의실", deskStaff: null, startedOnTime: null },
    { id: "ev-ot-2026-peer2", orgId: "deptb", cycle: "2026", type: "신입생 OT", title: "2026 신입생 OT (가상 B 학과 학생회)", attendees: 120, programCount: 6, durationMin: 300, venueType: "강당", deskStaff: null, startedOnTime: null },
    { id: "ev-ot-2026-other", orgId: "other", cycle: "2026", type: "신입생 OT", title: "2026 신입생 OT (가상 C 학회)", attendees: 60, programCount: 4, durationMin: 240, venueType: "강의실", deskStaff: null, startedOnTime: null },
    // 신입생 교류 프로그램 — 우리 조직에는 기록이 없고 다른 학생자치기구의 사례만 있는 시나리오.
    { id: "ev-ex-2026-peer1", orgId: "college", cycle: "2026", type: "신입생 교류 프로그램", title: "2026 선후배 멘토링 데이 (가상 D 단과대 학생회)", attendees: 40, programCount: 2, durationMin: 120, venueType: "강의실", deskStaff: null, startedOnTime: null },
    { id: "ev-ex-2026-peer2", orgId: "saessak", cycle: "2026", type: "신입생 교류 프로그램", title: "2026 동아리 체험 교류회 (새싹 동아리연합)", attendees: 100, programCount: 8, durationMin: 180, venueType: "강당", deskStaff: null, startedOnTime: null },
    { id: "ev-ex-2026-peer3", orgId: "deptb", cycle: "2026", type: "신입생 교류 프로그램", title: "2026 선후배 밥약 매칭 (가상 B 학과 학생회)", attendees: 60, programCount: 1, durationMin: 90, venueType: "식당", deskStaff: null, startedOnTime: null },
    { id: "ev-ex-2026-other", orgId: "other", cycle: "2026", type: "신입생 교류 프로그램", title: "2026 신입생 교류 (가상 C 학회)", attendees: 30, programCount: 2, durationMin: 100, venueType: "강의실", deskStaff: null, startedOnTime: null },
    { id: "ev-ex-2027-own", orgId: "tomatoes", cycle: "2027", type: "신입생 교류 프로그램", title: "2027 신입생 교류 프로그램 (올해, 처음 기획)", attendees: null, programCount: null, durationMin: null, venueType: "강당", deskStaff: null, startedOnTime: null },
    { id: "ev-ot-2027-own", orgId: "tomatoes", cycle: "2027", type: "신입생 OT", title: "2027 신입생 OT (올해)", attendees: null, programCount: null, durationMin: null, venueType: "강당", deskStaff: null, startedOnTime: null },
  ];

  const EVIDENCES = [
    {
      id: "evd-own-retro", eventId: "ev-2026-own", orgId: "tomatoes", kind: "retro",
      label: "2026 개강총회 회고", section: "접수",
      excerpt: "입구에서 사전 신청 확인과 현장 신청 접수를 한 줄에서 진행했다. 실제 대기시간은 기록하지 않았다.",
      keywords: ["접수", "밀렸", "혼잡", "명단", "줄", "한 줄", "사전", "현장", "신청", "입구"],
      visibility: "internal", sharingApproved: false, status: "verified", synthetic: true,
    },
    {
      id: "evd-own-review", eventId: "ev-2026-own", orgId: "tomatoes", kind: "review",
      label: "참가자 익명 후기", section: "접수 후기",
      excerpt: "“현장 신청인지 명단 확인인지 어떤 줄에 서야 할지 잘 몰랐어요.”",
      keywords: ["접수", "줄", "안내", "혼선", "혼잡", "밀렸", "명단", "현장"],
      visibility: "internal", sharingApproved: false, status: "verified", synthetic: true,
    },
    {
      id: "evd-peer-card", eventId: "ev-2026-peer", orgId: "saessak", kind: "shared-card",
      label: "새싹 동아리연합 접수 운영 카드", section: "접수 운영",
      excerpt: "접수 담당 두 명이 사전 확인과 현장 신청을 나눠 맡았다. 두 종류의 줄을 안내판으로 구분했다. 대기시간 실측과 정시 시작 여부는 기록하지 않았다.",
      keywords: ["접수", "분리", "사전", "현장", "신청", "안내판", "줄", "명단", "혼잡", "밀렸"],
      visibility: "shared", sharingApproved: true, status: "verified", synthetic: true,
    },
    // ↓ 아래 둘은 어떤 화면·검색·출처에도 나오면 안 된다 (권한 테스트 대상).
    {
      id: "evd-peer-unapproved", eventId: "ev-2026-peer", orgId: "saessak", kind: "shared-card",
      label: "새싹 동아리연합 내부 메모 (미승인)", section: "접수 메모",
      excerpt: "UNAPPROVED-MARKER 공유 승인 전 초안. 접수 혼잡 대응 메모.",
      keywords: ["접수", "혼잡", "줄", "명단", "밀렸"],
      visibility: "shared", sharingApproved: false, status: "draft", synthetic: true,
    },
    {
      id: "evd-other-internal", eventId: "ev-2026-other", orgId: "other", kind: "retro",
      label: "가상 C 학회 내부 회고", section: "접수",
      excerpt: "OTHER-ORG-MARKER 타 조직 내부 문서. 접수 줄 혼잡 회고.",
      keywords: ["접수", "혼잡", "줄", "명단", "밀렸"],
      visibility: "internal", sharingApproved: false, status: "verified", synthetic: true,
    },
    // ---- 신입생 OT: 우리 조직 기록. rationale(판단 이유)이 null이면 "무엇을 했는가"만 있고 "왜"는 없는 자료다. ----
    {
      id: "evd-ot-retro", eventId: "ev-ot-2026-own", orgId: "tomatoes", kind: "retro",
      label: "2026 신입생 OT 회고", section: "프로그램 구성",
      excerpt: "프로그램 5개(아이스브레이킹·조별 미션·선배와의 대화·캠퍼스 투어·레크리에이션)를 운영했다. 후반 두 프로그램은 시간이 밀려 줄여서 진행했다.",
      keywords: ["OT", "오티", "오리엔테이션", "신입생", "프로그램", "5개", "개수", "규모", "운영", "시간", "적당", "구성"],
      rationale: null,
      visibility: "internal", sharingApproved: false, status: "verified", synthetic: true,
    },
    {
      id: "evd-ot-minutes", eventId: "ev-ot-2026-own", orgId: "tomatoes", kind: "minutes",
      label: "2026 OT 기획 회의록", section: "프로그램 수 결정",
      excerpt: "프로그램 수는 전년도 관행대로 5개로 정했다. 왜 5개인지는 따로 논의하지 않았다.",
      keywords: ["OT", "오티", "오리엔테이션", "신입생", "프로그램", "5개", "개수", "결정", "회의", "이유", "적당"],
      rationale: null,
      visibility: "internal", sharingApproved: false, status: "verified", synthetic: true,
    },
    {
      id: "evd-ot-review", eventId: "ev-ot-2026-own", orgId: "tomatoes", kind: "review",
      label: "신입생 익명 후기", section: "OT 후기",
      excerpt: "“조별 미션이 제일 좋았는데, 프로그램이 많아서 뒤로 갈수록 지쳤어요.”",
      keywords: ["OT", "오티", "오리엔테이션", "신입생", "프로그램", "후기", "반응", "지쳤", "많", "시간", "적당"],
      rationale: null,
      visibility: "internal", sharingApproved: false, status: "verified", synthetic: true,
    },
    {
      id: "evd-ot-budget", eventId: "ev-ot-2026-own", orgId: "tomatoes", kind: "budget",
      label: "2026 OT 예산표 (가상)", section: "지출 내역",
      excerpt: "총 지출 150만원. 항목은 식사·레크리에이션 진행비·물품이다. 항목별 금액은 엑셀 원본에 있다. (가상 자료)",
      keywords: ["OT", "오티", "오리엔테이션", "신입생", "프로그램", "예산", "비용", "지출", "규모"],
      visibility: "internal", sharingApproved: false, status: "verified", synthetic: true,
    },
    {
      id: "evd-ot-survey", eventId: "ev-ot-2026-own", orgId: "tomatoes", kind: "survey",
      label: "2026 OT 만족도 조사 요약 (가상)", section: "설문 결과",
      excerpt: "전체 만족도 평균 4.2/5. 응답 수는 기록되어 있지 않다. (가상 자료)",
      keywords: ["OT", "오티", "오리엔테이션", "신입생", "프로그램", "만족도", "설문", "후기", "반응"],
      visibility: "internal", sharingApproved: false, status: "verified", synthetic: true,
    },
    {
      id: "evd-ot-attendance", eventId: "ev-ot-2026-own", orgId: "tomatoes", kind: "retro",
      label: "2026 OT 진행 중 문제 기록", section: "식사 배부",
      excerpt: "식사 배부 때 현장에서 참석자를 확인하느라 줄이 길어졌다. 담당자는 다음에는 사전 인원 확인 절차가 필요하다고 적었다.",
      keywords: ["OT", "오티", "오리엔테이션", "신입생", "프로그램", "문제", "식사", "배부", "인원", "개선", "시행착오"],
      visibility: "internal", sharingApproved: false, status: "verified", synthetic: true,
    },
    {
      id: "evd-ot-vendor", eventId: "ev-ot-2026-own", orgId: "tomatoes", kind: "vendor",
      label: "레크리에이션 업체 정보 (가상 A업체)", section: "업체",
      excerpt: "레크리에이션 진행 업체는 전년도 소개로 선정했다. 선정 이유와 비교 견적은 기록되어 있지 않다.",
      keywords: ["OT", "오티", "오리엔테이션", "신입생", "프로그램", "업체", "레크리에이션", "선정", "견적"],
      rationale: null,
      visibility: "internal", sharingApproved: false, status: "verified", synthetic: true,
    },
    // ---- 신입생 OT: 다른 조직이 공유를 승인한 카드 ----
    {
      id: "evd-ot-peer1", eventId: "ev-ot-2026-peer1", orgId: "saessak", kind: "shared-card",
      label: "새싹 동아리연합 OT 운영 카드", section: "프로그램 구성",
      excerpt: "프로그램 3개를 중간 휴식 20분과 함께 운영했다. 시간이 여유로웠다는 구성원 의견이 있었다. 정식 설문 기록은 없다.",
      keywords: ["OT", "오티", "오리엔테이션", "신입생", "프로그램", "3개", "개수", "규모", "운영", "시간", "휴식", "적당"],
      visibility: "shared", sharingApproved: true, status: "verified", synthetic: true,
    },
    {
      id: "evd-ot-peer2", eventId: "ev-ot-2026-peer2", orgId: "deptb", kind: "shared-card",
      label: "가상 B 학과 학생회 OT 운영 카드", section: "프로그램 구성",
      excerpt: "프로그램 6개를 두 구역으로 나눠 병렬 진행했다. 구역마다 담당 인력을 따로 배치했다. 참가자 반응은 정리된 기록이 없다.",
      keywords: ["OT", "오티", "오리엔테이션", "신입생", "프로그램", "6개", "개수", "규모", "운영", "병렬", "구역", "적당"],
      visibility: "shared", sharingApproved: true, status: "verified", synthetic: true,
    },
    // ---- 신입생 교류 프로그램: 다른 학생자치기구가 공유를 승인한 카드(우리 조직 기록 없음) ----
    {
      id: "evd-ex-peer1", eventId: "ev-ex-2026-peer1", orgId: "college", kind: "shared-card",
      label: "단과대 학생회 멘토링 데이 카드", section: "운영 방식·문제·개선",
      excerpt: "선배 멘토 10명과 신입생 40명을 2시간 동안 소그룹으로 묶어 진행했다. 문제: 멘토 배정이 무작위라 어색한 조가 생겼다. 개선: 다음에는 사전 설문으로 관심사를 맞췄다. 참여자 반응은 구성원 메모만 있고 정식 설문은 없다.",
      keywords: ["교류", "신입생", "프로그램", "멘토링", "선후배", "체험", "사례", "참고", "운영", "문제", "개선", "반응", "예산"],
      visibility: "shared", sharingApproved: true, status: "verified", synthetic: true,
    },
    {
      id: "evd-ex-peer2", eventId: "ev-ex-2026-peer2", orgId: "saessak", kind: "shared-card",
      label: "동아리연합회 체험 교류회 카드", section: "운영 방식·문제·개선",
      excerpt: "부스 8개를 3시간 동안 운영했다. 문제: 인기 부스에 줄이 몰려 다른 부스가 비었다. 개선: 스탬프 투어로 이동 동선을 나눴다. 예산은 부스 물품비 중심이며 정확한 금액은 공유하지 않았다.",
      keywords: ["교류", "신입생", "프로그램", "멘토링", "선후배", "체험", "사례", "참고", "운영", "문제", "개선", "반응", "예산", "부스"],
      visibility: "shared", sharingApproved: true, status: "verified", synthetic: true,
    },
    {
      id: "evd-ex-peer3", eventId: "ev-ex-2026-peer3", orgId: "deptb", kind: "shared-card",
      label: "학과 학생회 선후배 밥약 카드", section: "운영 방식·문제·개선",
      excerpt: "선후배를 짝지어 식사 약속을 잡게 했다. 문제: 일정 조율이 어려워 절반 가까이 늦게 성사됐다. 개선: 매칭 때 가능한 요일을 함께 받았다. 만족도 조사는 하지 않았다.",
      keywords: ["교류", "신입생", "프로그램", "멘토링", "선후배", "체험", "사례", "참고", "운영", "문제", "개선", "반응", "식사"],
      visibility: "shared", sharingApproved: true, status: "verified", synthetic: true,
    },
    // ↓ 교류 프로그램 권한 테스트용
    {
      id: "evd-ex-unapproved", eventId: "ev-ex-2026-peer1", orgId: "college", kind: "shared-card",
      label: "단과대 학생회 교류 내부 메모 (미승인)", section: "메모",
      excerpt: "UNAPPROVED-EX-MARKER 공유 승인 전 초안. 교류 프로그램 메모.",
      keywords: ["교류", "신입생", "프로그램", "멘토링", "선후배", "체험", "사례", "참고", "운영", "문제", "개선"],
      visibility: "shared", sharingApproved: false, status: "draft", synthetic: true,
    },
    {
      id: "evd-ex-other-internal", eventId: "ev-ex-2026-other", orgId: "other", kind: "retro",
      label: "가상 C 학회 교류 내부 회고", section: "교류",
      excerpt: "OTHER-ORG-EX-MARKER 타 조직 내부 문서. 교류 프로그램 회고.",
      keywords: ["교류", "신입생", "프로그램", "멘토링", "선후배", "체험", "사례", "참고", "운영", "문제", "개선"],
      visibility: "internal", sharingApproved: false, status: "verified", synthetic: true,
    },
    // ↓ OT 권한 테스트용: 어떤 화면·검색·출처에도 나오면 안 된다.
    {
      id: "evd-ot-peer-unapproved", eventId: "ev-ot-2026-peer1", orgId: "saessak", kind: "shared-card",
      label: "새싹 동아리연합 OT 내부 메모 (미승인)", section: "OT 메모",
      excerpt: "UNAPPROVED-OT-MARKER 공유 승인 전 초안. OT 프로그램 수 메모.",
      keywords: ["OT", "오티", "오리엔테이션", "신입생", "프로그램", "5개", "개수", "규모", "운영", "시간", "적당"],
      visibility: "shared", sharingApproved: false, status: "draft", synthetic: true,
    },
    {
      id: "evd-ot-other-internal", eventId: "ev-ot-2026-other", orgId: "other", kind: "retro",
      label: "가상 C 학회 OT 내부 회고", section: "OT",
      excerpt: "OTHER-ORG-OT-MARKER 타 조직 내부 문서. OT 프로그램 수 회고.",
      keywords: ["OT", "오티", "오리엔테이션", "신입생", "프로그램", "5개", "개수", "규모", "운영", "시간", "적당"],
      visibility: "internal", sharingApproved: false, status: "verified", synthetic: true,
    },
  ];

  const api = { ORGS, UNIVERSITY, CURRENT_ORG, EVENTS, EVIDENCES };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GT = Object.assign(root.GT || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : this);
