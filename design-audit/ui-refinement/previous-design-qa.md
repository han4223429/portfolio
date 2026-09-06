# Design QA — Han Field Index

**Findings**

No actionable P0, P1, or P2 findings remain in desktop v4, Korean/light mobile at 390 px, or English/dark mobile at 320 px. The earlier image-treatment, project-action, and initial-navigation-state findings are resolved.

**Comparison target and evidence**

- Source visual truth: `design-audit/2026-09-06/concept-field-notes.png`.
- Desktop implementation: `design-audit/2026-09-06/implementation-desktop-v4.jpg`.
- Earlier reviewed implementation: `design-audit/2026-09-06/implementation-desktop-v3.jpg`.
- Mobile implementation: `design-audit/2026-09-06/implementation-mobile-390.jpg`.
- Narrow mobile implementation: `design-audit/2026-09-06/implementation-mobile-320-en-dark.jpg`.
- Browser: user's selected in-app Browser, local portfolio route.
- Source pixels, desktop screenshot pixels, and CSS viewport: 1487 × 1058. Effective screenshot density: 1 pixel per CSS pixel; no normalization or stretching.
- Mobile pixels and CSS viewport: 390 × 844, effective density 1. An earlier invalid 390 × 190 capture was discarded.
- Narrow mobile pixels and CSS viewport: 320 × 760, effective density 1; explicit viewport clip, no stretching.
- Desktop state: page top, Korean, light, sound off, development lens/RESCUE JET, stable opacity 1.
- Mobile state: page top, Korean, light, menu closed, development lens/RESCUE JET.
- Narrow mobile state: page top, English, dark, menu closed, development lens/RESCUE JET; persisted language/theme after reload and sound off.
- Full-view evidence: source and desktop v3 were opened together in one comparison tool input, then source and v4 were opened together at original resolution. Source and mobile were also opened together.
- Source and English/dark 320 px mobile were subsequently opened together in one original-resolution comparison input.
- No mobile source exists. Mobile was assessed for hierarchy, usability, and visual-system continuity, not pixel equality.
- Separate focused crops were unnecessary: the native-resolution paired views made the headline, nav underline, lens labels, primary action, image treatment, and copy legible. These regions were explicitly inspected.

**Required fidelity surfaces**

| Surface | Evaluation |
| --- | --- |
| Fonts and typography | Pretendard preserves the heavy Korean sans-serif headline, two-line wrap, tight display spacing, and hierarchy. Mono metadata supports the studio-index direction. The project action is now 16 px desktop/14 px mobile; body copy is readable and untruncated. |
| Spacing and layout | Narrow persistent rail, asymmetrical hero, long lens track, horizontal project spread, and simple rules match. Main content runs approximately x182–1342. Mobile replaces the rail with a compact header and stacks the project without collision. |
| Colors and tokens | Paper #f4f3ee, ink #191a18, restrained orange #c84021 preserve the palette. The slightly darker orange is an accepted readable token. Image surface is now #f5f5f5 and the darkening blend is removed. |
| Image quality and fidelity | Actual images/rescue-jet.jpg intentionally replaces the mock's altered rendering. Its original subject, detail, and proportions are preserved. Source JPEG resolution is an accepted limitation. The arrow is the official Lucide arrow-up-right asset, not a custom approximation. |
| Copy and content | Korean hero/supporting copy match. Project identity and narrative are coherent. Real year/caption and existing bilingual/theme controls are preserved. Development is intentionally the default lens for the real hardware project. |

**Comparison history**

1. **v1 — implementation-agent comparison.** Main proportions/type scale drifted. The agent adjusted container maximum to 1252 px, hero columns to 2.1fr/1fr, hero font to 7.05vw with 1.2 line height, project heading to 3.45vw. This history is supplied by the agent, not an independent v1 review.
2. **v2 — invalid evidence.** Captured during animation; excluded.
3. **v3 — independent paired review, blocked at that iteration.**
   - **[P2] Product image darkened:** gray figure plus multiply blend dulled the actual JPG versus the source's near-white image surface. Fix: remove blend and lighten surface.
   - **[P2] Project action affordance weakened:** 14 px text plus a CSS dash produced two rule-like strokes instead of the source arrow. Fix: official icon and 16 px desktop label.
   - **[P2] Initial WORK state absent:** source had a WORK underline at page top. Fix: mark the hero/selected-work location as WORK.
