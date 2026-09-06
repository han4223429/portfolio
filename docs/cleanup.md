# Repository cleanup — 2026-09-06

Removed **32 temporary QA/duplicate files, 4,140,657 bytes (3.95 MiB)** from the working tree. No runtime source or deployed asset was removed.

| Removed group | Files | Reason |
| --- | ---: | --- |
| Legacy PNG captures directly under `design-audit/` | 26 | Older pre-redesign QA images, unreferenced by current source and reports; tracked versions remain in Git history. |
| `design-audit/profile-updated.jpg` | 1 | Unreferenced intermediate portrait QA capture; actual `images/profile.jpg` retained. |
| `implementation-desktop-v1.jpg` and `implementation-desktop-v2.jpg` under `design-audit/2026-09-06/` | 2 | Unreferenced intermediate captures; cited later QA evidence retained. |
| `design-audit/rescue-3d/desktop-running-v2.jpg` | 1 | Unreferenced intermediate capture; cited 3D QA evidence retained. |
| `design-audit/2026-09-06/template-preview.png` | 1 | Byte-identical to retained `concept-field-notes.png`; template receipt now records the historical input and retained equivalent. |

The installed Han Field Index template retains independent `assets/reference.png` and `assets/preview.png`; both hashes match the retained concept. All three concept images, prompts, receipts, referenced reports/evidence, and current `ui-refinement` captures/reports remain. The temporary loader fixture was removed after its screenshot was inspected.

Retained runtime files: `index.html`, `style.css`, `script.js`, `theme.js`, both page-loader files, all three rescue viewer/model files, both portfolio images, the arrow SVG, both local Three.js modules, and their licenses. User `.vscode` settings, `.git`, `.gitignore`, and `docs/rescue-3d.md` were not removed or altered by cleanup.

Verification passed after removal: all 20 checked local HTML asset links, CSS URLs, JavaScript module imports, and concept-image references resolve. The retained concept and installed template assets share the recorded SHA-256. External URLs and historical audit references are outside this runtime-path check.

Final QA cleanup also removed the 1,395-byte temporary `loader-state.html` fixture after retaining its rendered screenshot and check record. Total: **32 files, 4,140,657 bytes (3.95 MiB)**.
