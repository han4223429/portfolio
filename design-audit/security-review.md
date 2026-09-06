# Static portfolio security review

Reviewed 2026-09-06 as an independent, offline source-review worker. This document describes the existing portfolio before the current redesign. It is a scoped worker review, not a sealed Codex Security scan or a checkout test result.

**Result: no source-backed exploitable vulnerability identified in the reviewed frontend. Checkout is absent.**

## Scope and method

- Read all 610 lines of `script.js`; traced every browser-data input and DOM/navigation/clipboard sink.
- Parsed all 1,249 lines of `index.html` for executable elements, attributes, links, forms, and embedded resources; inspected corresponding script consumers.
- Screened `style.css` (1,961 lines) for external loads and executable CSS constructs; this was not a visual layout review.
- No applicable `AGENTS.md` or `SECURITY.md` was found. Application files were not changed. No browser, network, Git history, or application execution was used.

## Boundaries and evidence

| Surface | Source evidence | Disposition |
|---|---|---|
| Checkout/payment | HTML contains no form, input, payment iframe, cart or checkout component; script contains no payment integration, API request, or order state. Contact is a `mailto:` link and a copy button (`index.html:962–963`). | There is no checkout flow to test in this source. |
| Localized DOM content | `setLocalizedContent` creates text nodes and explicit `<br>` elements (`script.js:559–564`), using fixed HTML translation attributes (`578–581`). There is no `innerHTML`, `eval`, dynamic function, URL parameter or message input. | No attacker-controlled HTML execution path established. |
| External navigation | All 35 `target="_blank"` links have `rel="noopener noreferrer"`; dynamically created fallback links also set it (`script.js:360–365`). | Opener relationship is explicitly disabled. |
| Instagram embeds | All 29 `data-src` values are fixed `https://www.instagram.com/.../embed/` URLs (`index.html:661–941`); `loadEmbed` assigns those values to `iframe.src` and sets `no-referrer` (`script.js:351–375`). CSP restricts frames to Instagram (`index.html:14`). | No external input can select a destination in the current implementation. Third-party embed behavior itself is outside this review. |
| Clipboard | Copy action reads the fixed public contact address only after the button click (`script.js:318–323`); it writes text and never reads clipboard contents (`298–315`). | No secret access or attacker-controlled clipboard write established. |
| Browser preferences | Storage contains only language/theme choices (`script.js:2,35,40,569`), used as attributes or to select fixed text. | No credential storage or execution path identified. |
| Styling | No `url()`, `@import`, `expression()`, or executable CSS binding found in the local stylesheet. External fonts/stylesheets are declared in `index.html:33–42`. | No local CSS attack path identified. |

## Non-security observations for the redesign

- Storage calls in `script.js:2,35,40,569` are unguarded. A blocked or unavailable storage API can abort startup or a toggle operation. Wrap access in a fallback and allow only `ko`/`en`, `light`/`dark`. This is a robustness improvement; no other-user impact or attacker boundary crossing was established.
- The current CSP allows inline scripts (`index.html:14`) because theme initialization is inline (`index.html:8`). Moving initialization into a local script would permit a narrower script policy. This is defense in depth, not a demonstrated injection vulnerability.

## Limits

No backend or payment service is present in the scoped files. Hosting headers, deployment controls, external CDN contents, external destinations, and third-party frame behavior were not tested. Source changes after the hashes below require a fresh review of those changes. No independent sub-worker was spawned from this bounded worker; scan ownership remains with the coordinating agent. Token usage measurement was unavailable.

Reviewed SHA-256:

```text
index.html  7aa004538a330168bb47b7395fed74a439d091f63b7e138483318e8533e3f27d
script.js   f0fa635978d0613652f8a3af2befab2ce69ec3d17e4c0feeff10fb844b2bb91d
style.css   a1acfccaede3c46b36629eb3bd141f5d4ebe96d741df792cc110aa8d806dadbf
```
