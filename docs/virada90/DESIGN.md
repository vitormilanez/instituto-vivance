---
name: Virada 90 — Instituto Guilherme Martins
description: A calm, physician-led 90-day program prospectus.
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
  display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(38px, 4.4vw, 64px)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.7
  serif-emphasis:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontWeight: 400
    letterSpacing: "-0.015em"
rounded:
  standard: "6px"
spacing:
  content-gutter: "96px"
  section: "112px"
  section-mobile: "66px"
  control-y: "19px"
  control-x: "25px"
components:
  button-primary:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.paper}"
    typography: "{typography.body}"
    rounded: "{rounded.standard}"
    padding: "19px 25px"
    height: "56px"
  button-contact:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.navy}"
    typography: "{typography.body}"
    rounded: "{rounded.standard}"
    padding: "19px 25px"
  choice-row:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.standard}"
    padding: "16px 18px"
    height: "58px"
  text-input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.standard}"
    padding: "14px 15px"
---

# Design System: Virada 90 — Instituto Guilherme Martins

## Overview

**Creative North Star: "The Measured Clinical Prospectus"**

The system makes a physician-led program feel calm, legible, and personal. An ivory reading field, dark navy passages, and a restrained warm-metal accent establish clinical authority without promising an outcome. The page carries the program through long-form editorial pacing: statement, method, day-90 outlook, timeline, formats, and contact.

The practical signature is measured structure. Ruled rows, timeline markers, small numerical labels, and a real portrait turn the 90-day cadence into a visual organizing device. Dense clinical detail is kept readable through wide margins, muted supporting copy, and a modest sans/serif contrast.

**Key Characteristics:**
- Navy authority on warm paper, with gold reserved for emphasis and action.
- Manrope supplies clear informational text; Instrument Serif appears only as a warm italic inflection.
- Fine rules and small markers organize the journey instead of decorative ornaments.
- Responsive layouts preserve one clear contact action while collapsing multi-column material into a single reading flow.
- The guided journey reuses the editorial world in an Operate mode: six focused steps, native controls, visible progress, and a restrained review handoff.

## Colors

The palette moves between warm editorial paper and deep clinical navy; gold is a restrained signal, never a screen-wide fill.

### Primary
- **Clinical Navy:** Primary dark field for the header-adjacent action, video passage, portrait caption, contact passage, and principal timeline markers.
- **Warm Gold:** Accent for serif emphasis, selected labels, gold contact action, and small timeline and list details.

### Secondary
- **Sage Check-in:** Quiet highlighted surface for the central method row and soft timeline states.

### Neutral
- **Ivory Reading Field:** Default page background that keeps the landing warm and low-glare.
- **Paper Surface:** Clean light surface for cards and the timeline section.
- **Deep Ink:** Primary reading color on light fields.
- **Muted Clinical Copy:** Supporting paragraphs, secondary labels, and explanatory notes.
- **Fine Rule:** Structural divider for navigation, methods, cards, FAQ, and timeline regions.

### Named Rules
**The Gold Is a Signal Rule.** Use gold and gold-ink for emphasis, markers, and high-intent contact treatment; let navy and paper carry the page's large surfaces.

**The Rule Before Ornament Rule.** Use the existing fine line, marker, or timeline treatment to structure information before introducing a decorative device.

## Typography

**Display Font:** Manrope (with sans-serif fallback)
**Body Font:** Manrope (with sans-serif fallback)
**Serif Emphasis:** Instrument Serif (with Georgia fallback), italic only

**Character:** Manrope keeps qualifications, format details, and clinical caveats direct. The italic serif interrupts the sans rhythm for short emotional or programmatic emphasis, never for dense copy.

### Hierarchy
- **Display** (600, `clamp(38px, 4.4vw, 64px)`, 1.15): Hero statement; section heading sizes reuse the same tight, balanced display treatment at smaller scales.
- **Section Heading** (600, `clamp(32px, 3.1vw, 46px)`, 1.15): Major section titles.
- **Row Title** (600, 24–26px, 1.15): Method steps, format names, and timeline information titles.
- **Body** (400, 16px, 1.7): Default prose; supporting long-form copy widens to 1.8–1.9 line height and stays within 70ch.
- **Label** (600–700, 10–13px): Navigation, program metadata, timeline days, and compact supporting labels.

### Named Rules
**The Italic Inflection Rule.** Instrument Serif is used for a short word, phrase, or numerical emphasis within a Manrope hierarchy; do not set full informational blocks in the serif.

## Layout

Desktop content uses a centered 1240px maximum width with 96px outer subtraction; the header uses a slightly wider 1344px maximum with 72px subtraction. Major editorial sections use 112px vertical spacing, reducing to 66px at 760px and below. The primary breakpoint at 760px changes the hero, method, comparison, journey, FAQ, and content grids to a single reading column; at this width, the header retains only the contact route.

The large-screen composition alternates purposeful two-column regions with full-width navy or tonal passages. The journey holds a sticky introduction beside the actual-day ruler, so the chronological structure remains visible while the narrative is scanned. Containers use wide gaps (70–120px) to avoid compressing clinical explanation into a dashboard-like grid.

The guided journey uses a narrower operational shell: a 1160px maximum width, a 640px primary column, and a 112px gap to a reserved video aside. Its six-step progress stays above the grid. At 760px and below, the form becomes one column and the desktop aside is hidden; the task remains focused instead of shrinking the media rail into the interaction path.

**The One Decision Per Step Rule.** In Operate mode, each viewport advances one clear choice or reading task. Preserve Back and Continue controls, step count, native field semantics, and focus movement between steps.

