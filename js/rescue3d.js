// RESCUE JET 3D 장면. 첫 화면의 돌려 보는 모델과 작업 구간의 시연이 같이 쓴다.
// three.js와 모델은 필요할 때만 불러온다(약 720KB). 모델은 형태만 옮긴 발표용이다.

export async function mountRescue(host, { drag = true, follow = false } = {}) {
  const [THREE, { createRescueModel }] = await Promise.all([
    import("../vendor/three/three.module.min.js"),
    import("../rescue-model.js"),
  ]);
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const canvas = renderer.domElement;
  canvas.tabIndex = drag ? 0 : -1;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", drag ? "RESCUE JET 3D 모델. 끌거나 방향키로 돌릴 수 있습니다." : "RESCUE JET 3D 모델");
  host.append(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.6, 8);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x68574f, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(4, 7, 6);
  scene.add(sun);

  const model = createRescueModel(THREE);
  const pivot = new THREE.Group();
  pivot.add(model.group);
  scene.add(pivot);

  const HOME = { x: 0.95, y: -0.5 };
  const now = { ...HOME }, goal = { ...HOME };
  let exploded = 0, explodeGoal = 0, driving = false, held = false, last = null, idle = !calm, visible = true, alive = true;

  const size = () => {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // 폭이 좁으면 모델이 잘리지 않게 카메라를 뒤로 뺀다.
    camera.position.z = w / h < 1.2 ? 8 + (1.2 - w / h) * 16 : 8;
    camera.updateProjectionMatrix();
  };
  const sizer = new ResizeObserver(size);
  sizer.observe(host);
  size();

  if (drag) {
    canvas.style.touchAction = "pan-y";
    canvas.style.cursor = "grab";
    canvas.addEventListener("pointerdown", (event) => { held = true; idle = false; last = { x: event.clientX, y: event.clientY }; canvas.setPointerCapture(event.pointerId); canvas.style.cursor = "grabbing"; });
    canvas.addEventListener("pointermove", (event) => {
      if (!held) return;
      goal.y += (event.clientX - last.x) * 0.01;
      goal.x = Math.max(-0.3, Math.min(1.5, goal.x + (event.clientY - last.y) * 0.006));
      last = { x: event.clientX, y: event.clientY };
    });
    const release = () => { held = false; canvas.style.cursor = "grab"; };
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    canvas.addEventListener("keydown", (event) => {
      const step = { ArrowLeft: [0, -0.2], ArrowRight: [0, 0.2], ArrowUp: [-0.12, 0], ArrowDown: [0.12, 0] }[event.key];
      if (!step) return;
      event.preventDefault();
      idle = false;
      goal.x = Math.max(-0.3, Math.min(1.5, goal.x + step[0]));
      goal.y += step[1];
    });
  }
  if (follow && !calm) {
    // 첫 화면: 마우스가 움직이는 쪽으로 살짝 기운다.
    addEventListener("pointermove", (event) => {
      if (held || event.pointerType !== "mouse") return;
      goal.y = HOME.y + (event.clientX / innerWidth - 0.5) * 1.2;
      goal.x = HOME.x + (event.clientY / innerHeight - 0.5) * 0.4;
      idle = false;
    });
  }

  const watcher = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
  watcher.observe(host);

  let before = performance.now();
  const frame = (t) => {
    if (!alive) return;
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - before) / 1000);
    before = t;
    if (!visible || document.hidden) return;
    if (idle) goal.y += dt * 0.25;
    const ease = calm ? 1 : 1 - Math.pow(0.001, dt);
    now.x += (goal.x - now.x) * ease;
    now.y += (goal.y - now.y) * ease;
    pivot.rotation.set(now.x, now.y, 0);
    exploded += (explodeGoal - exploded) * ease;
    model.setExploded(exploded);
    if (driving) for (const rotor of model.rotors) rotor.rotation.z += dt * 18;
    renderer.render(scene, camera);
  };
  requestAnimationFrame(frame);

  return {
    setDrive(on) { driving = Boolean(on); },
    setExploded(on) { explodeGoal = on ? 1 : 0; },
    reset() { goal.x = HOME.x; goal.y = HOME.y; idle = false; },
    dispose() { alive = false; sizer.disconnect(); watcher.disconnect(); model.dispose(); renderer.dispose(); canvas.remove(); },
  };
}
