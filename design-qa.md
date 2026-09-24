# Doctor redesign — visual QA

final result: passed

Scope: adaptation of the supplied doctor prototype into the existing authenticated application. This is not pixel equality or clinical acceptance. No production promotion is included.

## Evidence and comparison state

Source: `/Users/vitormilanez/Desktop/Prints/Captura de Tela 2026-09-23 às 20.24.47.png` (Hoje), `20.25.09.png` and `20.25.15.png` (review), `20.25.44.png` (patients), `20.25.49.png` (record), `20.26.11.png` and `20.26.16.png` (agenda), `20.26.23.png` (messages), with the same filename prefix. The provided prototype HTML was also inspected.

Implementation: local Next app on `http://127.0.0.1:3014`, authenticated doctor. Screenshots are outside Git because they contain private application content:
`/Users/vitormilanez/Desktop/Codes/Instituto Vivance/outputs/doctor-redesign/fidelity/`.

- `today-desktop.png`, `record-desktop.png`, `review-desktop.png`
- `patients-final.png`, `agenda-day-final.png`, `agenda-week-desktop.png`
- `messages-desktop.png`, `messages-mobile.png`
- `review-mobile-list.png`, `review-mobile-detail.png`

Desktop override: 1264 × 814; browser reported 1330 × 857 CSS px and devicePixelRatio 0.95 because of its existing zoom. Mobile override: 390 × 844; observed CSS width 410. All checked page widths matched document scroll widths. Overrides were cleared after QA.

Source PNGs are approximately 2× density (e.g. messages 2532 × 1438, patients 2526 × 1538, agenda day 2532 × 1446). IAB captures contained a reduced page region (700 × 451) in a 1400 × 901 canvas. For visual comparisons, this surrounding canvas was cropped and the content resized to 1264 × 814; source images were resized to width 1264 preserving their aspect ratio. `*-normalized.png` and `*-reference.png` are QA-only copies, not application assets. Browser DOM measurements were used to verify row sizes and overflow independently of screenshot scaling. The captures are unsuitable for a pixel-diff claim.

Sources and implementations were shown together in comparison inputs for Hoje, review, messages, patients and agenda. Patient names, counts, clinical content and current appointment differ between the illustrative prototype and the connected application. These differences were not classified as visual defects.

## Comparison history and findings

- [P1, fixed] Review previously used stacked navigation cards. It now has grouped arrivals on the left, original content on the right, filters and a mobile list/detail transition. Existing medical review contracts remain intact.
- [P2, fixed] Patient avatars and names inherited a vertical global flex rule. A more specific scoped selector restores horizontal identity rows; DOM verification showed 76 px rows. Evidence: `patients-desktop.png` versus `patients-final.png`, compared again with the source.
- [P2, fixed] Message bubbles stretched with the long recipient list. The desktop workspace now has a viewport-bound height, independently scrolling recipients/history and content-sized bubbles. Verified bubble heights were 75/96 CSS px; composer remained visible. Evidence: `messages-desktop.png` and normalized source/implementation comparison.
- [P2, fixed] Agenda selected-day label lost contrast and management actions enlarged each row. Explicit foreground color, revised grid tracks and a native disclosure for secondary actions restore readable controls and approximately 94 px rows. Menu contents were inspected without performing an appointment mutation. Evidence: `agenda-day-final.png`, compared after the fixes.
- [P2, fixed] Duplicate directory headings occupied too much vertical space. Redundant visible headings/copy were removed while retaining the page heading for assistive technology. Evidence: `patients-final.png`.

## Required fidelity surfaces

- Typography: Figtree loaded in the doctor shell; compact headings, 14 px base, quieter supporting text. Computed font family was verified. Full-view and identity/control regions were inspected; no clipping was observed in the checked widths.
- Layout: 208 px sidebar, 64 px top bar, cream canvas, white panels, compact directory rows, split review and three-column desktop messaging. Today keeps consultation/context left and review/open work right. Responsive review uses a separate detail screen with a back action.
- Colors: navy `#0a1a33`, cream `#f7f5f1`, gold `#c8a15a`, restrained borders; selected agenda controls have an explicit readable foreground.
- Assets: existing Vivance raster brand mark and Lucide icons. No invented clinical charts, placeholder screenshots or handmade logo substitution.
- Copy/content: real available fields and current action contracts are retained. Opening an item remains distinct from medical review. Filters disclose their current-page scope. Partial calendar coverage explains how to open days in the adjacent month.

## Expected differences and remaining limits

The prototype's fabricated weight sparklines, adherence/symptom summaries, AI draft and configurable clinical points are not copied as fake functionality. Patient directory columns use the currently returned registration/intake fields. The record retains existing tabs and care-context cards. Review notes retain existing mandatory confirmation/version rules rather than adopting the prototype's optional-note shortcut. Agenda includes all seven days and horizontally scrolls within its weekly panel; adjacent-month days are loaded by opening the day. No write-based clinical acceptance was performed.

## Checks

- Real browser: Hoje, patient directory and record, review filters/empty state/original preparation, agenda day/week and month boundary, secondary action disclosure, messages and composer visibility.
- Mobile: messages width and review list → detail → back; no document-level horizontal overflow at the checked width.
- Console errors checked: none in the inspected browser log.
- 343 automated tests, TypeScript, lint and production build passed. The final visual-only CSS refinements were rechecked in the browser.
- Review selection regression covers unknown IDs, wrong kind and mismatched patient scope.

## Follow-up polish

Further parity in clinical summaries requires real data contracts and separately scoped product work. The current result intentionally preserves the existing product behavior while adopting the prototype's structure and visual language.
