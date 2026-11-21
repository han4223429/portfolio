/* 경통넷 P0 — 조치(Action) 저장소. localStorage는 데모 상태일 뿐 보안 경계가 아니다.
 * 상태: 검토 → 채택/보류 → 실행 → 결과 기록. 결과 초기값은 null(미측정). */
(function (root) {
  "use strict";

  const KEY = "gyeongtongnet-tomatoes-p0-v1";
  const STATUS = ["검토", "채택", "보류", "실행", "결과기록"];
  const NEXT = { 검토: ["채택", "보류"], 채택: ["실행", "보류"], 보류: ["검토"], 실행: ["결과기록"], 결과기록: [] };
  const LIMITS = { title: 350, ownerRole: 60, measure: 200, outcome: 400 };

  function clean(v, max) {
    return typeof v === "string" ? v.trim().slice(0, max) : "";
  }

  function isValidAction(a) {
    const text = (v, max) => typeof v === "string" && v.length <= max;
    return !!a && typeof a === "object" && !Array.isArray(a) && text(a.id, 100) && a.id.trim().length > 0 &&
      text(a.title, LIMITS.title) && a.title.trim().length > 0 && STATUS.includes(a.status) &&
      Array.isArray(a.evidenceIds) && a.evidenceIds.length <= 32 && a.evidenceIds.every((id) => text(id, 100) && id.length > 0) &&
      (a.ownerRole === undefined || text(a.ownerRole, LIMITS.ownerRole)) &&
      (a.measure === undefined || text(a.measure, LIMITS.measure)) &&
      (a.dueDate === undefined || validDate(a.dueDate)) &&
      (a.status === "결과기록" ? text(a.outcome, LIMITS.outcome) && a.outcome.trim().length > 0 : a.outcome === null);
  }

  function validDate(value) {
    if (value === "") return true;
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
    const date = new Date(value + "T00:00:00Z");
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  /** @param storage localStorage 호환 객체(getItem/setItem/removeItem) */
  function createStore(storage) {
    let memory = [];
    let volatile = !storage;
    const clone = (list) => JSON.parse(JSON.stringify(list));
    function read() {
      if (volatile) return clone(memory);
      try {
        const raw = storage.getItem(KEY);
        let parsed;
        try { parsed = raw ? JSON.parse(raw) : []; } catch { parsed = []; }
        const ids = new Set();
        memory = Array.isArray(parsed) ? parsed.filter((a) => {
          if (!isValidAction(a) || ids.has(a.id)) return false;
          ids.add(a.id);
          return true;
        }).map((a) => ({
          id: a.id, eventId: "ev-2027-own", evidenceIds: a.evidenceIds,
          title: a.title, ownerRole: a.ownerRole || "", dueDate: a.dueDate || "", measure: a.measure || "",
          status: a.status, outcome: a.outcome,
        })) : [];
      } catch {
        volatile = true;
      }
      return clone(memory);
    }
    function write(list) {
      memory = clone(list);
      if (volatile) return false;
      try {
        storage.setItem(KEY, JSON.stringify(list));
        return true;
      } catch {
        volatile = true; // 실패 이후에는 오래된 디스크 값으로 화면 상태를 덮어쓰지 않는다.
        return false; // 저장 차단 → 호출자가 화면 전용 상태임을 알린다
      }
    }

    return {
      list: read,
      /** 새 조치 저장. title 필수. 초기 상태 '검토', 결과 미측정(null). */
      create(input) {
        const title = clean(input && input.title, LIMITS.title);
        if (!title) return { ok: false, error: "올해 결정 내용을 입력해 주세요." };
        const dueDate = input.dueDate === undefined ? "" : input.dueDate;
        if (!validDate(dueDate)) return { ok: false, error: "기한은 실제 날짜(YYYY-MM-DD)로 입력해 주세요." };
        const action = {
          id: "act-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          eventId: "ev-2027-own",
          evidenceIds: Array.isArray(input.evidenceIds) ? [...new Set(input.evidenceIds.filter((x) => typeof x === "string" && x.length > 0 && x.length <= 100))].slice(0, 32) : [],
          title,
          ownerRole: clean(input.ownerRole, LIMITS.ownerRole),
          dueDate,
          measure: clean(input.measure, LIMITS.measure),
          status: "검토",
          outcome: null,
        };
        const list = read();
        list.unshift(action);
        return { ok: true, action, persisted: write(list) };
      },
      /** 상태 전이. 실행→결과기록은 결과 문구 필수 (미측정이 자동 성공이 되지 않음). */
      transition(id, to, outcome) {
        const list = read();
        const a = list.find((x) => x.id === id);
        if (!a) return { ok: false, error: "조치를 찾을 수 없습니다." };
        if (!NEXT[a.status].includes(to)) return { ok: false, error: `'${a.status}'에서 '${to}'로 바꿀 수 없습니다.` };
        if (to === "결과기록") {
          const o = clean(outcome, LIMITS.outcome);
          if (!o) return { ok: false, error: "결과를 입력해 주세요. 측정 전이면 '미측정'이라고 적어도 됩니다." };
          a.outcome = o;
        }
        a.status = to;
        return { ok: true, action: a, persisted: write(list) };
      },
      reset() {
        try {
          if (storage) storage.removeItem(KEY);
          memory = [];
          return true;
        } catch {
          return false;
        }
      },
    };
  }

  const api = { KEY, STATUS, NEXT, createStore, isValidAction };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GT = Object.assign(root.GT || {}, api);
})(typeof globalThis !== "undefined" ? globalThis : this);
