# Page loader checks

Date: 2026-09-06. Environment: Node.js v24.15.0.

These results are from a Node VM harness with simulated DOM events, promises and a controlled clock. They verify loader logic; they do not establish real browser timing, font loading, network behavior, visual rendering or assistive-technology behavior.

Commands executed from the repository root:

- `node --check page-loader.js` — passed.
- `node --input-type=module <<'JS' … JS` — inline harness using `node:vm`, `node:assert/strict` and the actual `page-loader.js` source; all assertions passed. The harness supplied a minimal event-target DOM, deferred font/image-decode promises and deterministic timeout scheduling.

| Scenario | Result |
| --- | --- |
| Before DOMContentLoaded | Cover remains pending; readiness does not complete early. |
| DOM ready, fonts pending | Cover waits for fonts. |
| Fonts ready, image load/decode pending | Cover waits for the critical image decode. |
| DOM, fonts and image ready | Fade starts immediately; no artificial minimum hold. |
| Normal fade | Classes and timers clear after 220 ms. |
| Readiness never completes | Cover fully clears at the 1,800 ms deadline. |
| Readiness completes at 1,700 ms | Deadline truncates the fade; fully clear by 1,800 ms. |
| Reduced motion | Completion clears the cover immediately. |
| Tab, underlying focus, wheel, touchmove or scroll | Cover clears immediately. |
| Manual “View now” button | Cover clears and existing main receives focus. |
| Back/forward navigation or persisted pageshow | Cover remains open/clears immediately. |
| Injected DOM-query failure | Visual gate clears; page is available. |
| No-JS CSS contract | Base `.page-loader` rule is `display:none`; JS class is required to display it. |
| State ownership | No localStorage writes, body inert assignment or overflow lock. |

The shared Tab/Escape handler was exercised with Tab. Real keyboard behavior remains a browser QA responsibility.

Tested source SHA-256:

```text
page-loader.js  7b7830c4d6a60452ecdf8d6cfef06022f26c1b26f6ab2549c1908fa702741666
page-loader.css d8041f706233fc740ae9e5daf61f16c770199ce539168481744a342a98558bf0
```

`loader-state.html` was a temporary static visual fixture, removed after its browser capture `14-loader-mobile.jpg` was inspected as part of the requested cleanup. Its loader markup was extracted verbatim from production `index.html`; it links the production CSS, uses Korean/dark theme, and fixes the root `page-loading` class. It contains no JavaScript. The button is intentionally nonfunctional in this fixture, which must not be used as evidence of runtime completion or timeout behavior.