## Elevation & Depth

The system is flat by default. Background shifts, fine rules, and navy/paper contrast define region boundaries. The video player carries the only durable elevated treatment (`0 20px 60px #0003`), while the primary action gains a modest shadow only on hover. Motion is quiet: controls use a 0.2s color/background/shadow transition, and the portrait has a single entrance animation only when reduced motion is not requested.

Operate-mode video placeholders use a lighter media lift (`0 14px 30px #0002`). Offer review uses a fine top rule and a warm tonal field, keeping the selection legible without turning it into a floating card.

### Shadow Vocabulary
- **Video Lift** (`box-shadow: 0 20px 60px #0003`): Gives the vertical video a contained presence within its navy passage.
- **Action Hover** (`box-shadow: 0 8px 22px #0b1d3515`): Brief feedback on the navy primary action.
- **Reserved Media Lift** (`box-shadow: 0 14px 30px #0002`): Separates compact guided-journey video slots from the reading field on desktop.

### Named Rules
**The Flat Clinical Surface Rule.** Keep information containers flat and use rules, tonal fills, and typography for hierarchy; reserve shadows for media or an interaction state.

## Shapes

Most interactive and media surfaces use a gently softened 6px corner. The portrait is the exception and the recognizable silhouette: one large top-left curve (140px on desktop, 80px on mobile) with the remaining corners held at 6px. The two format panels share an 8px outer frame with a single divider, reinforcing that they are choices within one program rather than unrelated cards. Timeline markers are compact 3px rectangles or circles, not rounded pills.

## Components

### Buttons
- **Character:** Dark, confident, and direct, with one clear next step.
- **Shape:** Gently rounded (`6px`) inline-flex control with a 56px minimum height.
- **Primary:** Navy field with paper text; 19px vertical and 25px horizontal padding, 700-weight 14px Manrope, and a 24px icon gap.
- **Contact:** Gold field with navy text in the navy contact passage, using the same core control construction.
- **Hover / Focus:** Hover shifts the field color; visible keyboard focus uses a 3px gold-ink outline offset by 5px.

### Cards / Containers
- **Format pair:** Two equal columns inside a shared 1px fine-rule frame with an 8px outer corner. The primary format is navy with paper text; the companion remains paper. At mobile width the pair becomes a single stack.
- **Method highlight:** The central step is a sage surface with 27px by 23px padding and the standard 6px corner; ordinary method steps remain open ruled rows.
- **Video container:** Navy-adjacent dark field, standard 6px corner, clipped vertical media, and the documented Video Lift.

### Navigation
- **Header:** A 106px-high ruled horizontal bar with compact 600-weight Manrope links. The contact link is distinguished by a gold-ink bottom rule rather than a filled button.
- **Mobile:** Below 760px, non-contact navigation links are hidden; the contact route remains visible in the 84px-high header.

### Guided Journey
- **Progress:** A 2px fine-rule track with a gold-ink fill, paired with a tabular `Etapa n de 6` label.
- **Choices:** Native radio inputs sit inside flat paper rows with a 1px rule and standard corner. Selection changes the border to gold-ink and the fill to warm paper; the native control keeps navy accent color.
- **Inputs:** Native input and textarea elements use paper backgrounds, 1px fine rules, 14px by 15px padding, and the standard corner. Visible focus uses the shared 3px gold-ink outline.
- **Actions:** Back is a transparent ruled control; Continue is the navy primary action. Both maintain at least 52px height on mobile.
- **Offer review:** The selected format appears in a warm, fine-top-rule panel. Keep the price and inclusion hierarchy typographic; do not add shadow, badge, or decorative card framing.
- **Reserved video:** Desktop uses a dedicated right aside and compact navy media slots. Hide the aside below 760px so the form remains the sole mobile task.
- **Handoff:** The final view presents payment and team contact as independent actions. Status text must state when checkout is not connected; user-entered answers remain in memory until an external handoff is chosen.

### Timeline
- **Structure:** Navy `DIA` markers sit on a single muted vertical rule; informational rows align to an 82px marker column and use 25px column spacing.
- **Soft state:** Interim timing uses a sage marker with dark-green text, retaining the same measured geometry.

### FAQ
- **Structure:** Native `details` rows separated by fine rules; the summary is a 600-weight question with a gold-ink plus/minus indicator drawn from two fine lines.
- **Open state:** The vertical stroke rotates away and the summary text changes to gold-ink.

## Do's and Don'ts

### Do:
- **Do** keep major light surfaces in ivory or paper and reserve navy for the program's strongest passages.
- **Do** use gold-ink for small emphases, visible focus, serif accents, and structural markers.
- **Do** use Instrument Serif only as italic emphasis inside an otherwise Manrope hierarchy.
- **Do** preserve actual day labels, fine rules, and the ruler layout when expressing a sequential program.
- **Do** respect `prefers-reduced-motion: reduce` by removing animation and transitions.
- **Do** keep guided forms native, keyboard-visible, and explicit about progress, validation, persistence, and external handoff.
- **Do** preserve the desktop video region as reserved media space and remove it from the mobile task flow.

### Don't:
- **Don't** introduce bold color fields beyond the established navy, sage, ivory, and paper surfaces.
- **Don't** turn every container into an elevated card; use the documented flat structure first.
- **Don't** replace the day-based timeline with generic progress decoration.
- **Don't** add clinical result claims, prices, testimonials, or invented proof to the visual system.
- **Don't** turn the guided journey into a dashboard, a dense multi-question page, or a stack of elevated cards.
- **Don't** treat an unavailable checkout as a completed payment path; keep the unavailable state explicit.
