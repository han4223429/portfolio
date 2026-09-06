# Redesign source and preservation review

Reviewed 2026-09-06 against `/tmp/portfolio-preservation-baseline.json` and the original source snapshots. Scope: `index.html`, `script.js`, `style.css`, new `theme.js`, and the local arrow SVG/license. Final follow-up covered only the localized attributes, navigation default, translation suppression, summary statistic, chapter labels, and icon/photo CSS changes. This is an independent offline worker review; browser behavior is verified separately by the coordinating agent.

**No source-backed exploitable vulnerability or unintended loss of substantial portfolio content was identified.** Checkout remains absent, so this is not a payment-flow validation.

## Content preserved

| Check | Result |
|---|---|
| Activity records | All 28 Korean/English title, date, and year tuples are identical. |
| Instagram records | All 29 type, timestamp, post-link, fallback-link, and embed-URL tuples are identical: 20 reels and 9 card-news posts. |
| External/contact links | All 37 external/mail anchor destinations are preserved, including duplicate links: 33 unique destinations. |
| Detailed records | All 7 panes remain: `dm-edu`, `dm-cert`, `dm-tools`, `dm-act`, `dm-p1`, `dm-p2`, `dm-p3`. Complete visible text matches after removing decorative emoji and normalizing whitespace. |
| Projects | All 3 original projects remain through the lens panels and original full-detail panes. Shorter surface titles/descriptions are intentional. |
| Skills | All 10 skill names remain. Removing their self-rated percentages is intentional. |
| Structure | No duplicate IDs, unresolved in-page anchors, missing modal targets, broken `aria-controls` references, nested interactive tags, unclosed tags, or mismatched closing tags. |
| Localization | Every `data-ko` node has a `data-en` pair. No localized container contains an interactive control that text replacement would erase. Original substantive detail content is preserved in both languages. |

Intentional editorial changes include the hero, section headings, navigation, compact project summaries, decorative emoji removal, and the change from inconsistent 26/27 activity counts to the 28 actual records. The ambiguous three-year activity summary is replaced with the exact 29-content count; chapter numbering is coherent. The original availability badge is omitted from the new hero; qualifications and contact information remain.

## Security and control review

- Localization creates text nodes and explicit line breaks (`script.js:21`); no HTML-string injection, dynamic code execution, message consumer, URL-param consumer, or API request was introduced.
- Preference reads and writes are guarded; theme/language values are allowlisted (`script.js:5`, `script.js:11`, `theme.js:2`). The inline bootstrap is replaced with `theme.js`, loaded after the CSP meta; `script-src` is now `'self'` (`index.html:13`).
- All new-window links retain `noopener noreferrer`. Instagram frames are created only by the preview click handler and their origin/path is validated against Instagram embed URLs (`script.js:303`, `script.js:309`). Frames use `no-referrer`; the original external post links remain available when embeds fail.
- Sound starts disabled, is never restored from storage, and creates/resumes an audio context only inside the explicit sound-toggle handler (`script.js:41–96`). Effects are brief, rate-limited, and silent while the document is hidden.
- The copy action writes only the fixed public contact address on a click, never reads clipboard data, and reports fallback success accurately (`script.js:484`).
- Modal targets must be actual stored detail panes (`script.js:402`). Background inert state, close/restore behavior, focus traps, menu state, and in-page navigation have matching source controls. No privileged backend or checkout operation exists.
- CSS/JS integration includes the vertical `--progress` meter, archive count label, `.js-ready` enhancement, and reduced-motion handling. All expected local assets and script references resolve in the workspace.
- Final attribute localization writes only fixed `aria-label` and `alt` attributes using the already-allowlisted language (`script.js:615–620`); 11 ARIA and 2 image-alt translation pairs were inspected. The `translate="no"` and `notranslate` hints request that external translation leave the app's own KO/EN UI intact. The initial visible WORK section receives active navigation state (`script.js:561`).
- The local `images/icons/arrow-up-right.svg` contains two static path elements and no scripts, handlers, links, or embedded resources. Its license file is retained; the stylesheet references the local asset as a mask. Photo display changes add no new data or execution surface.

## Review observations

The initial Instagram status-placement mismatch was corrected during review: `.embed-status` is now in normal flow, matching `holder.after(status)`. The mobile/modal body classes also match the CSS scroll-lock selectors.

The planning-panel label now has the complete Korean/English pair `PROCESS NOTES / 공공데이터` / `PROCESS NOTES / PUBLIC DATA` (`index.html:57`). The previously reported localization polish item is resolved. No source-review items remain open.

The coordinating agent reports passing browser checks for modal inert/focus/Escape behavior, lens keyboard selection, archive filtering/counts, explicit Instagram loading (zero initial iframes, one after a preview click), and email-copy feedback, with no console warnings/errors observed. These are coordinator-reported runtime results. The coordinator subsequently verified mobile 390 px and 320 px layouts, menu navigation/closing, and English/dark-mode persistence, with final console warnings/errors also empty. The final HTML hash includes a whitespace-only cleanup after this review.

## Limits and reviewed snapshot

This review did not use a browser, send requests to external sites, execute payment actions, or validate deployment headers. Third-party Instagram content remains cross-origin and cannot be inspected by the page. The review does not represent a sealed native Codex Security scan. Runtime results and later visual adjustments belong in the coordinator's browser-verification record. Token usage measurement was unavailable.

```text
index.html  ca965dccd06ffaf66b644cb4e6530673fd9a82b1cf290ba4cd8888f87bb84bb5
script.js   fb7b0ba2e5ebd954c53f98d885ba4970df4fbbe4064b76f4e835c04501167f13
style.css   00304ead526798249304976ca99d05aebb807289e84f05023d7a0bf34813f357
theme.js    4b1dcfaf531c70bd0914c1b9ce25316e74d9acba064ad52109bcc1c0a1fbca26
images/icons/arrow-up-right.svg  50b2503b9d11881142255466b7e3461d022b919735841c321d72003ac9959fe1
images/icons/lucide-LICENSE.txt  b495047bd93a9b06913511076f504daba17d5bbeb3e0650f3bb53a4220329c57
```
