/* 경통넷 P0 — 규칙 기반 검색. 생성형 AI가 아니다.
 * 순서: 권한 필터 → 질의 분류 → 키워드 점수 → Answer 계약으로 반환. */
(function (root) {
  "use strict";

  const D = typeof module !== "undefined" && module.exports ? require("./data.js") : root.GT;

  // 올해 수치처럼 기록에 없는 값을 묻는 질문 (수치를 생성하지 않는다).
  const METRIC_RE = /(대기\s*시간|기다|몇\s*분|예산|비용|얼마|몇\s*명|몇\s*점|예상)/;
  const PAST_RE = /(작년|지난해|전년도|이전|과거)/; // 과거 기록을 묻는 질문은 기록이 있을 수 있다
  const TOPIC_RE = /(접수|혼잡|밀렸|밀리|줄|명단|출석|신청|입구|안내)/;
  const OT_RE = /(OT|오티|오리엔테이션|신입생|프로그램|규모)/i;
  const EX_RE = /(교류|멘토링|선후배|밥약)/;

  // 행사 유형별 비교 조건. 숫자는 나누지 않고 "우리 N / 비교 M"으로만 표기한다.
  const FIELDS_RECEPTION = [
    { key: "deskStaff", label: "접수 인력", unit: "명", kind: "int" },
    { key: "venueType", label: "장소 유형", unit: "", kind: "text" },
  ];
  const FIELDS_OT = [
    { key: "attendees", label: "참여 인원", unit: "명", kind: "int" },
    { key: "programCount", label: "프로그램 수", unit: "개", kind: "int" },
    { key: "durationMin", label: "운영 시간", unit: "분", kind: "int" },
  ];
  const SUGGESTIONS = {
    "개강총회": { options: [{ text: "사전 명단 미리 정리 + 현장 신청 QR (수기 접수 대안 병행)", basis: ["evd-own-retro", "evd-peer-card"] }, { text: "명단 확인 후 안내하는 단일 흐름", basis: ["evd-own-review"] }], note: "QR 사용이 어려운 참가자를 위한 수기 접수 대안을 남길 수 있습니다." },
    "신입생 교류 프로그램": { options: [{ text: "멘토·참가자 배정은 사전 설문으로 관심사를 맞추기 (단과대 사례의 개선안)", basis: ["evd-ex-peer1"] }, { text: "부스나 프로그램이 한쪽으로 몰리지 않게 이동 동선을 나누기 (동아리연합회 사례의 개선안)", basis: ["evd-ex-peer2"] }, { text: "우리 인원·장소에 맞는지 확인한 뒤 작은 규모로 시범 운영하기", basis: ["evd-ex-peer3"] }], note: "다른 학생자치기구의 사례는 참고 자료예요. 우리 조건에 맞는지 확인하고 담당자가 정해요." },
    "신입생 OT": { options: [{ text: "사전 참가자 조사로 현장 인원 확인 절차를 줄이는 것을 고려해 볼 수 있어요", basis: ["evd-ot-attendance"] }, { text: "5개를 유지하되 후반 프로그램 시간(쉬는 시간 포함)을 먼저 확보", basis: ["evd-ot-retro", "evd-ot-review"] }, { text: "3~4개로 줄여 프로그램당 시간을 늘리기", basis: ["evd-ot-peer1", "evd-ot-review"] }, { text: "구역을 나눠 병렬 진행 (구역별 인력 확인 필요)", basis: ["evd-ot-peer2"] }], note: "어떤 방식을 쓸지는 인원·시간·인력 조건을 보고 담당자가 정해요." },
  };

  // 접근 권한 모델(시연용 규칙표): 학교 이메일은 본인 확인용, 조직의 현직 임원 승인과 임기가 접근 권한 확인용이다.
  // 승인 대기·임기 종료·일반 재학생은 앱·웹·문서 링크·AI 검색 모두 막힌다. 실제 서버 검증은 개발 단계의 일이다.
  const ACCESS = {
    officer: { label: "현직 임원 (승인·임기 유효)", can: true, msg: "" },
    ended: { label: "임기 종료", can: false, msg: "임기가 끝나서 이 조직의 자료를 볼 수 없어요. 예전에 받은 문서 링크와 AI 검색도 함께 막혀요." },
    pending: { label: "승인 대기", can: false, msg: "현직 임원의 승인을 기다리는 중이에요. 승인 전에는 자료를 볼 수 없어요." },
    student: { label: "일반 재학생 (학교 이메일 인증만)", can: false, msg: "학교 이메일은 본인 확인용이에요. 자료는 조직의 현직 임원 승인이 있어야 열려요." },
  };

  /** 조회 가능한 근거만 반환. 내부 문서는 같은 조직만, 타 조직은 승인·검수된 공유 카드만. */
  function visibleEvidences(orgId, evidences) {
    return evidences.filter((e) => {
      if (e.orgId === orgId) return true;
      return e.visibility === "shared" && e.sharingApproved === true && e.status === "verified";
    });
  }

  function score(query, ev) {
    let s = 0;
    for (const k of ev.keywords) if (query.includes(k)) s += 1;
    return s;
  }

  /** 두 행사의 구조화 조건을 코드로 비교한다. fields를 생략하면 접수(개강총회) 조건을 쓴다. */
  function compareConditions(own, peer, fields) {
    const F = fields || FIELDS_RECEPTION;
    const ok = (event, f) => {
      const v = event && event[f.key];
      return f.kind === "int" ? Number.isInteger(v) && v >= 0 : typeof v === "string" && v.trim().length > 0;
    };
    const known = (event) => !!event && F.every((f) => ok(event, f));
    const complete = known(own) && known(peer);
    const diffs = [];
    if (own && peer) {
      for (const f of F) {
        if (own[f.key] !== peer[f.key]) {
          diffs.push({ field: f.key, label: f.label, text: `우리 ${own[f.key] ?? "미기록"}${f.unit} / 비교 ${peer[f.key] ?? "미기록"}${f.unit}` });
        }
      }
    }
    return { diffs, complete, directlyApplicable: complete && diffs.length === 0 };
  }

  /**
   * @returns Answer { scope, kind: 'evidence'|'suggestion'|'insufficient', reason?, cards[], evidenceIds[], caveats[] }
   */
  function answer(query, opts) {
    const o = Object.assign({ orgId: D.CURRENT_ORG, evidences: D.EVIDENCES, events: D.EVENTS }, opts || {});
    const q = String(query || "").trim().slice(0, 120);
    const base = { scope: o.orgId, cards: [], evidenceIds: [], caveats: [] };

    if (!q) return Object.assign(base, { kind: "insufficient", reason: "empty", caveats: ["질문을 입력해 주세요."] });

    // 0) 열람 권한이 없으면 검색 자체를 하지 않는다(권한 확인 → 검색 → 근거 표시 순서).
    const role = ACCESS[o.access || "officer"];
    if (!role || !role.can) {
      return Object.assign(base, { kind: "insufficient", reason: "no_access", caveats: [role ? role.msg : "열람 권한을 확인할 수 없어요."] });
    }

    // 1) 올해 수치처럼 근거 자체가 없는 질문 → 확인 불가 (자료 없음)
    if (METRIC_RE.test(q) && !PAST_RE.test(q)) {
      return Object.assign(base, {
        kind: "insufficient",
        reason: "no_data",
        caveats: [OT_RE.test(q)
          ? "올해 수치는 아직 기록이 없어요. 확인이 필요해요. 신청 현황을 집계한 뒤 같은 방식으로 기록해 주세요."
          : "아직 산정할 기록이 없습니다. 같은 방식으로 실제 대기시간을 측정해 주세요."],
      });
    }

    // 2) 주제 없음 → 사례 없음
    if (!EX_RE.test(q) && !OT_RE.test(q) && !TOPIC_RE.test(q)) {
      return Object.assign(base, { kind: "insufficient", reason: "no_case", caveats: ["이 시연 자료에서 해당 사례를 찾지 못했습니다. 신입생 OT 프로그램이나 접수 혼잡 관련 질문을 해 보세요."] });
    }
    const type = EX_RE.test(q) ? "신입생 교류 프로그램" : OT_RE.test(q) ? "신입생 OT" : "개강총회";
    const fields = type === "개강총회" ? FIELDS_RECEPTION : FIELDS_OT;
    const evOf = (id) => o.events.find((e) => e.id === id);

    // 3) 권한 필터 후 점수 검색 — 반환 가능한 근거 ID만 허용
    const allowed = visibleEvidences(o.orgId, o.evidences);
    const hits = allowed
      .map((ev) => ({ ev, s: score(q, ev) }))
      .filter((h) => { const e = o.events.find((x) => x.id === h.ev.eventId); return h.s > 0 && (!e || e.type === type); })
      .sort((a, b) => b.s - a.s || a.ev.id.localeCompare(b.ev.id));

    if (!hits.length) {
      return Object.assign(base, { kind: "insufficient", reason: "no_case", caveats: ["조건에 맞는 사례를 찾지 못했습니다."] });
    }

    const own = hits.filter((h) => h.ev.orgId === o.orgId).map((h) => h.ev);
    const peers = hits.filter((h) => h.ev.orgId !== o.orgId).map((h) => h.ev);


    const ownEvent = own.length ? evOf(own[0].eventId) : null;
    const peerEvent = peers.length ? evOf(peers[0].eventId) : null;
    const cmp = compareConditions(ownEvent, peerEvent, fields);
    const peerEventIds = [...new Set(peers.map((e) => e.eventId))];

    const caveats = [];
    if (!cmp.complete) caveats.push("비교할 행사 또는 조건 기록이 부족해 적용 가능 여부를 판단할 수 없습니다.");
    if (peers.length && !cmp.directlyApplicable) {
      caveats.push(`비슷한 행사 유형이어도 조건(${fields.map((f) => f.label).join("·")})이 달라 비교 사례를 그대로 적용하지 않습니다.`);
      caveats.push("비교 사례의 방식이 우리 조직보다 낫다는 근거는 없습니다.");
    }
    // 자료는 있으나 판단 이유가 기록에 없는 경우: 추측하지 않고 확인이 필요하다고 안내한다.
    if (/(왜|이유|적당)/.test(q) && own.some((e) => "rationale" in e) && own.every((e) => !e.rationale)) {
      caveats.push("작년에 그렇게 정한 이유는 기록에 없어요. 확인이 필요해요. (전 담당자에게 확인하거나, 이번에는 이유를 함께 기록해 두세요.)");
    }
    if (!peers.length) caveats.push("공유 승인된 다른 조직 사례가 없습니다. (사례 없음)");
    if (!own.length) {
      caveats.push("우리 조직 기록에서는 관련 근거를 찾지 못했습니다.");
      if (peers.length) {
        // 우리 기록이 없을 때는 '조건이 달라서'가 아니라 '우리 조건을 아직 모른다'가 정확한 이유다.
        caveats.length = 0;
        caveats.push("우리 조직에는 비슷한 행사 기록이 아직 없어요. 다른 학생자치기구의 사례를 참고 자료로 보여 드려요.");
        caveats.push("우리 인원·장소·시간 조건을 아직 몰라서 그대로 적용할 수 있는지는 확인이 필요해요.");
        caveats.push("비교 사례의 방식이 우리 조직보다 낫다는 근거는 없습니다.");
      }
    }

    // 여러 자료를 한 흐름(규모 → 예산·업체 → 결과 → 문제 → 개선점)으로 종합한다. 문장마다 출처 근거가 있을 때만 쓴다.
    const okIds = new Set(allowed.map((e) => e.id));
    const cite = (ids) => ids.filter((id) => okIds.has(id));
    const st = ownEvent && ownEvent.structured;
    const lines = [];
    const add = (label, text, ids) => { const c = cite(ids); if (c.length === ids.length) lines.push({ label, text, evidenceIds: c }); };
    if (type === "신입생 OT" && ownEvent && st) {
      if (Number.isInteger(ownEvent.attendees) && Number.isInteger(ownEvent.programCount) && Number.isInteger(ownEvent.durationMin)) add("결정", `지난해에는 ${ownEvent.attendees}명이 참여했고 프로그램 ${ownEvent.programCount}개를 ${ownEvent.durationMin}분 동안 운영했어요.`, ["evd-ot-retro"]);
      if (Number.isInteger(st.budgetMan) && st.vendor) add("예산·업체", `예산은 ${st.budgetMan}만원이 쓰였고 ${st.vendor}를 이용했어요.`, ["evd-ot-budget", "evd-ot-vendor"]);
      if (typeof st.satisfaction === "number") add("결과", `전반적인 만족도는 ${st.satisfaction}/5였지만 후기에는 뒤로 갈수록 지쳤다는 반응이 있어요.`, ["evd-ot-survey", "evd-ot-review"]);
      if (st.issue) add("문제", `${st.issue} — 식사 배부 때 현장에서 참석자를 확인하느라 줄이 길어졌어요.`, ["evd-ot-attendance"]);
      if (st.opinion) add("개선점", `담당자는 “${st.opinion}”라고 기록했어요.`, ["evd-ot-attendance"]);
    }
    const summary = lines.length ? { title: "여러 자료를 하나로 종합했어요", lines } : null;

    // 규모 조건("100명 정도")이 있으면 키워드가 아니라 참여 인원이 가까운 순으로 사례를 정렬한다.
    const m = q.match(/(\d{1,4})\s*명/);
    let similar = null;
    if (m && type !== "개강총회") {
      const target = Number(m[1]);
      const seen = new Set(hits.map((h) => h.ev.eventId));
      const list = [...seen].map((id) => evOf(id)).filter((e) => e && Number.isInteger(e.attendees))
        .map((e) => ({ eventId: e.id, title: e.title, orgId: e.orgId, attendees: e.attendees, gap: Math.abs(e.attendees - target) }))
        .sort((a, b) => a.gap - b.gap || a.title.localeCompare(b.title));
      if (list.length) similar = { target, list };
    }

    const sug = peers.length ? SUGGESTIONS[type] : null;
    return {
      scope: o.orgId,
      kind: "evidence",
      cards: [
        { type: "own", evidenceIds: own.map((e) => e.id) },
        { type: "peer", evidenceIds: peers.map((e) => e.id) },
        { type: "conditions", diffs: cmp.diffs, complete: cmp.complete, directlyApplicable: cmp.directlyApplicable, all: peerEventIds.map((id) => {
          const pe = evOf(id);
          const facts = pe ? fields.filter((f) => f.kind === "int").map((f) => `${f.label} ${Number.isInteger(pe[f.key]) ? pe[f.key] + f.unit : "미기록"}`).join(" · ") : "";
          return Object.assign({ eventId: id, title: pe ? pe.title : id, facts }, compareConditions(ownEvent, pe, fields));
        }) },
      ],
      evidenceIds: hits.map((h) => h.ev.id),
      caveats,
      eventType: type,
      summary,
      similar,
      suggestion: sug ? { label: "제안", note: sug.note, options: sug.options.map((x) => x.text), basis: sug.options.map((x) => cite(x.basis)) } : null,
    };
  }

  const api = { ACCESS, visibleEvidences, compareConditions, answer };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GT = Object.assign(root.GT || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : this);
