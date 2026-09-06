# Product Design QA — 2026-09-06

final result: passed

The requested loading screen and layout refinement are implemented at **http://localhost:4173/**. No actionable P0/P1/P2 issues remain in the reviewed states. The original FIELD NOTES direction is retained; reduced title scale, earlier mobile media, a consolidated introduction, larger controls, and shared content alignment are intentional changes authorized by the user.

## Comparison evidence

All paths below are under `design-audit/ui-refinement/`. Each before/after pair was opened together in the same comparison input, rather than judged from filenames or memory.

| Surface | Source visual truth | Rendered implementation | Viewport and state |
| --- | --- | --- | --- |
| Home | `06-home-desktop-ko-before.jpg` | `15-home-desktop-final.jpg` | 1440 × 1000, Korean, dark, default Making lens, poster visible |
| Home, mobile | `04-home-mobile-before.jpg` | `10-home-mobile-after.jpg` | 390 × 844, Korean, dark, menu closed, default lens |
| Introduction | `02-about-desktop-before.jpg` | `09-about-desktop-after.jpg`; supplementary `16-about-desktop-final.jpg` | 1440 × 1000, Korean, dark, ABOUT navigation |
| Profile, mobile | `05-profile-mobile-before.jpg` | `11-about-mobile-after.jpg` | 390 × 844, Korean, dark; before `#vision`, after consolidated `#about` |
| Contact/footer | `03-contact-desktop-before.jpg` | `18-contact-after-nav-fix.jpg` | 1440 × 1000, Korean, dark, contact at document bottom |

Source and implementation JPEG pixels equal the stated CSS viewport for the paired captures: 1440 × 1000 or 390 × 844, effective capture density 1:1. No resampling was needed. The older English `01-home-desktop-before.jpg` was not used as the Korean home comparison target. About/profile framing intentionally differs because two sections became one; this was evaluated as a requested information-architecture improvement, not pixel fidelity to the old section split.

Some document-clipped desktop captures omit the browser's fixed-rail compositor layer or catch underline transitions. This initially raised two P2 verification questions. The supplementary actual viewport capture `16-about-desktop-final.jpg` visibly retains the wordmark and bottom index, and shows only ABOUT selected. Its 1440 × 702 bitmap contains scaled browser-emulation content and padding, so it is used only to verify those fixed elements, not for precise scale comparison. Native 800 × 1000 `13-tablet-home-en.jpg` and final native 1920 × 936 `20-home-light-final.jpg` independently confirm the intact rail. DOM checks confirmed visible rail opacity 1 and a single current menu.

Focused review covered project title/description/action spacing, portrait crop, navigation labels, and the email/TOP area within the paired images at their readable native resolution. Separate component evidence is `12-rescue-mobile-320.jpg` (320 × 740 crop from a 320 × 844 viewport) and `14-loader-mobile.jpg` (390 × 844). These make the small controls and loader typography legible; they are not claimed to have matching pre-existing loading/3D-state sources.

## Findings and iteration history

| Severity | Earlier evidence / issue | Fix and post-fix verification |
| --- | --- | --- |
| P2, resolved | Home06: large hero delays project content; header and content end on different right edges. | Shared 1380px maximum container, sticky 80px header, smaller hero scale. Home15 retains the bold two-line hierarchy and fits the complete project image/action higher in the viewport. Header and project container right edges both measured 1440px. |
| P2, resolved | Home06: subtitle and description separated by about 110px; mobile04 image begins around y644 and 3D action is clipped at the fold. | Explicit project grid groups copy; mobile DOM and visual sequence is title → media/3D → description → detail action. Mobile10 image starts y521 and the 3D action is fully visible around y698. |
| P2, resolved | About02/profile05: duplicated introduction, separated identity, excessive navigation offset. | One portrait/introduction/principles/stats section; old `#vision` anchor retained inside it. About09/mobile11 show identity and facts together. ABOUT target measured at y80 desktop and y64 mobile, directly below the respective header. |
| P2, resolved | Contact03: small copy control and floating TOP overlap the copyright. | Copy control now 44px high. TOP occupies its own footer grid slot with natural focus order. Contact18 shows separation; desktop TOP begins at x1351, copyright ends at x1327. |
| P2, resolved | Integration review: compact header briefly hid the sound control; CSS-only mobile reordering disagreed with keyboard order. | Sound retained at all header widths; project DOM reordered before applying the desktop grid. At 800px all header controls fit; 3D controls also fit their actual 331px column. Footer TOP follows footer links in both DOM and visual order. |
| P2 verification, resolved | Early captures08/09 appeared to omit rail content and show two active underlines. | Rechecked against actual viewport16 and tablet13; confirmed capture/transition artifacts. No source alteration to the rail was required. |
| P2, resolved | Contact17: a short final section could not reach the navigation marker at maximum scroll. | Active-section logic now selects the last section at the document bottom. After reloading `script.js?v=field-2`, DOM verification returned exactly `[CONTACT]`. Contact18 supplies post-fix layout evidence. |

