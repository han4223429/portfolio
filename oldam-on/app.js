const state = {
  data: null,
  layer: "candidates",
  threshold: 50,
  markers: [],
  selectedCandidateId: null,
  demoStep: "overview",
  demoTimer: null,
};

const map = L.map("map", {
  zoomControl: false,
  minZoom: 8,
  maxZoom: 18,
});

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);
L.control.zoom({ position: "bottomright" }).addTo(map);
map.setView([36.55, 126.85], 9);

const els = {
  wifiCount: document.getElementById("wifiCount"),
  demandCount: document.getElementById("demandCount"),
  candidateCount: document.getElementById("candidateCount"),
  candidateList: document.getElementById("candidateList"),
  threshold: document.getElementById("threshold"),
  thresholdValue: document.getElementById("thresholdValue"),
  activeLayer: document.getElementById("activeLayer"),
  mapCaption: document.getElementById("mapCaption"),
  selectedPriority: document.getElementById("selectedPriority"),
  selectedName: document.getElementById("selectedName"),
  selectedReason: document.getElementById("selectedReason"),
  selectedScore: document.getElementById("selectedScore"),
  selectedDistance: document.getElementById("selectedDistance"),
  selectedSupply: document.getElementById("selectedSupply"),
  selectedSummary: document.getElementById("selectedSummary"),
  demoStepLabel: document.getElementById("demoStepLabel"),
  startDemo: document.getElementById("startDemo"),
};

document.querySelectorAll("[data-layer]").forEach((button) => {
  button.addEventListener("click", () => {
    setLayer(button.dataset.layer);
    render();
  });
});

document.querySelectorAll("[data-demo-step]").forEach((button) => {
  button.addEventListener("click", () => {
    stopPresentationDemo();
    setDemoStep(button.dataset.demoStep);
  });
});

els.startDemo.addEventListener("click", startPresentationDemo);

els.threshold.addEventListener("input", () => {
  state.threshold = Number(els.threshold.value);
  els.thresholdValue.textContent = state.threshold;
  render();
});

fetch("./data/processed/oldam_on_dataset.json")
  .then((response) => response.json())
  .then((data) => {
    state.data = data;
    els.wifiCount.textContent = data.meta.wifi_points.toLocaleString("ko-KR");
    els.demandCount.textContent = data.meta.demand_points.toLocaleString("ko-KR");
    els.candidateCount.textContent = data.all_candidate_count.toLocaleString("ko-KR");
    state.selectedCandidateId = data.candidates[0]?.id ?? null;
    setDemoStep(state.demoStep);
  });

function render() {
  if (!state.data) return;
  clearMarkers();
  renderList();
  renderSelectedCandidate();

  if (state.layer === "wifi") {
    els.activeLayer.textContent = "Wi-Fi";
    els.mapCaption.textContent = "충남 공공 Wi-Fi 공급 위치를 시설 유형과 함께 확인합니다.";
    addWifiMarkers();
  } else if (state.layer === "demand") {
    els.activeLayer.textContent = "수요";
    els.mapCaption.textContent = "올담 경로당 근거와 마을회관·디지털배움터를 통신 수요 지점으로 표시합니다.";
    addDemandMarkers();
  } else {
    els.activeLayer.textContent = "후보지";
    els.mapCaption.textContent = "취약지수 기준을 넘는 리피터 설치 후보지를 우선순위로 표시합니다.";
    addCandidateMarkers();
  }
}

function clearMarkers() {
  state.markers.forEach((marker) => marker.remove());
  state.markers = [];
}

