// 첫 화면의 3D 작업대. 작업 일곱 가지를 물건으로 올려 두고, 물건을 누르면 그 작업으로 간다.
// 물건은 기본 도형으로 만든 표식이다(RESCUE JET만 예전에 만든 모델을 줄여서 쓴다).

export async function mountScene(host, label, items) {
  const [THREE, { createRescueModel }] = await Promise.all([
    import("../vendor/three/three.module.min.js"),
    import("../rescue-model.js"),
  ]);
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true"); // 같은 링크가 바로 아래 차례에 글자로 있다
  host.prepend(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x68574f, 1.7));
  const sun = new THREE.DirectionalLight(0xffffff, 2.1);
  sun.position.set(5, 9, 6);
  scene.add(sun);

  const rig = new THREE.Group();
  scene.add(rig);
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.05, ...extra });
  const box = (w, h, d, color, extra) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, extra));
  const rod = (r, h, color, extra) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), mat(color, extra));
  const ball = (r, color, extra) => new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), mat(color, extra));
  const cone = (r, h, color) => new THREE.Mesh(new THREE.ConeGeometry(r, h, 32), mat(color));
  const at = (mesh, x, y, z) => { mesh.position.set(x, y, z); return mesh; };
  const INK = 0x2a211e, CAMO = 0x68574f, SIGNAL = 0x1fd17a, WHITE = 0xffffff;

  // 기판: 갈색 판 위에 초록 배선이 물건마다 이어진다.
  rig.add(at(box(10.4, 0.3, 6.2, CAMO), 0, -0.15, 0));
  rig.add(at(box(9, 0.03, 0.08, SIGNAL), 0, 0.02, -0.1));

  const phone = (screen) => {
    const g = new THREE.Group();
    const body = new THREE.Group();
    body.add(box(1, 1.9, 0.12, INK), at(box(0.86, 1.7, 0.03, screen), 0, 0, 0.07), at(box(0.5, 0.12, 0.04, WHITE), 0, 0.5, 0.09), at(box(0.62, 0.3, 0.04, WHITE), 0, -0.2, 0.09));
    body.rotation.x = -0.45; body.position.y = 0.95;
    g.add(body);
    return g;
  };
  const builders = {
    gyeongtongnet: () => phone(0xb83b31),
    rescue: () => { const g = new THREE.Group(); const m = createRescueModel(THREE).group; m.scale.setScalar(0.42); m.position.y = 0.35; g.add(m); return g; },
    oldam: () => {
      const g = new THREE.Group();
      g.add(at(box(1.9, 0.14, 1.4, 0x0b5d4b), 0, 0.07, 0));
      for (const [x, z] of [[-0.5, -0.2], [0.35, 0.3], [0.55, -0.4]]) { const pin = cone(0.14, 0.42, 0xa9ecc9); pin.rotation.x = Math.PI; g.add(at(pin, x, 0.4, z), at(ball(0.17, 0xa9ecc9), x, 0.7, z)); }
      return g;
    },
    nettwin: () => {
      const g = new THREE.Group();
      g.add(at(box(1.4, 0.5, 0.95, 0x0a3d91), 0, 0.25, 0), at(rod(0.04, 1.1, INK), 0.5, 1.05, -0.25), at(ball(0.11, 0xffd60a, { emissive: 0xffd60a, emissiveIntensity: 0.6 }), -0.4, 0.56, 0.3));
      g.userData.led = g.children[2];
      return g;
    },
    sunsia: () => {
      const g = new THREE.Group();
      const drop = ball(0.62, 0x3ea6ee); drop.scale.set(1, 1.08, 1);
      const leaf = (rz) => { const l = box(0.42, 0.08, 0.2, 0x0e7c4a); l.rotation.z = rz; return l; };
      g.add(at(drop, 0, 0.7, 0), at(cone(0.44, 0.62, 0x3ea6ee), 0, 1.42, 0), at(leaf(0.5), 0.2, 1.85, 0), at(leaf(-0.5), -0.2, 1.85, 0));
      return g;
    },
    mygpt: () => {
      const g = new THREE.Group();
      g.add(at(box(1.8, 1.15, 0.1, INK), 0, 1.05, 0), at(box(1.62, 0.98, 0.02, 0x14100e), 0, 1.05, 0.06), at(rod(0.07, 0.42, INK), 0, 0.28, 0), at(box(0.8, 0.08, 0.5, INK), 0, 0.04, 0));
      [[1.2, 0.3], [0.8, 0.05], [1.0, -0.2]].forEach(([w, y]) => g.add(at(box(w, 0.09, 0.02, SIGNAL, { emissive: SIGNAL, emissiveIntensity: 0.35 }), -0.75 + w / 2, 1.05 + y, 0.08)));
      return g;
    },
    content: () => {
      const g = new THREE.Group();
      const lens = rod(0.3, 0.5, 0x14100e); lens.rotation.x = Math.PI / 2;
      g.add(at(box(1.4, 0.85, 0.7, INK), 0, 0.5, 0), at(lens, 0.2, 0.5, 0.55), at(box(0.45, 0.2, 0.4, CAMO), -0.35, 1.02, 0), at(ball(0.08, 0xd5281e, { emissive: 0xd5281e, emissiveIntensity: 0.6 }), 0.55, 0.78, 0.36));
      return g;
    },
  };
  const SPOTS = { mygpt: [-3.6, -1.6], nettwin: [-1.2, -1.6], oldam: [1.2, -1.6], content: [3.6, -1.6], gyeongtongnet: [-2.7, 1.4], rescue: [0, 1.5], sunsia: [2.7, 1.4] };
  const things = [];
  for (const item of items) {
    const make = builders[item.id];
    if (!make) continue;
    const group = make();
    const [x, z] = SPOTS[item.id];
    group.position.set(x, 0, z);
    group.userData = { ...group.userData, item, lift: 0, phase: things.length * 0.9 };
    rig.add(group, at(box(0.08, 0.03, Math.abs(z)), x, 0.02, z / 2).translateZ(-0.05));
    things.push(group);
  }

  const size = () => {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // 넓은 화면: 글이 왼쪽에 얹히므로 판을 오른쪽으로 밀고 크게 본다. 좁은 화면: 가운데에 두고 잘리지 않을 만큼만 물러난다.
    const wide = camera.aspect > 1.35;
    const far = wide ? 0 : (1.35 - camera.aspect) * 12;
    const fit = wide ? Math.max(1, 1.7 / camera.aspect) : 1; // 덜 넓은 화면에서는 그만큼 물러난다
    rig.position.x = wide ? 3.5 / fit : 0;
    camera.position.set(0, (wide ? 7.6 * fit : 6) + far * 0.6, (wide ? 16.5 * fit : 9.2) + far);
    camera.lookAt(0, wide ? 0.9 : 0.4, 0);
    camera.updateProjectionMatrix();
  };
  const sizer = new ResizeObserver(size);
  sizer.observe(host);
  size();

  const ray = new THREE.Raycaster();
  const point = new THREE.Vector2();
  let hot = null, held = false, moved = 0, last = null, turn = 0, turnGoal = calm ? 0 : -0.2, visible = true, alive = true;
  const pick = (event) => {
    const r = canvas.getBoundingClientRect();
    point.set(((event.clientX - r.left) / r.width) * 2 - 1, -((event.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(point, camera);
    const hit = ray.intersectObjects(things, true)[0];
    let node = hit?.object ?? null;
    while (node && !things.includes(node)) node = node.parent;
    return node;
  };
  const setHot = (thing) => {
    if (hot === thing) return;
    hot = thing;
    host.dataset.cursor = thing ? "보기" : "끌기";
    canvas.style.cursor = thing ? "pointer" : held ? "grabbing" : "grab";
    label.classList.toggle("is-on", Boolean(thing));
    if (thing) label.textContent = `${thing.userData.item.name}, ${thing.userData.item.note}`;
  };
  canvas.style.touchAction = "pan-y";
  canvas.style.cursor = "grab";
  canvas.addEventListener("pointerdown", (event) => { held = true; moved = 0; last = event.clientX; setHot(pick(event)); canvas.setPointerCapture(event.pointerId); });
  canvas.addEventListener("pointermove", (event) => {
    if (held) {
      const dx = event.clientX - last;
      moved += Math.abs(dx);
      last = event.clientX;
      if (moved > 6) { turnGoal = Math.max(-1.1, Math.min(1.1, turnGoal + dx * 0.006)); setHot(null); }
    } else {
      setHot(pick(event));
      if (!calm && event.pointerType === "mouse") { const r = canvas.getBoundingClientRect(); turnGoal = ((event.clientX - r.left) / r.width - 0.5) * 0.7; }
    }
  });
  canvas.addEventListener("pointerup", (event) => {
    held = false;
    const target = moved <= 6 ? pick(event) : null;
    if (target) location.hash = `#${target.userData.item.id}`;
    if (event.pointerType !== "mouse") setHot(null);
  });
  canvas.addEventListener("pointerleave", () => { if (!held) setHot(null); });
  canvas.addEventListener("pointercancel", () => { held = false; setHot(null); });

  const watcher = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
  watcher.observe(host);
  const tip = new THREE.Vector3();
  let before = performance.now();
  const frame = (t) => {
    if (!alive) return;
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - before) / 1000);
    before = t;
    if (!visible || document.hidden) return;
    const ease = calm ? 1 : 1 - Math.pow(0.002, dt);
    turn += (turnGoal - turn) * ease;
    rig.rotation.y = turn;
    for (const thing of things) {
      const want = thing === hot ? 1 : 0;
      thing.userData.lift += (want - thing.userData.lift) * ease;
      const bob = calm ? 0 : Math.sin(t / 900 + thing.userData.phase) * 0.04;
      thing.position.y = thing.userData.lift * 0.35 + bob;
      thing.scale.setScalar(1 + thing.userData.lift * 0.12);
      if (thing.userData.led) thing.userData.led.material.emissiveIntensity = calm ? 0.6 : 0.3 + (Math.sin(t / 300) + 1) * 0.5;
    }
    renderer.render(scene, camera);
    if (hot) {
      hot.getWorldPosition(tip);
      tip.y += 2.3;
      tip.project(camera);
      label.style.translate = `${((tip.x + 1) / 2) * host.clientWidth}px ${((1 - tip.y) / 2) * host.clientHeight}px`;
    }
  };
  requestAnimationFrame(frame);
  return { dispose() { alive = false; sizer.disconnect(); watcher.disconnect(); renderer.dispose(); canvas.remove(); } };
}
