---
name: Virada 90 — Instituto Guilherme Martins
description: A calm physician-led prospectus and ten-topic reading experience.
colors:
  navy: "#0b1d35"
  ink: "#152b45"
  muted: "#596573"
  gold: "#d8b06b"
  gold-ink: "#85622c"
  ivory: "#f7f5ef"
  paper: "#fffefa"
  line: "#dcded9"
  sage: "#e9eeea"
typography:
  display: { fontFamily: "Manrope, sans-serif", fontSize: "clamp(38px, 4.4vw, 64px)", fontWeight: 600, lineHeight: 1.15, letterSpacing: "-0.035em" }
  body: { fontFamily: "Manrope, sans-serif", fontSize: "16px", fontWeight: 400, lineHeight: 1.7 }
  serif-emphasis: { fontFamily: "Instrument Serif, Georgia, serif", fontWeight: 400, letterSpacing: "-0.015em" }
rounded:
  standard: "6px"
  comparison: "8px"
spacing:
  content-gutter: "96px"
  section: "112px"
  section-mobile: "66px"
components:
  button-primary: { backgroundColor: "{colors.navy}", textColor: "{colors.paper}", typography: "{typography.body}", rounded: "{rounded.standard}", padding: "15px 23px", height: "56px" }
  button-contact: { backgroundColor: "{colors.gold}", textColor: "{colors.navy}", typography: "{typography.body}", rounded: "{rounded.standard}", padding: "15px 25px", height: "56px" }
  choice-row: { backgroundColor: "{colors.paper}", textColor: "{colors.ink}", typography: "{typography.body}", rounded: "{rounded.standard}", padding: "15px 17px", height: "56px" }
  topic-select: { backgroundColor: "{colors.paper}", textColor: "{colors.ink}", typography: "{typography.body}", rounded: "{rounded.standard}", padding: "10px 36px 10px 12px", height: "48px" }
---

# Design System: Virada 90 — Instituto Guilherme Martins

## Overview

**Creative North Star: "The Measured Clinical Prospectus"**

The system makes a physician-led program feel calm, legible, and personal. Ivory reading fields, dark navy passages, and restrained warm gold establish authority without promising outcomes. The landing remains a long-form prospectus with its real video; the companion presentation is a complete ten-topic reading experience.

Fine rules, compact numerals, native controls, and three natural editorial photographs organize detailed information without turning it into a dashboard. Photography supports assessment, flexible nutrition, and everyday maintenance. It is illustrative and never represents the doctor, clinic, patients, facilities, or results.

**Key Characteristics:**
- Navy authority on warm paper, with gold reserved for emphasis and action.
- Manrope carries information; Instrument Serif appears only as a short italic inflection.
- Fine rules, numerals, and native controls organize the ten-topic journey.
- Three natural 3:2 photographs punctuate assessment, nutrition, and maintenance.
- Responsive layouts preserve readable prose and one final WhatsApp handoff.

## Colors

The palette moves between warm editorial paper and deep clinical navy; gold is a restrained signal.

### Primary
- **Clinical Navy:** Strong passages, primary controls, markers, and native-control accents.
- **Warm Gold:** Progress, short serif emphasis, focus, and the final contact action.

### Secondary
- **Sage Check-in:** Clinical caveats, optional-interest summaries, and quiet informational states.

### Neutral
- **Ivory Reading Field:** Low-glare page background.
- **Paper Surface:** Choices, selector, comparisons, and light containers.
- **Deep Ink:** Primary reading text.
- **Muted Clinical Copy:** Supporting prose, captions, and labels.
- **Fine Rule:** Navigation, lists, comparisons, disclosures, and progress.

### Named Rules
**The Gold Is a Signal Rule.** Use gold for emphasis, progress, focus, and high-intent contact; let navy and paper carry large surfaces.

**The Rule Before Ornament Rule.** Structure information with a fine line, number, or measured grid before adding decoration.

## Typography

**Display Font:** Manrope (sans-serif fallback)

**Body Font:** Manrope (sans-serif fallback)

**Serif Emphasis:** Instrument Serif (Georgia fallback), italic only

Manrope keeps program details, prices, and caveats direct. Instrument Serif is limited to the short `90` brand inflection.

### Hierarchy
- **Display** (600, `clamp(38px, 4.4vw, 64px)`, 1.15): Landing hero.
- **Reading Heading** (600, `clamp(38px, 4.2vw, 58px)`, 1.12): One heading per topic; 32–40px on mobile.
- **Section Heading** (600, `clamp(32px, 3.1vw, 46px)`, 1.15): Landing sections.
- **Row Title** (600, 20–26px, 1.15–1.3): Pillars, phases, offers, and timeline titles.
- **Body** (400, 16–17px, 1.7–1.8): Prose constrained to 66–70ch.
- **Label** (600–700, 10–13px): Status, optional markers, metadata, and controls.

