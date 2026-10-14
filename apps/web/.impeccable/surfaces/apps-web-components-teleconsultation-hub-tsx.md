---
version: 1
slug: "apps-web-components-teleconsultation-hub-tsx"
primary_target: "apps/web/components/teleconsultation-hub.tsx"
related_targets: ["apps/web/components/google-meet-connection.tsx","apps/web/components/google-meet-transcripts.tsx","apps/web/app/doctor-teleconsultation.css"]
---

# Teleconsulta — superfície médica preparada (14/10/2026)

## Build path

- **Path:** code
- **Mode:** Operate
- **Scope:** `apps/web/components/teleconsultation-hub.tsx`, `apps/web/components/google-meet-connection.tsx`, `apps/web/components/google-meet-transcripts.tsx`, and `apps/web/app/doctor-teleconsultation.css`.
- **Boundary:** preserve the existing medical workspace; this is a narrow surface brief, not a new global design world.

## Visual direction

Use the approved white/navy medical workspace with Figtree and the single persistent bottom navigation. Keep the consultation context, patient, time, status, and the next action in one readable flow. Place actions adjacent to the consultation or its preparation state; do not introduce a second global navigation or a decorative dashboard treatment.

Use the existing light-blue orientation surfaces, navy primary controls, quiet borders, and minimum 44px interaction targets. Keep panels flat and task-led. Preserve visible keyboard focus and the existing focus-into-form behavior. Respect `prefers-reduced-motion`; any reveal must be optional and short, never required for comprehension.

## States and content boundaries

- Treat `unconfiguredGoogle`/technical unavailability as an explicit unavailable state with a manual Meet fallback; never imply that OAuth or a subscription is active.
- Keep connection, patient permission, imported original text, and clinician review as separate visible states and actions.
- The original transcript is read-only and source-oriented. Numbered speakers do not infer identity.
- Review can mark or reject a transcript, but never publishes to the patient or fills the clinical record automatically.
- `BrowserTranscriptPanel` is the prepared free/manual desktop option: microphone or tab + microphone in Chrome/Edge 135+, after consent, saving original and review separately. Stop all resources on finish and keep retry frozen; the real voice provider was not exercised.
- `NativeMeet` remains prepared but disabled behind a flag.
- Do not add automatic capture, AI interpretation, synthesis, or automatic publication.

## Verification boundary

The desktop review is acceptable at the prepared scope (`ship at prepared scope`). Mobile CSS at 320px was validated without overflow. Below 400px, the dock uses visual labels **Vídeo** and **Chat** while retaining the complete `aria-label`. Connected/imported states and the real voice provider remain unexercised; retain the responsive rules and keep those states explicitly pending live technical configuration and synthetic validation.