4. **v4 — independent paired post-fix review, passed.** New capture visibly shows clean image treatment, readable action with arrow, and WORK underline. No actionable P0/P1/P2 remains. Small rasterization/vertical-position differences preserve hierarchy.
5. **390 × 844 — independent mobile review, passed.** Headline, copy, lenses, narrative, and CTA fit without horizontal overflow or collision. Image continues below viewport through ordinary scrolling. Cursor over the logo is a capture artifact.
6. **320 × 760, English/dark — independent mobile review, passed.** The English heading remains two lines. Supporting text, all three lens labels, project title/description, and primary action fit without clipping or collision. Inverted paper/ink and brighter orange preserve the visual system and readable contrast. Cursor near MENU is a capture artifact.

**Runtime evidence**

The implementation agent supplied observed in-app Browser results. This reviewer did not re-run those interactions.

- Three lenses and ArrowRight keyboard movement pass.
- Planning project modal opens, makes background inert, traps focus, closes on Escape, and restores focus.
- Sound explicitly enables; reload returns to SOUND OFF.
- Sound ON state and AudioContext creation were observed; actual acoustic output was not independently auditioned.
- Light/dark and Korean/English controls work.
- At 320 px, reload preserves `lang=en` and the dark theme; SOUND OFF and no horizontal overflow were verified.
- Archive year 2025 returns 11 matching records.
- Content expands to 29 records: 9 card-news and 20 reels. Ascending sort verified across all 9 dates; collapse returns to 3.
- Instagram iframe count is 0 before user action and 1 after explicitly loading an actual preview.
- Email copy shows success.
- Email copy verification is limited to successful UI feedback; the system clipboard was not read back.
- Mobile menu opens with main inert/body locked; Escape clears aria-expanded and restores main.
- Mobile home navigation returns headline to y96.
- At 320 px, the build modal opens with main inert and no horizontal overflow. Shift+Tab wraps to the article link; Escape closes.
- English mobile-menu labels are correct.
- Console errors/warnings checked before mobile tests, after the Instagram embed, and after final mobile navigation: empty arrays.
- Mobile CONTACT navigation closes the menu, clears main inert, and focuses the contact section without horizontal overflow.

The coordinator also visually inspected `design-audit/2026-09-06/implementation-about.jpg`, `implementation-archive.jpg`, and `implementation-contact.jpg` at 1487×1058. The lower sections retain the same paper/ink typography and aligned content grid; activity rows and contact controls remain readable. The fixed TOP control slightly overlaps the far-right copyright line at the page bottom (P3 cosmetic only; no interactive control is obscured).

**Open questions and coverage**

- Reduced-motion behavior was checked in source only; the exposed browser API did not support runtime emulation.
- No source mock exists for mobile, dark mode, English, or lower-page states; evaluate those for usability and visual continuity.
- This static portfolio has no checkout route, so no checkout-flow pass is claimed.
- No cross-browser or assistive-technology session is claimed.

**Implementation checklist**

- [x] Paired same-viewport desktop comparison.
- [x] Five required fidelity surfaces checked.
- [x] All desktop P2 findings fixed and visually rechecked.
- [x] 390 px mobile reviewed.
- [x] Core interactions and console evidence recorded.
- [x] Final narrow-mobile and persistence evidence recorded.


**Follow-up: RESCUE JET web 3D**

At the user’s request, the source image now offers an optional interactive reconstruction. The existing page remains the baseline above; the changed component has its own [passing visual QA](design-audit/rescue-3d/qa.md), [source review](design-audit/rescue-3d/review.md), and [usage/implementation notes](docs/rescue-3d.md). The 3D experience was checked at desktop, 390 px Korean and 320 px English, including model rotation by keyboard, zoom/reset, exploded/propulsion states, lens/modal compatibility, and source-photo exit/re-entry. Final console warnings/errors were empty.

final result: passed
