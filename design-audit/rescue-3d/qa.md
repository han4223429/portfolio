# RESCUE JET Web 3D — scoped visual QA

**Findings**

No actionable P1/P2 finding remains in the assembled desktop v2, final propulsion/exploded view, Korean mobile at 390 px, or English mobile at 320 px. The initial blank-render P1 and both material/readability P2 findings are visibly resolved.

**Target and evidence**

- Source product truth: `images/rescue-jet.jpg` (819 × 631 px).
- Reviewed initial assembled viewer: `design-audit/rescue-3d/desktop-assembled.jpg`.
- Reviewed revised assembled viewer: `design-audit/rescue-3d/desktop-assembled-v2.jpg`.
- Reviewed final propulsion/exploded viewer: `design-audit/rescue-3d/desktop-exploded-final.jpg`.
- Reviewed Korean mobile: `design-audit/rescue-3d/mobile-390.jpg`.
- Reviewed English narrow mobile: `design-audit/rescue-3d/mobile-320-en.jpg`.
- Initial failing debug evidence: `design-audit/rescue-3d/desktop-running.jpg`; explicitly excluded from final passing evidence.
- Source and each assembled implementation were opened together in the same original-resolution comparison input.
- Accepted assembled v2 and final propulsion/exploded implementation were also opened together in one original-resolution input to verify the transition's visible result.
- Accepted desktop v2 was paired in one input with each mobile capture to check responsive object fit, control wrapping, and text readability.
- The source is a frontal product illustration; implementation is an intentionally procedural 3D reconstruction with a three-quarter camera. No source CAD or engineering model exists. Comparing appearance and product identity is appropriate; pixel-equal geometry/camera matching is not.
- The viewer is a cropped local browser capture, not a new page design. It preserves the established field-index interface around the object.
- Desktop assembled v2 and final exploded captures each measure 592 × 450 px. Mobile 390 capture measures 346 × 430 px within a 390 px CSS viewport; mobile 320 English capture measures 284 × 480 px within a 320 px CSS viewport. They are figure crops at effective 1:1 screenshot/CSS density; no stretch or perspective normalization was applied. State: light theme, Korean desktop/390 mobile and English 320 mobile. Assembled views have propulsion/separation off; final desktop exploded view has both on.
- Native captures made object details, controls, hints, and disclosure legible; no focused crop was needed.

**Required visual surfaces**

| Surface | Evaluation |
| --- | --- |
| Typography | Compact metadata and grouped controls fit the existing portfolio. Revised interaction hint and reconstruction disclosure are readable; no label is clipped. |
| Layout | Object sits comfortably in the stage, with a clear original-photo exit above and action/camera controls below. At 390 px controls fit one row; at 320 px the two action buttons and three camera controls form two deliberate rows. No object/label collision or cropping is visible. |
| Color | Revised v2 returns the buoy cap to saturated orange. Red reflective strips, white marker, dark pod openings, and neutral background are distinct. |
| Object/image fidelity | Continuous orange arch, lateral arms, two cylindrical pods, red strips, and white direction arrow clearly identify the pictured RESCUE JET. Three-dimensional thickness, simplified guards/propellers, and unseen geometry are intentionally interpretive. |
| Copy/affordances | Propulsion demo, exploded view, zoom, reset, and original-photo labels are understandable. Hint names drag and keyboard interaction. Disclosure identifies reconstruction and visualized propulsion. |

**Iteration history**

1. **Initial running/debug capture — [P1], blocked at that iteration.** Controls showed active propulsion and separation while the stage was entirely blank. Root identified repeated canvas resizing and stale IntersectionObserver gating. Fix: skip unchanged renderer dimensions, render synchronously after resize, preserve the drawing buffer, and calculate visibility from the actual element rectangle instead of a separate stale observer flag.
2. **Initial assembled capture — [P2], blocked.** Cap was pale yellow/gold rather than the source's safety orange. Root reduced hemisphere/key/fill intensity and exposure.
3. **Initial assembled capture — [P2], blocked.** Interaction hint at 10 px and disclosure at 9 px were difficult to read. Root raised them to 12 px and 11 px.
4. **Assembled desktop v2 — passed for this state.** Independent paired re-review confirms an orange cap, readable support text, clear controls, and a fully visible object. Both P2 findings are resolved.
5. **Final propulsion/exploded desktop — passed.** Independent paired re-review visibly confirms a fully populated scene: orange upper cap separated from the lower structure, both pods visible, turquoise propulsion bubbles, and active stop/reassemble controls. No cropping, overlap, or readability problem is visible. The earlier blank-render P1 is resolved by post-fix visual evidence.
6. **390 px Korean mobile — passed.** Independent paired review confirms the full model and both pods, readable one-row toolbar, and cleanly spaced guidance/disclosure.
7. **320 px English mobile — passed.** Independent paired review confirms the full model, clear two-row controls, translated original-photo exit, readable guidance and disclosure, and no clipping or overlap.

**Runtime evidence and limits**

- Root supplied these observed browser results: keyboard-arrow rotation, zoom/reset, decomposition, and propulsion work; one canvas is retained after plan → build lens navigation; project detail opens with main inert and closes on Escape; original-photo return reveals the launch control, and reopening creates no duplicate canvas. At 320 px, lang=en and no horizontal overflow were verified.
- Root verified keyboard-arrow rotation and zoom. Temporary diagnostics showed 7.56 seconds elapsed, explosion interpolation complete at 1, and actual visibility true; diagnostics were removed afterward. This supports, and does not replace, the reviewed final capture.
- Physical pointer/touch dragging was not executed successfully in the available automation surface. Pointer handling, reduced-motion behavior, and WebGL context-loss recovery were inspected in source only; no runtime coverage is claimed for those paths.
- The implementation agent checked browser console warnings/errors after final mobile photo-exit/reopen: empty array. Exactly one canvas remained and the live viewer was visible. This runtime result is coordinator-reported.
- Separate source-agent geometry checks report all approximately 62,000 vertices fit the camera frustum. This is supporting geometry evidence, not a substitute for populated browser captures.
- Original CAD dimensions, internal mechanisms, thrust physics, and engineering accuracy are not claimed.

**Implementation checklist**

- [x] Compare source product and assembled browser output together.
- [x] Review typography, layout, colors, object fidelity, and copy.
- [x] Fix orange material/readability P2 findings and compare revised capture.
- [x] Verify stable running/exploded output after the blank-render fix.
- [x] Review both mobile captures and record runtime evidence and its limits.

final result: passed
