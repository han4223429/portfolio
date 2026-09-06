# RESCUE JET web 3D source review

Reviewed 2026-09-06. Scope: `rescue-viewer.js`, `rescue-viewer.css`, `rescue-model.js`, the `#rescueFigure` integration, and local Three.js import boundaries. No application source was edited by the reviewer.

**No exploitable security issue or outstanding source-level blocker identified.** `node --check rescue-viewer.js` and `node --check rescue-model.js` pass.

## Verified by source

- Loading starts only after the 3D button click. One in-flight load is allowed; the original image remains until the first render succeeds. After the imports resolve, hidden/inert state is checked before opening.
- Module paths are fixed and local. The minified Three.js module imports only the local core module; the combined files are about 720 KB and are loaded on demand. The inspected boundaries introduce no remote URL input, `eval`, or dynamic function construction. Existing `script-src 'self'` remains compatible with those paths. This was not a full dependency security audit.
- Rendering is requested for changes and stops when static. Repeated propulsion/interpolation frames stop for hidden lens, inert page, hidden document, or offscreen bounds. Actual bounds determine visibility; IntersectionObserver only requests a resynchronization. A resize can perform a single synchronous refresh; unchanged buffer dimensions are not reset. Pixel ratio is capped at 1.6, and preserved drawing buffers retain the idle frame.
- Live reduced-motion changes stop repeated animation, apply exploded positions immediately, and retain explicit rotation/zoom controls. Propulsion feedback accurately announces a static direction view when reduced motion is enabled.
- Pointer listeners are canvas-scoped, support capture cancellation, and retain vertical touch scrolling through `touch-action: pan-y`. Keyboard rotation, zoom, and reset are scoped to the focused canvas. Canvas instructions, control labels, busy/pressed/expanded states, and status messages are present.
- Localization updates leaf labels and fixed accessibility attributes without replacing the canvas host. Theme/language changes synchronize viewer labels. Existing modal/menu inert handling remains effective.
- Import/initial-render/context failures dispose the engine, restore the image, and expose Retry. The previously identified recovery mismatch is fixed: failure resets exploded and zoom-button state before a new engine is created. Normal photo/reopen reuses the existing viewer.
- Disposal cancels pending animation, disconnects observers/listeners, disposes model geometry/materials and renderer-owned scene resources listed by the viewer, and removes the canvas. Model separation accepts only finite clamped values. The model is explicitly presented as an image-based exterior reconstruction and propulsion visualization.
- Temporary viewer debugging output has been removed.

## Runtime evidence and limits

The coordinating agent reports valid assembled, exploded, and propulsion captures, a 390px mobile capture, and no browser console warnings/errors. Those are coordinator-reported results; this reviewer did not operate the browser.

Full touch-drag behavior, context-loss recovery, and runtime reduced-motion emulation were **not** exercised. Their handling was reviewed from source. No physical accuracy, CAD fidelity, thrust, or fluid simulation was validated.

Reviewed SHA-256:

```text
index.html  210223214bcc1177ffbc9f710837f64227a693622d7a4da251fd1487c9efe2ad
rescue-viewer.js  d2f1b6323ad2cdb721fa7fb19e3aada16db686a4531ee2f16b618546ef9a2fe7
rescue-viewer.css  428db2eeb45f4800c46b16dea38a08976cd56f9b38382dd10d33e054fd4d3eed
rescue-model.js  f026f045fe62a088adf0d5725b4e108f0a12cf195d15dcdba2414602045bf4e5
vendor/three/three.module.min.js  e2b5ee6bccd38fd6d8a2428546b83c5f2426d84b152ef82be8055556e3b40eb6
vendor/three/three.core.min.js  61ba0df005b05991361d040d8ff670e1aadfd0ce7aeebd1fdb0725957a8957de
```