function addMarker(lat, lng, type, label, popup) {
  let size = [34, 34];
  let anchor = [17, 17];
  let popupAnchor = [0, -18];

  if (type === "demand") {
    size = [22, 22];
    anchor = [11, 11];
    popupAnchor = [0, -12];
  } else if (type === "wifi") {
    size = [18, 18];
    anchor = [9, 9];
    popupAnchor = [0, -10];
  }

  const icon = L.divIcon({
    className: "",
    html: `<div class="marker ${type}">${label || ""}</div>`,
    iconSize: size,
    iconAnchor: anchor,
    popupAnchor: popupAnchor,
  });
  const marker = L.marker([lat, lng], { icon }).addTo(map).bindPopup(popup);
  state.markers.push(marker);
  return marker;
}

function addCandidateMarkers() {
  const filtered = filteredCandidates();
  filtered.forEach((item, index) => {
    const marker = addMarker(
      item.lat,
      item.lng,
      "candidate",
      String(index + 1),
      `<div class="popup">
        <h3>${escapeHtml(item.name)}</h3>
        <p><b>${item.priority}</b> · 취약지수 ${item.vulnerability}</p>
        <p>최단 Wi-Fi ${item.nearest_wifi_distance_km}km · 예상 RSSI 개선 ${item.expected_rssi_gain}dB</p>
        <p>${escapeHtml(item.reason)}</p>
        <p><b>현장 검증:</b> GPS 좌표 확인 → RSSI·속도 측정 → 리포트 반영</p>
      </div>`
    );
    marker.on("click", () => selectCandidate(item, false));
  });
  fitMarkers();
}

function addDemandMarkers() {
  state.data.demand.forEach((item) => {
    addMarker(
      item.lat,
      item.lng,
      "demand",
      "",
      `<div class="popup">
        <h3>${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(item.type)} · ${escapeHtml(item.city)} ${escapeHtml(item.town || "")}</p>
        <p>${escapeHtml(item.address)}</p>
        <p>${escapeHtml(item.coordinate_note)}</p>
      </div>`
    );
  });
  fitMarkers();
}

function addWifiMarkers() {
  state.data.wifi.forEach((item) => {
    addMarker(
      item.lat,
      item.lng,
      "wifi",
      "",
      `<div class="popup">
        <h3>${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(item.city)} · ${escapeHtml(item.facility)} · ${escapeHtml(item.provider)}</p>
        <p>${escapeHtml(item.address)}</p>
        <p>기준일 ${escapeHtml(item.reference_date)}</p>
      </div>`
    );
  });
  fitMarkers();
}

function renderList() {
  const items = filteredCandidates().slice(0, 8);
  els.candidateList.innerHTML = items
    .map(
      (item, index) => `
        <article class="candidate ${item.id === state.selectedCandidateId ? "active" : ""}" data-id="${item.id}">
          <h3>${index + 1}. ${escapeHtml(item.name)}</h3>
          <div class="meta">
            <span class="badge">${item.priority}</span>
            <span>${escapeHtml(item.type)}</span>
            <span>${escapeHtml(item.city)} ${escapeHtml(item.town || "")}</span>
            <span>취약 ${item.vulnerability}</span>
          </div>
          <p>${escapeHtml(item.reason)}</p>
        </article>
      `
    )
    .join("");

  els.candidateList.querySelectorAll(".candidate").forEach((card) => {
    card.addEventListener("click", () => {
      const item = state.data.candidates.find((candidate) => candidate.id === card.dataset.id);
      if (!item) return;
      selectCandidate(item, true);
    });
  });
}

function filteredCandidates() {
  return state.data.candidates.filter((item) => item.vulnerability >= state.threshold);
}

function selectedCandidate() {
  if (!state.data) return null;
  return state.data.candidates.find((item) => item.id === state.selectedCandidateId) ?? state.data.candidates[0] ?? null;
}

function renderSelectedCandidate() {
  const item = selectedCandidate();
  if (!item) return;
  els.selectedPriority.textContent = item.priority;
  els.selectedName.textContent = item.name;
  els.selectedReason.textContent = item.reason;
  els.selectedScore.textContent = item.vulnerability;
  els.selectedDistance.textContent = `${item.nearest_wifi_distance_km}km`;
  els.selectedSupply.textContent = `${item.supply_500m}개`;
  els.selectedSummary.innerHTML = `
    <span>TOP 후보</span>
    <strong>${escapeHtml(item.name)} · ${item.vulnerability}점 · ${item.nearest_wifi_distance_km}km</strong>
  `;
}

