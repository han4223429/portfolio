# Product Design QA — RESCUE JET launch action

final result: passed

Local preview: http://localhost:4173/#projects

## Source and rendered evidence

The user rejected the large black 3D banner in their attached screenshot. The accepted direction for this scoped correction is the existing product image with a small light action below it.

- Source visual truth: `design-audit/rescue-launch/before-desktop.jpg` — 632 × 360 pixels, captured from the 1440 × 1000 Korean/light page.
- Implementation: `design-audit/rescue-launch/after-desktop.jpg` — same 632 × 360 component crop and viewport/state.
- Mobile implementation: `design-audit/rescue-launch/after-mobile-320.jpg` — 284 × 270 component crop from a 320 × 844 viewport, Korean/light.

The source and implementation were opened together in the same comparison input. Component crops provide focused evidence at one image pixel per CSS pixel; no scaling or density normalization was needed. The product-image source was also opened to verify that its pre-existing lower cropped diagram is part of the actual supplied asset, not a new crop defect.

## Findings and iteration

[P2, resolved] The old dark banner and heavy shadow covered the product and dominated its presentation. The new caption row places a compact white outlined button alongside the metadata, below the image. The duplicate decorative `INTERACTIVE MODEL / 01` line was removed. The component keeps its existing outer dimensions. Desktop button top was measured 12px below image bottom; mobile separation is 10px. No image/action overlap remains.

The initial finding required a visual change. After that change, matched desktop comparison and the mobile capture were inspected; no additional actionable P0/P1/P2 mismatch remained. An independent source/integration review found no blocker.

## Required fidelity surfaces

- **Typography:** button reduced from 18px/two lines to one 13px semibold label; Korean and English remain readable and untruncated. Caption retains the existing mono treatment.
- **Spacing/layout:** action occupies its own footer row instead of overlaying the image. Button hit height remains 44px. At 320px in English, caption ends at x153 and button begins at x159, with no collision or page overflow.
- **Colors/tokens:** white button and footer replace the black panel; neutral ink text, a thin gray border, and a restrained warm arrow complement the existing image. Hover uses a pale warm fill with no large shadow. The media surface remains light to match the source image in either page theme.
- **Image quality/assets:** original RESCUE JET image is retained, with contain sizing inside the available media row. The existing arrow asset is retained. No image was generated or substituted.
- **Copy/content:** primary Korean/English action labels and product metadata are preserved; only the redundant decorative line is removed. No project records or other page copy changed.

## Validation

- New button launches the 3D canvas; poster hides and live figure layout switches correctly.
- Original Photo returns to the poster and restores focus to `rescueLaunch`.
- Korean and English fit at 320px; no horizontal page overflow.
- IDs, aria-controls, mutable loading label, icon placement, and direct semantic figcaption are retained.
- Loading/error status occupies a separate flow row. Its positioning was source-reviewed; an actual import failure was not forced in this scoped UI check.
- `git diff --check` passed. No JavaScript behavior was changed and no redundant test suite was added.

The verified local preview is open with the normal browser viewport restored. The previous full-page QA is retained at `design-audit/ui-refinement/final-qa.md`.
