# Web 1.3 · simpler setup and complete weekly schedules

The web app now uses one shared type scale, spacing system, card and button style across Home, Workout, Nutrition, Progress and Settings. Light remains the default; dark mode and larger text remain available. The FORM logo, install icons and favicon have been refreshed without introducing remote fonts or image requests.

## Configuration and scheduling

The old generator treated selected days as availability, silently capping a beginner's plan at three scheduled visits. Every selected day now appears in the generated week. Beginner six-day schedules contain three strength sessions and three clearly labeled easy walking/mobility sessions, including at 30 and 45 minutes. Three-to-six-month profiles allow four strength sessions plus easy days; experienced profiles with normal recovery can receive six strength sessions. A full-body preference or limited recovery uses at most three strength sessions and fills other selected days with easy activity. Estimates include ten minutes for warm-up/cool-down and stay within the chosen session limit.

This honors visit frequency while preserving conservative resistance-training volume. Easy days are shown explicitly before saving. Unselected days remain recovery days. Medical screening and under-18 restrictions still withhold unrestricted adult plans. Equipment and movement exclusions apply to both session types; if exclusions leave no suitable activity, the preview explains the missing coverage.

New-user setup has four steps: About you; Your training; Equipment & health; Review your week. Setup and later plan edits reuse the same controls and preview. Optional food preferences and advanced training options are expandable. Day selection shows the selected count and allows 2–6 days. Each setup step starts at the top and supports keyboard form submission.

Existing profiles, active sessions, history and older backups remain compatible. Saved templates are not silently replaced: use **Workout → Change plan → Save plan** to review the new schedule. Old templates cannot start a new session until reviewed; an existing active session can continue.

## Workout navigation

Workout has four compact internal tabs: My workout, Exercise library, Yoga and History. There is no separate library tab in the five-item mobile bottom navigation. Guests can open the library or yoga directly from Home or Workout, with no profile dialog or personal information required. Tab and day choices support direct URLs; internal tabs support arrow, Home and End keys.

Long explanations, source information and safety notes are expandable. About the exercise and YouTube actions remain on each exercise. Easy sessions show minutes for cardio, an easy effort default and no load field. Timed entries persist as seconds internally and roundtrip through JSON backups; history presents the appropriate unit. Set completion commits the displayed values together and is shown as completed only after IndexedDB confirms the write; finishing is disabled while that completion is saving. A blocked-storage regression covers immediate reload after completion. Strength tracking and kg/lbs conversion remain intact.

## Validation

Run `npm run check` for unit checks, strict TypeScript/production PWA build, existing offline/update browser regressions, mobile/desktop UI auditing and the new redesign flows. `npm run test:redesign` runs the new browser flows independently after a build. Screenshots and detailed local reports are written to ignored `test-results/`.

The unit suite includes a 6,000-profile matrix, a 720-case equipment/time matrix and focused regressions for all 2–6 day selections, six-day 30/45-minute plans, recovery, exclusions, medical gates, legacy plans and timed-session backup restore. Browser flows cover first-time setup, public/offline library access, beginner and experienced plans, editable/rest days, session resume, storage failures, nutrition logging, backup restore, keyboard focus and controlled service-worker updates. UI checks cover 320–1440 px, both themes, larger text and Hindi navigation, with WCAG A/AA scans and explicit chart-text contrast checks.

Final validation on 6 November 2026: `npm run check` passed 74 unit tests across 14 files, the production build, the offline/update suite, 24 UI audit screens and 14 redesign checks (12 additional audited screens plus two backup roundtrips). No browser errors, detected WCAG A/AA violations or horizontal/dialog overflow were reported. Chart tick text contrast was at least 5.54:1. The delayed-storage completion regression passed at both session lengths.

These are automated Chromium checks plus screenshot inspection, not physical-device testing or universal accessibility certification. Exercise-source and professional-review limitations documented in [the previous release](WEB-RELEASE-1.2.md) still apply. Android/Flutter work remains paused.
