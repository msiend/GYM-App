# Web 1.2 · equipment, body-part choices and yoga

Prepared 6 November 2026. React web PWA only; paused Android files are excluded.

## User-visible changes

- **Partial / half gym:** select the free weights, stations and individual machines you have. A seated curl machine does not imply a lying curl machine; single-pulley and dual-pulley stations are separate. Benches, rated band anchors and exercise platforms remain explicit support choices. Unselected machines do not appear in generated workouts.
- **Body-part filters:** filter the current workout without editing its plan or saved sets. The library has body-part shortcuts, specific-muscle, equipment and activity filters, searches supporting muscles too, reports matching counts and provides a reset/empty state.
- **Fat loss:** a dedicated entry point explains whole-body activity and sustainable nutrition, with part-wise strengthening choices for core, arms, chest, back, thighs, hips and calves. The app explicitly rejects spot-fat-loss claims.
- **Yoga:** eight gentle educational guides cover mountain, comfortable seated breathing, cat–cow, supported child, resting, supported tree, gentle butterfly and sphinx variations. Each has instructions, limitations, breathing, target areas and a YouTube search. Sanskrit/Hindi aliases and translated general benefit explanations work offline. These authored summaries are not newly verified translations of official yoga manuals or individualized prescriptions. No headstand, shoulder-stand or forceful breathing routine is prescribed. Yoga is separate from automatic strength programming.
- **Practical exercises:** standing band row, band hip hinge, band curl and standing dumbbell shoulder press address gaps without benches or fixed band anchors. Total catalog: 132 records, retaining all earlier exercise IDs.
- **Disclaimer:** expandable guidance on Workout and Nutrition covers education, source/clinical-review limits, fat-loss claims, medical/yoga restrictions and symptoms requiring help, with an additional Hindi summary.

Also included are the earlier unpushed changes: About the exercise with offline language selection, feet/inches profile entry, the weekday/rest-day display fix and the [exercise/programming audit](EXERCISE-AUDIT.md).

## UI/UX corrections found during the audit

- Set changes give immediate feedback while persisting locally. A failed write restores the saved value and reports the failure, including a device-full message. Pain warnings remain beside the reported set.
- Repeated load/RPE instructions are consolidated into one expandable guide.
- Four workout tabs remain visible on narrow screens. Filters state that only the view changes, and can restore every scheduled exercise.
- Light-theme navigation/danger text and dark-theme footer/exercise numbers received contrast corrections. Accessible names include visible labels, including localized tutorials.
- Large-text Nutrition and Settings use columns and wrapped controls that fit narrow screens. Dialog keyboard focus skips hidden/disabled controls and collapsed content.
- A profile without a weekly plan has a create-plan action. Browsers without Storage Manager APIs receive an accurate fallback and backup guidance.
- Workout history and set rows are sorted by training date/set order. Performance charts follow chronological dates. Previous and historical training loads honor kg/lbs preferences while retaining kg in storage, including fractional plates.
- Chart text/series colors adapt to both themes. SVG tick contrast is checked separately where axe cannot infer its background. The volume chart explicitly counts external kg × reps and excludes timed holds/bands, avoiding a mixture of kg-seconds and repetitions.

## Internet-source status

On 6 November, direct requests to NHS strength guidance, CDC adult activity guidance, NCCIH yoga safety information and India's AYUSH yoga site were retried through the configured proxy. All returned a policy denial (403), so none of those live pages was read. The app does **not** claim all information was verified online, medically certified or checked against the latest research.

Required official-source domains were added to the existing environment-settings draft, preserving earlier domains. Saving the draft did not change the running environment. Applying/publishing the appropriate network settings and successfully retrying the requests is still required for the requested research. No alternate mirror, disabled TLS verification or network bypass was used.

References awaiting access:

- NHS: `https://www.nhs.uk/live-well/exercise/strength-exercises/`
- CDC: `https://www.cdc.gov/physical-activity-basics/guidelines/adults.html`
- NCCIH: `https://www.nccih.nih.gov/health/yoga-what-you-need-to-know`
- AYUSH: `https://yoga.ayush.gov.in/`

Published USDA/Free Exercise DB provenance and previous access limits remain in [data sources](WEB-DATA-SOURCES.md). Content authored or adapted in the app is labeled accordingly.

## Validation and practical limits

Final validation on 6 November 2026: `npm run check` passed all 63 unit tests (13 files), the production build, the offline/update browser suite and 24 UI/accessibility screens. No browser errors, detected WCAG A/AA violations or horizontal/dialog overflow were reported in those screens. SVG chart tick contrast against the configured opaque surfaces was at least 5.52:1. Automated checks that cannot determine a result remain recorded for manual review; this is not a universal accessibility certification.

Run `npm run check` for unit checks, the production build, the offline/update browser suite and UI/accessibility checks, sequentially. `npm run test:ux` runs the latter independently after a build. Detailed local results and screenshots are in ignored `test-results/`.

Coverage includes a 6,000-profile matrix across age (16–80), gender choices, all five experience levels/goals, equipment and recovery, varying durations/days; a further 720-case equipment/time matrix; health/minor screening; partial-machine eligibility; older backups; equipment/height/language backup roundtrips; and conservative progression.

Browser scenarios exercise onboarding, partial-gym fat-loss use, keyboard navigation, actual set/pain feedback, simulated storage-full writes, unsupported storage APIs, record reload, JSON export, large Hindi text, themes, body-part/Yoga search, empty filters, educational access for restricted profiles and offline routes. Automated WCAG A/AA and overflow checks cover representative 320, 360, 390 and 1440 px screens.

These are automated Chromium checks, supplemented by screenshot inspection. They do not establish suitability for every person/condition, universal accessibility compliance, real iOS/Safari/Firefox compatibility, or physical Android device testing. No analytics, cloud database, account system or exercise API was introduced.
