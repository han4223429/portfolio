/* 경통넷 앱 — 해시 라우터 기반 멀티 화면 + 시연 모드.
 * 화면: #/home #/ask #/evidence/<id> #/decisions #/decisions/new #/demo #/demo/start #/more
 * 사용자 입력·저장값은 textContent로만 렌더링한다. 시연 데이터는 메모리에만 두고 실제 저장소와 분리한다. */
(function () {
  "use strict";
  const G = window.GT;
  const { $, el, mascotImg, mascotSrc, reducedMotion, wait, celebrate } = G.ui;
  const sc = () => G.SCENARIOS[(S.demo && S.demo.sid) || "mvp"];

  const requestedMode = new URLSearchParams(location.search).get("view");
  const mode = ["auto", "phone", "embed"].includes(requestedMode) ? requestedMode : "auto";
  document.body.classList.add("mode-" + mode);

  let storage = null;
  try { storage = window.localStorage; storage.getItem("x"); } catch { storage = null; }
  const realStore = G.createStore(storage);
  const demoStore = G.createStore(null); // 시연 전용(메모리)
  const S = { access: "officer", demo: null, q: "", answer: null, draft: null, busy: false, installEvt: null };
  const store = () => (S.demo ? demoStore : realStore);
  const evById = (id) => G.EVIDENCES.find((e) => e.id === id);
  const view = () => $("view");

  /* ---------- 공용 UI ---------- */
  let toastTimer = null;
  function toast(text) {
    const t = $("toast");
    t.replaceChildren(mascotImg("green", "cheer", true), el("span", { text }));
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 3500);
  }
  function notice(cls, color, expr, title, body) {
    const msg = el("div", { class: "msg" }, [el("strong", { text: title })]);
    if (body) msg.append(el("span", { text: body }));
    return el("div", { class: "notice " + cls, role: "status" }, [mascotImg(color, expr, true), msg]);
  }
  function reportSave(r) {
    if (r && r.ok !== false) celebrate();
    toast(r.persisted || S.demo ? (S.demo ? "시연 안에서 저장했어요." : "이 브라우저에 저장됐습니다.") : "브라우저에 저장하지 못해 현재 화면에만 보관합니다. 새로고침하면 이번 변경은 사라집니다.");
  }
  function screenTitle(text, sub) {
    return el("div", { class: "screen-head" }, [el("h1", { text, tabindex: "-1" }), sub ? el("p", { class: "hint", text: sub }) : null].filter(Boolean));
  }

  /* ---------- 네비게이션 ---------- */
  let rendered = null;
  let firstRender = true;
  function navigate(hash) {
    if (location.hash !== hash) location.hash = hash;
    if (rendered !== hash) render();
  }
  window.addEventListener("hashchange", () => { if (rendered !== (location.hash || "#/home")) render(); });

  const TABS = { home: ["green", "default", "홈"], archive: ["red", "default", "기록"], ask: ["yellow", "think", "찾기"], decisions: ["red", "happy", "결정"], demo: ["red", "cheer", "시연"], more: ["green", "sleepy", "더보기"] };
  function paintTabs(active) {
    document.querySelectorAll("[data-tab]").forEach((a) => {
      const key = a.dataset.tab, on = key === active;
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
      const img = a.querySelector("img");
      const t = TABS[key];
      img.src = mascotSrc(t[0], t[1], on);
    });
  }

  function render() {
    const hash = location.hash || "#/home";
    rendered = hash;
    const p = hash.replace(/^#/, "").split("/").filter(Boolean);
    view().replaceChildren();
    let meta;
    switch (p[0]) {
      case "archive": meta = viewArchive(); break;
      case "how": meta = viewHow(); break;
      case "ask": meta = viewAsk(); break;
      case "evidence": meta = viewEvidence(p[1]); break;
      case "decisions": meta = p[1] === "new" ? viewNewDecision() : viewDecisions(); break;
      case "demo":
        if (p[1] === "start") { const sid = p[2] === "ot" ? "ot" : "mvp"; history.replaceState(null, "", "#/demo"); rendered = "#/demo"; meta = viewDemo(); splashDone.then(() => startDemo(0, sid)); }
        else meta = viewDemo();
        break;
      case "more": meta = viewMore(); break;
      default: meta = viewHome();
    }
    $("appTitle").textContent = meta.title;
    document.title = `${meta.title} · 경통넷`;
    const back = $("backBtn");
    back.hidden = !meta.back;
    back.onclick = () => { if (meta.back) navigate(meta.back); };
    paintTabs(meta.tab);
    const vw = view(); vw.classList.remove("enter"); void vw.offsetWidth; vw.classList.add("enter");
    $("view").scrollTop = 0;
    window.scrollTo(0, 0);
    if (!firstRender) { const h = view().querySelector("h1"); if (h) h.focus({ preventScroll: true }); }
    firstRender = false;
  }

  /* ---------- 홈 ---------- */
  function viewHome() {
    const v = view();
    const list = store().list();
    const count = (s) => list.filter((a) => a.status === s).length;
    const cycleHref = { record: "#/archive", know: "#/archive", ask: "#/ask", find: "#/ask", compare: "#/ask", use: "#/decisions/new", rerecord: "#/decisions" };
    v.append(
      el("section", { class: "hero-mini" }, [
        el("div", { class: "hero-text" }, [
          el("span", { class: "kicker", text: `${G.UNIVERSITY} · ${G.ORGS.tomatoes.name}` }),
          el("h1", { text: "안녕하세요, 신임 담당자님!", tabindex: "-1" }),
          el("p", { text: "자료는 있는데 ‘왜’가 없다면, 경통넷에게 물어보세요." }),
        ]),
        el("div", { class: "crew-mini", "aria-hidden": "true" }, [mascotImg("yellow", "think", true), mascotImg("red", "happy", true), mascotImg("green", "default", true)]),
      ]),
      el("section", { class: "card yellow", "aria-labelledby": "evh" }, [
        el("span", { class: "tag", text: "올해 행사 · 가상" }),
        el("h2", { id: "evh", text: "2027 신입생 행사 준비" }),
        el("p", { class: "quote", text: "작년 OT 자료: 프로그램 5개 운영 (왜 5개인지 이유 기록 없음)" }),
        el("a", { class: "btn small primary", href: "#/ask", text: "“왜 5개였지?” 물어보기" }),
      ]),
      el("section", { class: "card", "aria-labelledby": "cyh" }, [
        el("span", { class: "tag", text: "경험의 순환 구조" }),
        el("h2", { id: "cyh", text: "기록이 쌓일수록 다음 기수가 든든해져요" }),
        el("ol", { class: "cycle" }, G.CYCLE.map((c, i) => el("li", {}, [
          el("a", { href: cycleHref[c.key] }, [mascotImg(c.mascot[0], c.mascot[1], false), el("span", {}, [el("strong", { text: `${i + 1}. ${c.label}` }), el("small", { text: c.text })])]),
        ]))),
        el("p", { class: "hint", text: "AI는 결정을 대신하지 않아요. 담당자가 더 나은 결정을 하도록 과거와 다른 학생자치기구의 경험을 찾아 줘요." }),
        el("a", { class: "btn small", href: "#/how", text: "AI 작동 방식 보기" }),
      ]),
      mvpStrip(),
      contrastCard(),
      scopeCard(),
      el("section", { class: "quick", "aria-label": "바로가기" }, [
        quick("#/ask", "yellow", "think", "기록 찾기", "근거와 사례 보기"),
        quick("#/decisions/new", "red", "happy", "결정 남기기", "담당·기한·지표"),
        quick("#/demo", "red", "cheer", "시연 보기", "시나리오 따라가기"),
      ]),
      el("section", { class: "card", "aria-labelledby": "sumh" }, [
        el("span", { class: "tag", text: S.demo ? "시연 데이터" : "내 결정 요약" }),
        el("h2", { id: "sumh", text: list.length ? `결정 ${list.length}건` : "아직 결정이 없어요" }),
        el("p", { class: "hint", text: `검토 ${count("검토")} · 채택 ${count("채택")} · 보류 ${count("보류")} · 실행 ${count("실행")} · 결과기록 ${count("결과기록")}` }),
        el("a", { class: "btn small", href: "#/decisions", text: "결정 목록 보기" }),
      ]),
    );
    return { title: "홈", tab: "home" };
  }

  /* ---------- 기록 모음(STEP 1 기록 · STEP 2 AI 지식화) ---------- */
  function viewArchive() {
    const v = view();
    const roleNow = G.ACCESS[S.access] || G.ACCESS.officer;
    if (!roleNow.can) {
      v.append(screenTitle("기록 모음"), notice("insufficient", "red", "wow", "열람 권한이 없어요", roleNow.msg));
      return { title: "기록", tab: "archive" };
    }
    const vis = G.visibleEvidences(G.CURRENT_ORG, G.EVIDENCES);
    const own = vis.filter((e) => e.orgId === G.CURRENT_ORG);
    const kinds = Object.keys(KIND).filter((k) => k !== "shared-card");
    v.append(
      screenTitle("기록 모음", "1 기록 → 2 AI 지식화 단계예요. 드라이브는 자료를 보관하는 곳, 경통넷은 그 자료를 의사결정에 쓰게 돕는 곳이에요."),
      scopeCard(),
      el("section", { class: "card", "aria-labelledby": "ak" }, [
        el("span", { class: "tag", text: "쌓인 기록 · 가상" }), el("h2", { id: "ak", text: "우리 조직 자료 종류" }),
        el("div", { class: "row gap" }, kinds.map((k) => el("span", { class: "pill", text: `${KIND[k]} ${own.filter((e) => e.kind === k).length}건` }))),
        el("p", { class: "hint", text: "학생회에서 이미 만드는 자료를 그대로 쌓는 방식이에요. 새로 만들 필요가 없어요." }),
      ]),
      structuredCard(),
      el("div", { id: "archive-links", class: "stack" }, [el("h2", { class: "plain", text: "행사별로 연결된 경험" })]),
    );
    const box = $("archive-links");
    const events = G.EVENTS.filter((e) => e.orgId === G.CURRENT_ORG && own.some((x) => x.eventId === e.id));
    for (const e of events) {
      const items = own.filter((x) => x.eventId === e.id);
      const facts = [e.attendees != null ? `${e.attendees}명` : null, e.programCount != null ? `프로그램 ${e.programCount}개` : null, e.durationMin != null ? `${e.durationMin}분` : null, e.deskStaff != null ? `접수 인력 ${e.deskStaff}명` : null].filter(Boolean);
      const card = el("article", { class: "card " + (e.type === "신입생 OT" ? "yellow" : "") }, [
        el("span", { class: "tag", text: e.type }), el("h3", { text: e.title }),
        el("p", { class: "hint", text: facts.length ? "조건: " + facts.join(" · ") : "조건 기록 없음" }),
      ]);
      for (const it of items) {
        const hasWhy = "rationale" in it;
        card.append(el("div", { class: "stack link-item" }, [
          el("div", {}, [el("span", { class: "pill", text: KIND[it.kind] || "자료" }), el("strong", { text: it.label })]),
          hasWhy ? el("span", { class: "pill warn", text: it.rationale ? "판단 이유 있음" : "판단 이유 기록 없음" }) : null,
          el("a", { class: "btn small", href: `#/evidence/${encodeURIComponent(it.id)}`, text: "원문 열기" }),
        ].filter(Boolean)));
      }
      box.append(card);
    }
    const shared = vis.filter((e) => e.orgId !== G.CURRENT_ORG);
    box.append(el("h2", { class: "plain", text: "공유 승인된 다른 조직 사례" }));
    for (const it of shared) box.append(el("div", { class: "stack link-item" }, [el("div", {}, [el("span", { class: "pill", text: "공유 카드" }), el("strong", { text: it.label })]), el("a", { class: "btn small", href: `#/evidence/${encodeURIComponent(it.id)}`, text: "원문 열기" })]));
    box.append(el("a", { class: "btn primary", href: "#/ask", text: "이 기록으로 질문하기 →" }));
    return { title: "기록", tab: "archive" };
  }
  /* 출처 링크: 문장마다 어떤 자료에서 확인된 내용인지 보여 주고 원문으로 연결한다. */
  function srcLinks(ids) {
    return el("p", { class: "src-links" }, [el("span", { class: "hint", text: "근거:" }), ...ids.map((id) => {
      const ev = evById(id);
      return el("a", { class: "src-chip", href: `#/evidence/${encodeURIComponent(id)}`, text: ev ? ev.label : id });
    })]);
  }
  function summaryCard(sm) {
    return el("section", { class: "card yellow summary", id: "card-summary", "aria-labelledby": "smh" }, [
      mascotImg("yellow", "happy", true, "mini"),
      el("span", { class: "tag", text: "AI 종합 · 규칙 기반 시연" }), el("h2", { id: "smh", text: sm.title }),
      ...sm.lines.map((l) => el("div", { class: "sum-line" }, [el("span", { class: "pill", text: l.label }), el("p", { text: l.text }), srcLinks(l.evidenceIds)])),
      el("p", { class: "hint", text: "찾은 자료만 근거로 쓰고 근거가 없는 내용은 만들지 않아요." }),
      (() => { const b = el("button", { type: "button", class: "btn small", text: "요약 복사" }); b.addEventListener("click", () => copyText(summaryText(sm, S.q), "요약을 복사했어요.")); return b; })(),
    ]);
  }
  function similarCard(sim) {
    return el("section", { class: "card", id: "card-similar", "aria-labelledby": "sih" }, [
      el("span", { class: "tag", text: "비슷한 사례 순서" }), el("h2", { id: "sih", text: `참여 인원 ${sim.target}명 기준` }),
      el("p", { class: "hint", text: "참여 인원 같은 조건이 가까운 순서로 보여 줘요." }),
      el("ol", { class: "sim-list" }, sim.list.map((x) => el("li", {}, [el("strong", { text: x.title }), el("span", { class: "pill", text: `${x.attendees}명 · ${x.gap === 0 ? "같음" : "차이 " + x.gap}` })]))),
    ]);
  }
  function structuredCard() {
    const ev = G.EVENTS.find((e) => e.id === "ev-ot-2026-own");
    const st = ev.structured;
    const rows = [
      ["행사명", "2026 신입생 OT", ["evd-ot-retro"]],
      ["행사 유형", ev.type, ["evd-ot-retro"]],
      ["참여 인원", `${ev.attendees}명`, ["evd-ot-retro"]],
      ["예산", `${st.budgetMan}만원 (가상)`, ["evd-ot-budget"]],
      ["업체", st.vendor, ["evd-ot-vendor"]],
      ["진행 방식", `프로그램 ${ev.programCount}개 · ${ev.durationMin}분 · ${ev.venueType}`, ["evd-ot-retro"]],
      ["문제점", st.issue, ["evd-ot-attendance"]],
      ["학생 반응", `만족도 ${st.satisfaction}/5 (가상) · 뒤로 갈수록 지쳤다는 후기`, ["evd-ot-survey", "evd-ot-review"]],
      ["개선점", st.opinion, ["evd-ot-attendance"]],
    ];
    return el("section", { class: "card green", id: "archive-structured", "aria-labelledby": "sth" }, [
      mascotImg("green", "think", true, "mini"),
      el("span", { class: "tag", text: "AI 구조화 결과 · 가상 예시" }), el("h2", { id: "sth", text: "흩어진 자료가 한 행사로 묶여요" }),
      el("div", { class: "row gap" }, ["PDF", "한글 문서", "엑셀", "설문 결과"].map((t) => el("span", { class: "pill", text: t }))),
      el("dl", { class: "kv" }, rows.flatMap(([k, v, ids]) => [el("dt", { text: k }), el("dd", {}, [el("span", { text: v }), srcLinks(ids)])])),
      el("p", { class: "hint", text: "값마다 출처 자료가 붙어요. 출처가 없는 값은 비워 둬요." }),
    ]);
  }

  /* ---------- 권한 시연 ---------- */
  function paintAccessPill() {
    const pill = $("accessPill"); if (!pill) return;
    const r = G.ACCESS[S.access];
    pill.hidden = S.access === "officer";
    pill.textContent = r ? "권한 시연: " + r.label.split(" (")[0] : "";
  }
  function accessCard() {
    const box = el("fieldset", { class: "access-sim" }, [el("legend", { text: "시연: 내 권한 바꿔 보기" })]);
    for (const [key, r] of Object.entries(G.ACCESS)) {
      const id = "acc-" + key;
      const input = el("input", { type: "radio", name: "access", id, value: key, checked: S.access === key });
      input.addEventListener("change", () => { if (S.demo) { toast("시연 중에는 권한을 바꿀 수 없어요."); render(); return; } askToken++; S.access = key; S.answer = null; S.draft = null; paintAccessPill(); render(); });
      box.append(el("label", { for: id, class: "radio-row" }, [input, el("span", {}, [el("strong", { text: r.label }), el("small", { text: r.can ? "자료 검색·원문 열람 가능" : r.msg })])]));
    }
    return el("article", { class: "card green" }, [mascotImg("green", "think", false, "mini"), el("span", { class: "tag", text: "접근 권한 시연" }), el("h2", { text: "임기가 끝나면 어떻게 될까?" }),
      el("p", { class: "hint", text: "권한을 바꾼 뒤 ‘찾기’나 ‘기록’ 탭에서 확인해 보세요. 시연용 규칙표예요." }), box]);
  }
  function trustCards() {
    const am = G.ACCESS_MODEL, rs = G.RESEARCH;
    return [
      el("article", { class: "card yellow" }, [mascotImg("yellow", "happy", true, "mini"), el("span", { class: "tag", text: "믿고 쓰기 위한 설계" }), el("h2", { text: "AI를 이렇게 다뤄요" }),
        el("ol", { class: "flow" }, G.TRUST.map((t, i) => el("li", {}, [el("strong", { text: `${i + 1}. ${t.title}` }), el("span", { text: t.text })])))]),
      el("article", { class: "card green" }, [mascotImg("green", "think", true, "mini"), el("span", { class: "tag", text: "접근 권한 설계" }), el("h2", { text: "신원 확인과 접근 권한을 나눠요" }),
        el("div", { class: "contrast" }, [
          el("div", { class: "contrast-item before" }, [el("strong", { text: am.identity.title }), el("p", { text: am.identity.role })]),
          el("div", { class: "contrast-item after" }, [el("strong", { text: am.authority.title }), el("p", { text: am.authority.role })]),
        ]),
        el("ul", { class: "plainlist" }, am.rules.map((r) => el("li", { text: r }))),
        el("p", { class: "hint", text: am.note }), el("a", { class: "btn small", href: "#/more", text: "권한 바꿔 보기" })]),
      el("article", { class: "card" }, [mascotImg("red", "default", false, "mini"), el("span", { class: "tag", text: "문제의 출발점" }), el("h2", { text: "기록은 중요한데 관리는 못 미쳐요" }),
        el("p", { text: rs.text }), el("p", { class: "hint", text: rs.limit }), el("p", { class: "hint", text: "출처: " + rs.cite })]),
    ];
  }
  function mvpStrip() {
    return el("section", { class: "card", "aria-labelledby": "mvph" }, [
      el("span", { class: "tag", text: "이번 MVP" }), el("h2", { id: "mvph", text: "세 단계로 좁혔어요" }),
      el("ol", { class: "cycle" }, G.MVP3.map((m, i) => el("li", {}, [el("a", { href: ["#/ask", "#/ask", "#/decisions/new"][i] }, [mascotImg(m.mascot[0], m.mascot[1], false), el("span", {}, [el("strong", { text: `${i + 1}. ${m.label}` }), el("small", { text: m.text })])])]))),
      el("p", { class: "hint", text: "시연용 프로토타입이에요. 실제 문서 검색과 계정 권한 연동은 개발 단계에서 검증할 예정이에요." }),
    ]);
  }

  /* ---------- 작동 방식 ---------- */
  function viewHow() {
    const v = view();
    v.append(
      screenTitle("작동 방식", "AI가 흩어진 자료를 이해하고 질문에 맞는 과거 경험을 연결해 줘요."),
      el("article", { class: "card" }, [mascotImg("green", "think", true, "mini"), el("span", { class: "tag", text: "AI 기술 흐름" }), el("h2", { text: "자료에서 의사결정 지원까지" }),
        el("ol", { class: "flow" }, G.TECH_FLOW.map((f, i) => el("li", {}, [el("strong", { text: `${i + 1}. ${f.label}` }), el("span", { text: f.note })])))]),
      el("article", { class: "card yellow" }, [mascotImg("yellow", "happy", true, "mini"), el("span", { class: "tag", text: "근거와 출처" }), el("h2", { text: "AI가 지어내지 않게" }),
        el("p", { text: "답변마다 어떤 행사 자료와 회의록에서 확인된 내용인지 함께 보여 줘요. 근거를 찾지 못하면 추측하지 않고 ‘확인이 필요해요’라고 답해요." }),
        el("p", { text: "다른 학생자치기구의 자료는 권한과 공개 범위를 정한 자료, 즉 공유 승인된 자료만 써요. 승인 전이거나 비공개인 자료는 제목과 내용 모두 보이지 않아요." })]),
      el("article", { class: "card red" }, [mascotImg("red", "default", true, "mini"), el("span", { class: "tag", text: "역할" }), el("h2", { text: "결정은 사람이 해요" }),
        el("div", { class: "contrast" }, [
          el("div", { class: "contrast-item before" }, [el("strong", { text: "AI = 의사결정자" }), el("p", { text: "아니에요" })]),
          el("div", { class: "contrast-item after" }, [el("strong", { text: "AI = 경험을 찾아 주는 의사결정 지원 도구" }), el("p", { text: "과거 자료 찾기 → 경험 연결 → 유사 사례 비교 → 시행착오·개선점 보여 주기. 방식·예산·업체는 담당자가 정해요." })]),
        ])]),
      ...trustCards(),
      el("article", { class: "card" }, [el("span", { class: "tag", text: "이 시연에 대해" }), el("h2", { text: "규칙 기반으로 보여 드려요" }),
        el("p", { text: "이 시연은 고정된 가상 자료를 규칙으로 검색해요. 실제 서비스는 RAG(검색증강생성) 방식으로 필요한 과거 자료를 먼저 검색하고 검색된 자료만 근거로 답변을 만들어요. 생성형 AI와 서버는 연결되어 있지 않아요." })]),
    );
    return { title: "작동 방식", tab: "more", back: "#/more" };
  }

  /* ---------- 내보내기·복사 ---------- */
  function copyText(text, okMsg) {
    let settled = false;
    const done = () => { if (!settled) { settled = true; toast(okMsg); } };
    const fail = () => { if (!settled) { settled = true; toast("복사하지 못했어요. 직접 선택해서 복사해 주세요."); } };
    const fallback = () => {
      const ta = el("textarea", { "aria-hidden": "true", style: "position:fixed;left:-9999px" }); ta.value = text; document.body.append(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch { ok = false; }
      ta.remove();
      if (ok) done(); else fail();
    };
    if (navigator.clipboard && window.isSecureContext) {
      // 포커스가 없을 때 응답이 오지 않을 수 있어 시간 제한을 두고 대체 방식으로 넘어간다.
      const timer = setTimeout(() => { if (!settled) fallback(); }, 800);
      navigator.clipboard.writeText(text).then(() => { clearTimeout(timer); done(); }, () => { clearTimeout(timer); if (!settled) fallback(); });
    } else fallback();
  }
  function summaryText(sm, q) {
    const lines = sm.lines.map((l) => `- [${l.label}] ${l.text} (근거: ${l.evidenceIds.map((id) => (evById(id) || {}).label || id).join(", ")})`);
    return [`[경통넷 요약 · 가상 자료 기반 시연]`, q ? `질문: ${q}` : "", ...lines, "※ 찾은 자료만 근거로 쓴 요약이에요. 결정은 담당자가 해요."].filter(Boolean).join("\n");
  }
  function handoverMarkdown(list) {
    const d = new Date(); const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const out = [`# 경통넷 인수인계 요약`, `${G.UNIVERSITY} · ${G.ORGS.tomatoes.name} · ${date}`, `*가상 자료 기반 시연으로 만든 요약입니다.*`, ""];
    list.forEach((a, i) => {
      out.push(`## 결정 ${i + 1}`, `- 결정: ${a.title}`, `- 담당: ${a.ownerRole || "미지정"} · 기한: ${a.dueDate || "미정"} · 확인 지표: ${a.measure || "미정"}`, `- 상태: ${a.status}`, `- 결과: ${a.outcome === null ? "미측정" : a.outcome}`);
      if (a.evidenceIds.length) out.push(`- 근거: ${a.evidenceIds.map((id) => (evById(id) || {}).label || id).join(", ")}`);
      out.push("");
    });
    out.push("---", "AI는 결정을 대신하지 않아요. 위 결정과 결과는 담당자가 정하고 기록한 내용이에요.");
    return out.join("\n");
  }
  function downloadText(name, text) {
    const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
    const a = el("a", { href: url, download: name }); document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function contrastCard() {
    return el("section", { class: "card", "aria-labelledby": "cth" }, [
      el("span", { class: "tag", text: "인수인계가 달라져요" }), el("h2", { id: "cth", text: "자료 전달에서 경험 활용으로" }),
      el("div", { class: "contrast" }, [
        el("div", { class: "contrast-item before" }, [el("strong", { text: "기존 인수인계" }), el("p", { text: G.CONTRAST.before })]),
        el("div", { class: "contrast-item after" }, [el("strong", { text: "경통넷" }), el("p", { text: G.CONTRAST.after })]),
      ]),
    ]);
  }
  function scopeCard() {
    return el("section", { class: "card green", "aria-labelledby": "sch" }, [
      el("span", { class: "tag", text: "경험의 범위" }), el("h2", { id: "sch", text: "우리 학생회에서 학생자치기구 전체로" }),
      el("ol", { class: "scope" }, G.SCOPE.map((x) => el("li", {}, [el("strong", { text: x.label }), el("span", { text: x.sub })]))),
      el("p", { class: "hint", text: "시연에서는 우리 학생회와 가상의 다른 기구 3곳(학과·단과대·동아리연합회)만 다뤄요." }),
    ]);
  }

  function quick(href, color, expr, title, sub) {
    return el("a", { class: "quick-btn", href }, [mascotImg(color, expr, false), el("strong", { text: title }), el("span", { text: sub })]);
  }

  /* ---------- 찾기(질문·비교) ---------- */
  function viewAsk() {
    const v = view();
    const input = el("input", { id: "q", maxlength: "120", autocomplete: "off", placeholder: "예: 작년에 왜 프로그램을 5개 했지?", value: S.q || "" });
    const form = el("form", { class: "ask-form", novalidate: true }, [
      el("label", { for: "q", class: "lbl", text: "운영 질문" }),
      input,
      el("button", { type: "submit", class: "btn primary", text: "기록 찾기" }),
    ]);
    form.addEventListener("submit", (e) => { e.preventDefault(); ask(input.value); });
    const ex = el("div", { class: "row gap", role: "group", "aria-label": "예시 질문" }, [
      exBtn("OT 프로그램 수", G.QUESTION_OT), exBtn("다른 자치기구 사례", G.QUESTION_EXCHANGE), exBtn("100명 규모 행사", G.QUESTION_SIMILAR), exBtn("올해 예상 인원", G.QUESTION_MISSING), exBtn("개강총회 접수", G.QUESTION_RECEPTION),
    ]);
    function exBtn(label, q) {
      const b = el("button", { type: "button", class: "btn small", text: label });
      b.addEventListener("click", () => { input.value = q; ask(q); });
      return b;
    }
    v.append(
      screenTitle("과거 기록에서 근거 찾기"),
      form, ex,
      el("div", { id: "recent", class: "row gap" }),
      el("p", { class: "hint", text: "고정된 가상 자료를 규칙(키워드·동의어)으로 검색해요. 생성형 AI·서버·API는 연결되어 있지 않아요. 키보드 ‘/’로 바로 질문할 수 있어요." }),
      el("div", { id: "askOut" }),
    );
    if (S.answer) paintAnswer(S.answer); else $("askOut").append(notice("", "green", "default", "무엇이 궁금해요?", "질문을 입력하거나 예시 버튼을 눌러 주세요."));
    renderRecent();
    return { title: "찾기", tab: "ask" };
  }

  /* 최근 질문: 이 기기에만 저장(시연 중에는 저장하지 않음). */
  const RECENT_KEY = "gt-recent-questions";
  function getRecent() { try { const v = JSON.parse(localStorage.getItem(RECENT_KEY)); return Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim() && x.length <= 120).slice(0, 5) : []; } catch { return []; } }
  function pushRecent(q) {
    if (S.demo) return;
    try { const list = [q, ...getRecent().filter((x) => x !== q)].slice(0, 5); localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch { /* 저장 불가는 무시 */ }
  }
  function renderRecent() {
    const box = $("recent"); if (!box) return;
    box.replaceChildren();
    const list = S.demo ? [] : getRecent();
    if (!list.length) return;
    box.append(el("span", { class: "hint", text: "최근 질문:" }));
    for (const q of list) {
      const b = el("button", { type: "button", class: "btn small chip", title: q, text: q.length > 18 ? q.slice(0, 18) + "…" : q });
      b.addEventListener("click", () => { if ($("q")) $("q").value = q; ask(q); });
      box.append(b);
    }
    const clear = el("button", { type: "button", class: "btn small", "aria-label": "최근 질문 지우기", text: "지우기" });
    clear.addEventListener("click", () => { try { localStorage.removeItem(RECENT_KEY); } catch { /* 무시 */ } renderRecent(); });
    box.append(clear);
  }

  /* 검색 중 화면: 기술 흐름(질문 파악 → 과거 사례 → 다른 기구 사례 → 종합)을 단계로 보여 준다. */
  const SEARCH_STEPS = ["질문의 뜻과 조건을 파악해요", "우리 학생회의 과거 기록을 찾아요", "공유 승인된 다른 학생자치기구 사례를 찾아요", "자료를 종합하고 출처를 이어요"];
  let askToken = 0;
  async function searchingAnim(out, token) {
    const list = el("ol", { class: "search-steps" }, SEARCH_STEPS.map((t) => el("li", { text: t })));
    const live = el("div", { class: "notice loading", role: "status" }, [mascotImg("yellow", "think", true), el("div", { class: "msg" }, [el("strong", { text: "찾는 중이에요…" }), list])]);
    out.replaceChildren(live);
    const items = [...list.children];
    for (let i = 0; i < items.length; i++) {
      if (token !== askToken || out !== $("askOut")) return false;
      items[i].classList.add("on");
      await wait(300);
      items[i].classList.add("done");
    }
    await wait(120);
    return token === askToken;
  }

  /** opts.fast: 시연 중 이전 단계 재현처럼 애니메이션 없이 바로 보여 줄 때 */
  async function ask(q, opts) {
    S.q = String(q || "").trim().slice(0, 120);
    const token = ++askToken;
    S.answer = G.answer(S.q, { access: S.access });
    if (S.q.trim() && S.access === "officer") pushRecent(S.q);
    const out = $("askOut");
    if (!out) return;
    if (!(opts && opts.fast) && !reducedMotion() && S.q.trim()) { if (!(await searchingAnim(out, token))) return; }
    if (token === askToken && out === $("askOut")) { paintAnswer(S.answer); renderRecent(); }
  }

  const KIND = { retro: "회고", review: "후기", minutes: "회의록", vendor: "업체 정보", budget: "예산", survey: "만족도 조사", "shared-card": "공유 카드" };
  function evidenceCard(ev) {
    return el("div", { class: "stack" }, [
      el("div", {}, [el("span", { class: "pill", text: KIND[ev.kind] || "자료" }), ev.orgId !== G.CURRENT_ORG && G.ORGS[ev.orgId] ? el("span", { class: "pill", text: G.ORGS[ev.orgId].kind }) : null, el("strong", { text: ev.label })].filter(Boolean)),
      el("p", { class: "quote", text: ev.excerpt }),
      el("a", { class: "btn small", href: `#/evidence/${encodeURIComponent(ev.id)}`, text: "원문 열기" }),
    ]);
  }

  function paintAnswer(a, outEl) {
    const out = outEl || $("askOut");
    out.replaceChildren();
    if (a.kind === "insufficient") {
      const label = a.reason === "no_access" ? "열람 권한이 없어요" : a.reason === "no_data" ? "확인 불가 (자료 없음)" : a.reason === "no_case" ? "관련 사례 없음" : "질문이 필요해요";
      const face = a.reason === "no_access" ? ["red", "wow"] : a.reason === "no_data" ? ["red", "sad"] : a.reason === "no_case" ? ["yellow", "think"] : ["green", "default"];
      out.append(notice("insufficient", face[0], face[1], label, a.caveats[0] || ""));
      return;
    }
    out.append(notice("", "green", "happy", "근거를 찾았어요!", "근거는 참고 자료예요. 적용 여부는 우리 조직이 결정해요. ‘제안’ 카드만 제안이고 나머지는 출처가 있는 사실이에요."));
    if (a.summary) out.append(summaryCard(a.summary));
    if (a.similar) out.append(similarCard(a.similar));
    const by = Object.fromEntries(a.cards.map((c) => [c.type, c]));
    const own = el("div", { class: "stack" }), peer = el("div", { class: "stack" }), cond = el("div", { class: "stack" }), sug = el("div", { class: "stack" });
    by.own.evidenceIds.forEach((id) => own.append(evidenceCard(evById(id))));
    if (!by.own.evidenceIds.length) own.append(el("p", { class: "hint", text: "관련 기록이 없습니다." }));
    by.peer.evidenceIds.forEach((id) => peer.append(evidenceCard(evById(id))));
    if (!by.peer.evidenceIds.length) peer.append(el("p", { class: "hint", text: "공유 승인된 사례가 없습니다. (사례 없음)" }));
    const c = by.conditions;
    const list = c.all && c.all.length ? c.all : [{ title: "비교 사례", diffs: c.diffs, complete: c.complete, directlyApplicable: c.directlyApplicable }];
    for (const pe of list) {
      const box = el("div", { class: "cond-item" }, [el("strong", { text: pe.title })]);
      if (pe.facts) box.append(el("p", { class: "hint", text: "조건: " + pe.facts }));
      if (!pe.complete) box.append(el("p", { class: "hint", text: "우리 쪽 조건 기록이 부족해 적용 가능 여부를 판단할 수 없습니다. 확인이 필요해요." }));
      for (const d of pe.diffs) box.append(el("p", {}, [el("span", { class: "pill", text: d.label }), document.createTextNode(d.text)]));
      if (pe.complete && !pe.diffs.length) box.append(el("p", { class: "hint", text: "비교할 조건 차이가 없습니다." }));
      cond.append(box);
    }
    if (list.some((pe) => pe.diffs.length)) cond.append(el("p", { class: "hint", text: "조건이 달라 그대로 적용하지 않습니다. 같은 값인 항목은 표시하지 않아요." }));
    if (a.suggestion) {
      sug.append(el("span", { class: "pill", text: a.suggestion.label }));
      a.suggestion.options.forEach((o, i) => {
        const basis = (a.suggestion.basis && a.suggestion.basis[i]) || [];
        sug.append(el("div", { class: "opt" }, [el("p", { text: "• " + o }), basis.length ? srcLinks(basis) : null].filter(Boolean)));
      });
      if (a.suggestion.note) sug.append(el("p", { class: "hint", text: a.suggestion.note }));
      const b = el("button", { type: "button", class: "btn primary", text: "결정 초안으로 가져오기" });
      b.addEventListener("click", () => {
        S.draft = Object.assign({}, G.DRAFTS[a.eventType] || {}, { title: (G.DRAFTS[a.eventType] || {}).title || "" });
        navigate("#/decisions/new");
      });
      sug.append(b);
    } else sug.append(el("p", { class: "hint", text: "비교 사례가 없어 제안을 만들지 않았습니다." }));

    const card = (cls, tag, title, color, expr, body, id) => el("article", { class: "card " + cls, id }, [mascotImg(color, expr, false, "mini"), el("span", { class: "tag", text: tag }), el("h2", { text: title }), body]);
    out.append(
      el("div", { class: "cols" }, [
        card("red", "우리 조직 기록 · 가상", a.eventType === "신입생 OT" ? "2026 신입생 OT" : a.eventType === "개강총회" ? "2026 개강총회" : "비슷한 행사 기록", "red", "default", own, "card-own"),
        card("yellow", "다른 학생자치기구 사례 · 가상 · 공유 승인", "비교 사례", "yellow", "default", peer, "card-peer"),
        card("green", "조건 비교", "적용 조건 비교", "green", "think", cond, "card-conditions"),
        card("", "올해 결정 · 제안", "사람이 선택해요", "red", "happy", sug, "card-suggest"),
      ]),
    );
    if (a.caveats.length) out.append(el("ul", { class: "caveats" }, a.caveats.map((t) => el("li", { text: t }))));
  }

  /* ---------- 근거 상세 ---------- */
  function viewEvidence(rawId) {
    const v = view();
    let id = ""; try { id = decodeURIComponent(rawId || ""); } catch { id = ""; }
    const allowedRole = G.ACCESS[S.access] || G.ACCESS.officer;
    const ev = allowedRole.can ? G.visibleEvidences(G.CURRENT_ORG, G.EVIDENCES).find((e) => e.id === id) : null; // 권한 없는 근거는 제목도 노출하지 않는다
    if (!ev) {
      v.append(screenTitle("열 수 없는 근거"), notice("insufficient", "red", "wow", "근거를 열 수 없어요", allowedRole.can ? "없는 근거이거나 열람 권한이 없어요." : allowedRole.msg));
      return { title: "근거", tab: "ask", back: "#/ask" };
    }
    const event = G.EVENTS.find((x) => x.id === ev.eventId);
    v.append(
      screenTitle(ev.label),
      el("article", { class: "card " + (ev.visibility === "shared" ? "yellow" : "red") }, [
        mascotImg(ev.visibility === "shared" ? "yellow" : "red", "default", false, "mini"),
        el("span", { class: "tag", text: (ev.synthetic ? "가상 자료" : "실제 자료") + (ev.visibility === "shared" ? " · 공유 승인" : " · 우리 조직 내부") }),
        el("p", { class: "meta", text: `${event ? event.title : ""} · 항목: ${ev.section}` }),
        el("blockquote", { text: ev.excerpt }),
      ]),
      el("a", { class: "btn", href: "#/ask", text: "← 결과로 돌아가기" }),
    );
    return { title: "근거 원문", tab: "ask", back: "#/ask" };
  }

  /* ---------- 결정 ---------- */
  function viewNewDecision() {
    const v = view();
    const d = S.draft || {};
    const f = (id, label, node, cls) => el("div", { class: "field " + (cls || "") }, [el("label", { for: id, html: undefined, text: label }), node]);
    const title = el("textarea", { id: "dTitle", rows: "3", maxlength: "350", placeholder: "예: 사전 신청 명단을 정리하고 현장 신청 입력을 분리한다." });
    title.value = d.title || "";
    const owner = el("input", { id: "dOwner", maxlength: "60", placeholder: "예: 행사 접수 담당", value: d.ownerRole || "" });
    const due = el("input", { id: "dDue", type: "date", value: d.dueDate || "" });
    const measure = el("input", { id: "dMeasure", maxlength: "200", placeholder: "예: 평균 대기시간(분) 실측, 정시 시작 여부", value: d.measure || "" });
    const err = el("p", { class: "hint", role: "alert", id: "dErr" });
    const form = el("form", { class: "stack", novalidate: true }, [
      f("dTitle", "올해 결정 (필수)", title), f("dOwner", "담당 역할", owner), f("dDue", "기한", due), f("dMeasure", "확인 지표", measure),
      err, el("button", { type: "submit", class: "btn primary", text: "저장하기" }),
    ]);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const ans = S.answer && S.answer.kind === "evidence" ? S.answer.evidenceIds : [];
      const r = store().create({ title: title.value, ownerRole: owner.value, dueDate: due.value, measure: measure.value, evidenceIds: ans });
      if (!r.ok) { title.closest(".field").classList.add("invalid"); title.setAttribute("aria-invalid", "true"); err.textContent = r.error; (r.error.includes("기한") ? due : title).focus(); return; }
      S.draft = null;
      reportSave(r);
      navigate("#/decisions");
    });
    v.append(screenTitle("올해 결정 남기기", S.demo ? "시연 모드: 이 시연 안에서만 저장돼요." : "결과는 기록 전까지 ‘미측정’이에요."), form);
    return { title: "새 결정", tab: "decisions", back: "#/decisions" };
  }

  function viewDecisions() {
    const v = view();
    const list = store().list();
    v.append(screenTitle("다음 기수에게 넘길 기록", S.demo ? "시연 데이터예요. 시연을 끝내면 지워져요." : null));
    const tools = el("div", { class: "row gap no-print" }, [el("a", { class: "btn primary", href: "#/decisions/new", text: "+ 새 결정" })]);
    if (list.length) {
      const md = el("button", { type: "button", class: "btn", text: "인수인계 요약 내보내기 (.md)" });
      md.addEventListener("click", () => { downloadText("gyeongtongnet-handover.md", handoverMarkdown(list)); toast("인수인계 요약 파일을 만들었어요."); });
      const pr = el("button", { type: "button", class: "btn", text: "인쇄 / PDF로 저장" });
      pr.addEventListener("click", () => window.print());
      tools.append(md, pr);
    }
    v.append(tools);
    if (!list.length) {
      v.append(el("div", { class: "empty-state" }, [mascotImg("yellow", "sleepy", true), el("p", { text: "아직 저장된 결정이 없어요. 결과는 기록 전까지 ‘미측정’이에요." })]));
    }
    for (const a of list) v.append(actionCard(a));
    return { title: "결정", tab: "decisions" };
  }

  function actionCard(a) {
    const card = el("article", { class: "act" }, [
      el("div", {}, [el("span", { class: "state", text: "상태: " + a.status })]),
      el("p", {}, [el("strong", { text: "결정: " }), document.createTextNode(a.title)]),
      el("p", { text: `담당 ${a.ownerRole || "미지정"} · 기한 ${a.dueDate || "미정"} · 지표 ${a.measure || "미정"}` }),
    ]);
    if (a.evidenceIds.length) card.append(el("p", { class: "hint", text: "근거: " + a.evidenceIds.map((id) => (evById(id) || {}).label || id).join(", ") }));
    card.append(el("p", { class: "outcome" + (a.outcome === null ? " unmeasured" : ""), text: "결과: " + (a.outcome === null ? "미측정 (자동으로 성공 처리되지 않습니다)" : a.outcome + " (시연용 입력)") }));
    const run = (to, outcome, msgEl) => {
      const r = store().transition(a.id, to, outcome);
      if (!r.ok) { if (msgEl) msgEl.textContent = r.error; return false; }
      reportSave(r);
      render();
      return true;
    };
    if (a.status === "실행") {
      const ta = el("textarea", { rows: "2", maxlength: "400", "aria-label": "행사 후 결과", placeholder: "예: 미측정 — 행사 후 실측 예정 (시연용 가상 결과)" });
      const msg = el("span", { class: "hint", role: "status" });
      const b = el("button", { type: "button", class: "btn primary small", text: "결과 기록" });
      b.addEventListener("click", () => { if (!run("결과기록", ta.value, msg)) ta.focus(); });
      card.append(el("div", { class: "stack" }, [ta, el("div", { class: "row gap" }, [b, msg])]));
    } else if (G.NEXT[a.status].length) {
      const row = el("div", { class: "row gap" });
      for (const to of G.NEXT[a.status]) {
        const b = el("button", { type: "button", class: "btn small", text: `→ ${to}` });
        b.addEventListener("click", () => run(to));
        row.append(b);
      }
      card.append(row);
    }
    return card;
  }

  /* ---------- 시연 ---------- */
  function viewDemo() {
    const v = view();
    v.append(screenTitle("시연 시나리오", "발표용은 1분, 전체는 4분이에요. 화면을 자동으로 이동하며 설명해요."));
    for (const sid of ["mvp", "ot"]) {
      const SC = G.SCENARIOS[sid];
      const cur = S.demo && S.demo.sid === sid;
      v.append(el("article", { class: "card " + (sid === "mvp" ? "yellow" : "") }, [
        mascotImg(sid === "mvp" ? "red" : "green", "cheer", true, "mini"),
        el("span", { class: "tag", text: `${SC.short} · 약 ${SC.minutes}분 · 가상` }),
        el("h2", { text: SC.title }),
        el("p", { text: SC.summary }),
        el("ol", { class: "steps" }, SC.steps.map((s, i) => {
          const b = el("button", { type: "button", class: "step-link", text: s.title.replace(/^\d+\.\s*/, "") });
          b.addEventListener("click", () => startDemo(i, sid));
          return el("li", {}, [b]);
        })),
        el("button", { type: "button", class: "btn primary", "data-start": sid, text: cur ? "처음부터 다시 시작" : "시연 시작" }),
      ]));
    }
    v.append(
      el("ol", { class: "cycle compact", "aria-label": "경험의 순환 7단계" }, G.CYCLE.map((c, i) => el("li", {}, [el("span", { class: "pill", text: `${i + 1}. ${c.label}` })]))),
      el("p", { class: "hint", text: "시연 데이터는 이 화면 안에만 있고 실제 저장 기록과 섞이지 않아요." }),
    );
    v.querySelectorAll("[data-start]").forEach((b) => b.addEventListener("click", () => startDemo(0, b.dataset.start)));
    return { title: "시연", tab: "demo" };
  }

  function renderCoach() {
    const box = $("coach");
    if (!S.demo) { box.hidden = true; document.body.classList.remove("demo-on"); $("demoPill").hidden = true; return; }
    const i = S.demo.i, st = sc().steps[i], last = i === sc().steps.length - 1;
    box.hidden = false;
    document.body.classList.add("demo-on");
    $("demoPill").hidden = false;
    const prev = el("button", { type: "button", class: "btn small", text: "이전", disabled: i === 0 || S.busy });
    const next = el("button", { type: "button", class: "btn primary small", text: last ? "시연 끝내기" : "다음", disabled: S.busy });
    const quit = el("button", { type: "button", class: "btn small", "aria-label": "시연 종료", text: "✕" });
    prev.addEventListener("click", () => goStep(i - 1));
    next.addEventListener("click", nextStep);
    quit.addEventListener("click", () => endDemo(false));
    box.replaceChildren(
      mascotImg(st.mascot[0], st.mascot[1], true, "coach-mascot"),
      el("div", { class: "coach-body" }, [
        el("div", { class: "coach-top" }, [el("span", { class: "tag", text: `시연 ${i + 1}/${sc().steps.length} · ${st.phase}` }), quit]),
        el("strong", { text: st.title }),
        el("p", { text: st.text }),
        el("div", { class: "row gap" }, [prev, next]),
      ]),
    );
  }

  let demoToken = 0;
  async function startDemo(i, sid) {
    if (S.busy) return;
    demoToken++; askToken++;
    demoStore.reset();
    S.access = "officer"; paintAccessPill();
    S.demo = { i: 0, sid: sid === "ot" ? "ot" : "mvp" };
    S.q = ""; S.answer = null; S.draft = null;
    await goStep(i || 0);
  }

  async function goStep(i) {
    if (S.busy || !S.demo || i < 0 || i >= sc().steps.length) return;
    S.busy = true;
    const token = demoToken;
    try {
      S.demo.i = i;
      const st = sc().steps[i];
      if (st.action && st.action.type === "prefill") S.draft = st.action.draft;
      renderCoach();
      navigate(st.route);
      await wait(80);
      if (token !== demoToken || !S.demo) return;
      if (st.action && st.action.type === "ask") await demoAsk(st.action, token);
      if (token !== demoToken || !S.demo) return;
      if (st.action && st.action.type === "scroll") { const t = $(st.action.target); if (t) t.scrollIntoView({ block: "start", behavior: reducedMotion() ? "auto" : "smooth" }); }
    } finally {
      if (token === demoToken) { S.busy = false; renderCoach(); }
    }
  }

  async function demoAsk(a, token) {
    const active = () => token === demoToken && !!S.demo;
    const input = $("q");
    if (!input) return;
    if (a.instant || reducedMotion()) input.value = a.query;
    else {
      input.value = "";
      input.focus({ preventScroll: true });
      for (const ch of a.query) { if (!active()) return; input.value += ch; await wait(18); }
      await wait(250);
    }
    if (!active()) return;
    await ask(a.query, { fast: !!a.instant });
    if (!active()) return;
    if (a.scrollTo) { const t = $("card-" + a.scrollTo); if (t) t.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" }); }
  }

  async function nextStep() {
    if (S.busy || !S.demo) return;
    const i = S.demo.i, st = sc().steps[i];
    if (st.onNext && st.onNext.type === "save" && demoStore.list().length === 0) {
      const ev = G.answer(st.onNext.question || G.QUESTION_OT, { access: "officer" }).evidenceIds;
      const r = demoStore.create({ ...st.onNext.draft, evidenceIds: ev });
      if (!r.ok) { toast(r.error); return; }
      reportSave(r);
    }
    if (st.onNext && st.onNext.type === "advance") {
      for (const a of demoStore.list()) {
        for (const to of ["채택", "실행", "결과기록"]) {
          const cur = demoStore.list().find((x) => x.id === a.id);
          if (cur && G.NEXT[cur.status].includes(to)) demoStore.transition(a.id, to, st.onNext.outcome);
        }
      }
    }
    if (i === sc().steps.length - 1) return endDemo(true);
    await goStep(i + 1);
  }

  function endDemo(finished) {
    demoToken++; askToken++; S.busy = false;
    demoStore.reset();
    S.demo = null; S.q = ""; S.answer = null; S.draft = null;
    renderCoach();
    if (finished) celebrate();
    toast(finished ? "시연을 마쳤어요. 시연 데이터는 지웠어요." : "시연을 종료했어요.");
    navigate("#/demo");
    render();
  }

  /* ---------- 더보기 ---------- */
  function viewMore() {
    const v = view();
    const resetBtn = el("button", { type: "button", class: "btn", text: "저장 내용 초기화" });
    const status = el("p", { class: "hint", role: "status" });
    let timer = null;
    resetBtn.addEventListener("click", () => {
      if (resetBtn.dataset.arm !== "1") {
        resetBtn.dataset.arm = "1"; resetBtn.textContent = "정말 초기화할까요? 한 번 더 누르세요";
        timer = setTimeout(() => { resetBtn.dataset.arm = ""; resetBtn.textContent = "저장 내용 초기화"; }, 4000);
        return;
      }
      clearTimeout(timer);
      const ok = realStore.reset();
      resetBtn.dataset.arm = ""; resetBtn.textContent = "저장 내용 초기화";
      status.textContent = ok ? "저장 내용을 초기화했습니다." : "브라우저 저장 내용을 지우지 못했습니다. 기록을 유지합니다. 저장 권한을 확인해 주세요.";
    });
    const install = el("button", { type: "button", class: "btn", id: "installBtn", text: "앱으로 설치하기", hidden: !S.installEvt });
    install.addEventListener("click", async () => {
      if (!S.installEvt) return;
      S.installEvt.prompt();
      try { await S.installEvt.userChoice; } catch { /* 무시 */ }
      S.installEvt = null; install.hidden = true;
    });
    v.append(
      screenTitle("더보기"),
      accessCard(),
      el("article", { class: "card yellow" }, [mascotImg("red", "happy", true, "mini"), el("span", { class: "tag", text: "서비스 소개" }), el("h2", { text: "학생자치 경험의 순환 구조" }),
        el("p", { text: "역대 학생회와 학생자치기구의 행사 자료와 경험을 AI로 연결해요. 다음 학생회가 과거의 시행착오를 다시 겪지 않고 더 나은 의사결정을 하도록 돕는 인수인계·의사결정 지원 서비스예요." }),
        el("p", { class: "hint", text: "해결하려는 문제는 자료가 없다는 것이 아니에요. 자료는 있지만 그 자료만으로는 이전 학생회의 판단과 경험, 시행착오까지 알기 어렵다는 점이에요." })]),
      el("article", { class: "card green" }, [mascotImg("green", "default", false, "mini"), el("span", { class: "tag", text: "앱 설치" }), el("h2", { text: "홈 화면에 추가" }),
        el("p", { text: "브라우저 메뉴의 ‘앱 설치’(안드로이드·PC 크롬) 또는 공유 → ‘홈 화면에 추가’(아이폰)로 앱처럼 실행할 수 있어요. 한 번 열면 오프라인에서도 열려요." }), install]),
      el("article", { class: "card" }, [mascotImg("red", "wow", false, "mini"), el("span", { class: "tag", text: "바로가기" }), el("h2", { text: "다른 화면" }),
        el("div", { class: "stack" }, [el("a", { class: "btn", href: "#/how", text: "AI 작동 방식 보기" }), el("a", { class: "btn", href: "index.html?splash=0", text: "허브 화면으로" }), el("a", { class: "btn", href: "characters.html", text: "캐릭터 에셋 보기" })])]),
      el("article", { class: "card" }, [el("span", { class: "tag", text: "저장 데이터" }), el("h2", { text: "이 기기에 저장된 결정" }), el("p", { class: "hint", text: "시연 데이터는 포함되지 않아요." }), resetBtn, status]),
      el("p", { class: "foot", text: `${G.UNIVERSITY}·${G.ORGS.tomatoes.name}·새싹 동아리연합·가상 C 학회는 이 시연의 가상 조직입니다. 원문과 수치는 시연용이며 실제 기록이나 성과가 아닙니다. 캐릭터는 토마토들 원본을 바탕으로 한 파생 이미지이며 주최 측 공식 서비스·제휴·승인이 아닙니다. 저장은 이 브라우저의 localStorage일 뿐 인증·보안 기능이 아닙니다.` }),
    );
    return { title: "더보기", tab: "more" };
  }

  /* ---------- 시작 ---------- */
  document.addEventListener("keydown", (e) => {
    if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target; if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    if (!location.hash.startsWith("#/ask")) navigate("#/ask");
    const q = $("q"); if (q) { e.preventDefault(); q.focus(); }
  });
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); S.installEvt = e; const b = $("installBtn"); if (b) b.hidden = false; });
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register("sw.js").catch(() => {});

  document.querySelectorAll("[data-tab]").forEach((a) => { const t = TABS[a.dataset.tab]; a.querySelector("img").src = mascotSrc(t[0], t[1], false); });
  const splashDone = G.splash.run();
  paintAccessPill();
  render();
  renderCoach();
})();