function selectCandidate(item, focusMap = true) {
  state.selectedCandidateId = item.id;
  renderSelectedCandidate();
  
  let activeCard = null;
  els.candidateList.querySelectorAll(".candidate").forEach((card) => {
    const isActive = card.dataset.id === item.id;
    card.classList.toggle("active", isActive);
    if (isActive) activeCard = card;
  });

  if (activeCard && !focusMap) {
    activeCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  if (focusMap) {
    map.setView([item.lat, item.lng], 13);
  }
}

function setLayer(layer) {
  state.layer = layer;
  document.querySelectorAll("[data-layer]").forEach((item) => item.classList.toggle("active", item.dataset.layer === layer));
}

function setThreshold(value) {
  state.threshold = value;
  els.threshold.value = String(value);
  els.thresholdValue.textContent = String(value);
}

function setDemoStep(step) {
  state.demoStep = step;
  document.querySelectorAll("[data-demo-step]").forEach((button) => {
    button.classList.toggle("active", button.dataset.demoStep === step);
  });

  const topCandidate = state.data?.candidates[0];
  if (topCandidate) state.selectedCandidateId = topCandidate.id;

  if (step === "overview") {
    setLayer("demand");
    setThreshold(50);
  } else if (step === "rank") {
    setLayer("candidates");
    setThreshold(80);
  } else if (step === "field") {
    setLayer("candidates");
    setThreshold(80);
  } else if (step === "scale") {
    setLayer("wifi");
    setThreshold(50);
  }

  render();
  applyDemoCopy(step);
  if (step === "field" && topCandidate) {
    map.setView([topCandidate.lat, topCandidate.lng], 13);
  }
}

function startPresentationDemo() {
  stopPresentationDemo();
  const steps = ["overview", "rank", "field", "scale"];
  let index = 0;
  setDemoStep(steps[index]);
  els.startDemo.textContent = "데모 진행 중";
  state.demoTimer = window.setInterval(() => {
    index += 1;
    if (index >= steps.length) {
      stopPresentationDemo();
      els.startDemo.textContent = "7분 발표 데모 다시 보기";
      return;
    }
    setDemoStep(steps[index]);
  }, 4500);
}

function stopPresentationDemo() {
  if (!state.demoTimer) return;
  window.clearInterval(state.demoTimer);
  state.demoTimer = null;
  els.startDemo.textContent = "7분 발표 데모 시작";
}

function applyDemoCopy(step) {
  const copy = {
    overview: {
      label: "01 데이터 결합",
      caption: "올담 경로당·공공와이파이 데이터와 마을회관·디지털배움터 수요를 한 화면에 연결합니다.",
    },
    rank: {
      label: "02 후보 추천",
      caption: "취약지수 80점 이상 후보만 남겨 설치 우선순위를 바로 보여줍니다.",
    },
    field: {
      label: "03 현장 검증",
      caption: "상위 후보를 선택해 GPS 좌표, RSSI, 속도 측정으로 보정하는 흐름을 설명합니다.",
    },
    scale: {
      label: "04 확장 보고",
      caption: "현장 측정 결과를 우선순위 리포트로 만들고 충남 전역 접근성 지도로 확장합니다.",
    },
  }[step];
  if (!copy) return;
  els.demoStepLabel.textContent = copy.label;
  els.mapCaption.textContent = copy.caption;
}

function fitMarkers() {
  if (!state.markers.length) return;
  const group = L.featureGroup(state.markers);
  map.fitBounds(group.getBounds(), { padding: [48, 48], maxZoom: state.layer === "wifi" ? 10 : 12 });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
