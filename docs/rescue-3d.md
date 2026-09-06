# RESCUE JET web 3D

Open the portfolio, select MAKING/개발, and choose **Explore in 3D / 3D로 살펴보기** on the RESCUE JET image.

- Drag to turn the model. On touchscreens, swipe horizontally; vertical page scrolling remains available.
- When the model has keyboard focus, arrow keys turn it, `+` / `-` zoom, and `R` resets.
- **Propulsion demo** animates simplified propellers and direction bubbles. **Exploded view** separates exterior pieces. **Original photo** exits the viewer.
- Reduced-motion preferences show static propulsion direction and immediate assembly changes.

The model is reconstructed from `images/rescue-jet.jpg`. It is a presentation model, not the original CAD or a validated engineering/fluid simulation. No dimensions, operating speed, thrust, buoyancy or hardware control are claimed.

`rescue-model.js` owns the procedural mesh. `rescue-viewer.js` owns rendering, input and lifecycle. `rescue-viewer.css` scopes the UI. The original image remains available if WebGL2 initialization or module loading fails; no 3D dependencies load until requested.

The vendored Three.js files are the official **r180** minified distributions (`three.module.min.js` and its relative `three.core.min.js` dependency), downloaded from https://github.com/mrdoob/three.js/tree/r180/build. The MIT license is retained in `vendor/three/LICENSE`. No external runtime script request or import map is required. Combined engine size is 720,032 bytes before HTTP compression.

The renderer caps pixel ratio, redraws static states only when changed, and pauses animation while offscreen, in a hidden tab/lens, or behind a modal/menu. Drawing-buffer retention and synchronous resize redraw keep idle model frames visible. The resources are disposed and the image restored after context loss.