**The Italic Inflection Rule.** Never set informational blocks in Instrument Serif.

## Layout

The landing uses a centered 1240px content width and 1344px header. Major sections use 112px vertical spacing, reducing to 66px below 760px. Its real video and existing editorial sequence remain intact.

The presentation uses a 1160px shell, a reading column up to 700px, and a 248px sticky program index across an 86px gap. Progress and the native selector share this grid. At 900px the gap and index narrow; below 760px everything becomes one column, the sticky index hides, photographs stay full-width, and comparisons stack.

The sequence is introduction, pillars, assessment, individual plan, accompaniment, maintenance, exams and supplements, questions, formats, then prices and contact. Back, Continue, arrow keys, and the native selector expose the same sequence. Objective and format choices are optional and remain only in page memory.

**The Read Before Handoff Rule.** Keep all ten topics navigable, choices optional, and the only external action in topic ten.

**The Final-Step Price Rule.** Prices belong only in topic ten, after program, limits, and formats are explained.

## Elevation & Depth

The system is flat by default. Tonal shifts and rules define regions. The landing's real video retains `0 20px 60px #0003`; the gold WhatsApp action gains `0 8px 22px #0b1d3515` only on hover. Guided photographs remain flat. Progress uses a scale transform, and reduced-motion preferences remove transitions.

**The Flat Clinical Surface Rule.** Reserve shadows for the landing's real video or an interaction state.

## Shapes

Controls and photographs use 6px corners. The landing portrait retains its large top-left curve. Format comparisons use one shared 8px frame. Phase markers are compact rectangles; progress is a 2px rule rather than a pill.

## Components

### Buttons
- **Primary / Back:** 56px minimum height; navy forward action and transparent ruled return action.
- **Contact:** Gold with navy text, shown only in topic ten and opening WhatsApp.
- **Focus:** 3px gold-ink outline with 4px offset; mobile journey buttons remain at least 52px high.

### Native Topic Selector
- Paper field, fine-rule border, 6px corner, 48px minimum height, and persistent label.
- Lists ten numbered titles and stays synchronized with buttons, progress, and keyboard navigation.

### Choice Rows
- Optional native radios in flat paper rows with 1px rules and 56px minimum height.
- Selection uses a gold-ink border, warm paper fill, and navy native accent.
- Choices remain in page memory and may enrich the editable WhatsApp draft; neither blocks reading.

### Editorial Figures
- Three 1200×800 natural JPEGs at 3:2: assessment, nutrition planning, and maintenance.
- Muted 11px captions identify each image as illustrative and preserve individual-care caveats.

### Ruled Information Patterns
- Lists align titles and explanatory copy across fine rules, then stack on mobile.
- Sage clinical notes have 14px by 16px padding and no elevation.
- Native disclosures use ruled rows and gold-ink plus/minus indicators.
- Two offers share one 8px ruled frame; tabular prices appear only in topic ten.

### Navigation and Progress
- The presentation header keeps the institutional mark and one return link to `/virada90`.
- A 2px track pairs `Etapa n de 10` with the current title; fill uses `transform: scaleX(...)`.

### WhatsApp Handoff
- One gold `Conversar pelo WhatsApp` action targets `+55 18 99755-1234` in topic ten.
- Optional selections enter the editable draft only when chosen.
- No contact field, submission, checkout, API, CRM, database, storage, automatic send, reservation, or payment state exists.

## Do's and Don'ts

### Do:
- **Do** preserve ten-topic status, selector, Back, and Continue as equivalent navigation paths.
- **Do** keep choices native, reversible, optional, and local to page memory.
- **Do** use the three editorial photographs only in their established topics with illustrative captions.
- **Do** reveal both three-month offers and prices only in topic ten, followed by one WhatsApp action.
- **Do** maintain visible focus, 44px-plus targets, and reduced-motion support.

### Don't:
- **Don't** turn ruled information into elevated card stacks.
- **Don't** add video placeholders, avatar slots, contact collection, checkout, or payment controls to the presentation.
- **Don't** imply interest-free installments, a fixed consultation count, guaranteed results, or automatic prescriptions.
- **Don't** present generated images as real people, facilities, or outcome evidence.
- **Don't** replace or remove the real video on `/virada90`.