The initial audit remained a fix list until these changes and paired rechecks were complete. Formatting, source syntax, and cleanup checks were not counted as visual iterations.

## Five required fidelity surfaces

- **Fonts and typography:** retained Pretendard Variable and the existing mono family; computed hero font confirms the intended stack. Desktop title scale is reduced while its two-line weight and identity remain. Korean and English home headings fit at mobile, 800px, and desktop widths. Mobile archive dates/titles and control labels were enlarged. No truncation or unintended overflow was observed.
- **Spacing and layout rhythm:** header, hero, lens, project, and body use a common content boundary. Description/action spacing is deliberate; mobile media appears before supporting copy. About/portrait/stats share a section. Footer controls have their own space. Section anchors use one header offset instead of stacked padding/margins.
- **Colors and visual tokens:** retained paper `#f4f3ee`, ink `#191a18`, orange `#c84021`, and existing dark tokens. The loader uses the same tokens. Dark paired evidence and light `19-archive-mobile-light.jpg` / `20-home-light-final.jpg` were inspected. No new generic card or gradient language was introduced.
- **Image quality and asset fidelity:** actual supplied profile photo is retained with the existing face-centered crop; RESCUE JET poster and interactive model remain. No generated replacement portrait, fake artwork, or placeholder icon was introduced. Original arrow asset and licenses remain present.
- **Copy and content:** redundant generic biography was replaced with a concise first-person introduction. Facts, principles, 28 activity records, 29 content records, all 7 detail panes, and existing external destinations were preserved. Loader copy says it is preparing the work index and uses indeterminate progress, without invented percentage claims.

## Interaction and implementation validation

Browser checks passed:

- Loader observed during actual page entry (`07-load-capture.jpg` catches its fade); on completed navigation it has `aria-hidden=true` and does not cover the page.
- Mobile MENU opens, changes to CLOSE, and closes when navigating; ABOUT lands below the sticky bar.
- Korean/English and dark/light transitions work.
- Planning, Making, and Sharing lenses switch content. Sharing opens the content archive.
- 3D launch renders a canvas; propulsion and exploded-state buttons update their pressed states. At 320px the control groups wrap without page overflow. At 800px they fit their 331px column, with 44px button heights after the final CSS adjustment.
- Project detail dialog opens; Escape dismisses it.
- Year filter shows only 2025. Card News filter shows card items; sorting switches to ascending.
- Email copy reports success. TOP updates the URL to `#home` and focuses the home section.
- No page overflow observed at 320, 390, 800, 1440, or 1920px in checked states. Final browser error/warning log was empty.

Static checks passed: syntax for `script.js`, `page-loader.js`, `rescue-viewer.js`, and `rescue-model.js`; unique HTML IDs; local referenced assets; preservation of 28/29/7 record counts. The bounded loader VM scenarios and their limitations are documented in `design-audit/ui-refinement/loader-checks.md`. Its maximum 1.8s deadline, readiness handling, reduced motion, interruption, and failure recovery were tested with a controlled clock; this is not a browser network-timing benchmark. The stable loader visual fixture was removed after capture as requested.

## Remaining limits and checklist

- [x] Add branded loader with fail-open behavior.
- [x] Refine desktop/mobile composition and hit areas.
- [x] Preserve profile, 3D, archive records, and links.
- [x] Complete paired visual checks and core interactions.
- [x] Clean unused/duplicate artifacts and verify runtime references.
- [x] Restore normal browser viewport and leave the verified local preview open.

No P3 changes are required for this handoff. This pass did not repeat third-party Instagram network/embed behavior, browser-specific screen-reader testing, or hardware validation; no changes were made to those integrations. Cleanup removed 32 temporary/duplicate files (4,140,657 bytes); see `docs/cleanup.md`.
