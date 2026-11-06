# Exercise and workout audit · 3 November 2026

Scope: the React web PWA, its 120 exercise records (22 introductory summaries and 98 imported/adapted community records), replacement flow, automatic workout generator and progression recommendations. Android remains paused.

This records the 3 November audit. The [6 November web release](WEB-RELEASE-1.2.md) adds four practical exercises and eight yoga guides, bringing the catalog to 132, and expands persona, equipment and UI/accessibility checks. Its source-access limits remain explicit.

## Outcome and limits

All 120 records were inspected for movement/name consistency, instruction completeness, muscle/category labels, difficulty, setup requirements, breathing and conservative range-of-motion cues. Seventy imported instruction records were rewritten or corrected; 22 difficulty labels, two primary-muscle labels, six categories, three duration-tracking fields, 17 secondary-muscle lists and two exercise names changed. Introductory records also received support requirements, timing and unilateral-work corrections. These counts describe edits, not clinical validation.

This is an editorial/content and software audit. No trainer or clinician assessed an individual user, and the guidance has not received independent clinical or multilingual expert review. No exercise is suitable for every person. Community provenance and educational references do not establish clinical reliability or guarantee safety.

Direct requests to NHS, CDC, AAOS, ACSM and Mayo Clinic were blocked by this environment's network policy (HTTP proxy 403). Those live pages were **not read or verified**. The audit uses the repository's existing source records, basic movement/anatomy definitions and conservative general programming principles; it does not claim a new literature search or verification against the latest position stand. No alternate mirror was used to bypass the restriction.

References for follow-up review, not newly retrieved evidence:

- [NHS strength exercises](https://www.nhs.uk/live-well/exercise/strength-exercises/).
- [CDC adult physical activity guidelines](https://www.cdc.gov/physical-activity-basics/guidelines/adults.html).
- [AAOS hip conditioning](https://orthoinfo.aaos.org/en/recovery/hip-conditioning-program/).
- ACSM, _Progression Models in Resistance Training for Healthy Adults_ (2009), [DOI: 10.1249/MSS.0b013e3181915670](https://doi.org/10.1249/MSS.0b013e3181915670). A historical reference, not a claim to the latest guidance.
- [Mayo Clinic strength training](https://www.mayoclinic.org/healthy-lifestyle/fitness/in-depth/strength-training/art-20046670).
- Original community records retain individual Free Exercise DB URLs and the existing Unlicense provenance. Adapted text is labeled as adapted; the source URL is not represented as a clinician's approval of the edits.

## Concrete corrections

| Finding                                                                                                                   | Change                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Band hip adduction described an outward movement                                                                          | Corrected to bringing the leg inward toward the midline, with the working ankle nearest the anchor.                                                                                                               |
| Squats and lunges asserted that knees passing toes always indicate incorrect technique                                    | Removed the blanket claim. Instructions emphasize controlled depth, supported heels and comfortable knee alignment.                                                                                               |
| Cable crunches instructed deliberate lumbar hyperextension; several pulls forced lower-back arching                       | Replaced with controlled, comfortable trunk positioning.                                                                                                                                                          |
| Romanian deadlifts combined a forced platform/depth cue with breath-holding instructions                                  | Replaced with a standing hip hinge, soft knees, individually controlled depth and continuous breathing for these general instructions.                                                                            |
| Pull-ups, dips, loaded barbell squats/bench presses and elevated push-ups were labeled beginner                           | Changed difficulty so complete beginners do not receive these automatically. Bench/squat instructions now address rack safeties, competent help and learning the setup.                                           |
| A seated cable “lateral raise” described a bent-over rear-shoulder fly                                                    | Renamed to seated bent-over cable reverse fly and excluded from automatic selection. The stable ID is unchanged.                                                                                                  |
| Rear-foot-elevated split squat was mislabeled as a generic split squat                                                    | Made the elevation explicit and corrected difficulty/support requirements.                                                                                                                                        |
| Seated calf raise instructed raising the toes                                                                             | Corrected to raising the heel while the ball of the foot stays supported.                                                                                                                                         |
| Dumbbell floor press was primarily labeled triceps                                                                        | Changed to chest, with triceps/shoulders as supporting groups.                                                                                                                                                    |
| Some band fly/rotation exercises were labeled compound                                                                    | Normalized isolation categories; they no longer receive heavy compound-style strength prescriptions.                                                                                                              |
| Generic bodyweight/dumbbell/band access implied a bench, anchor or platform                                               | Added explicit support metadata and profile/plan checkboxes. Non-gym plans require confirmation of those supports.                                                                                                |
| Band good mornings, band skull crushers, leg-press calf presses and the complex seated cable fly could be automatic picks | Kept as reference records, with individual setup guidance, and excluded from automatic plans/replacements.                                                                                                        |
| Stretch/cardio/carry durations could be presented as repetitions or all timed actions as “holds”                          | Corrected duration metadata and duration labels; unilateral targets now say each side.                                                                                                                            |
| Replacement list allowed unrelated muscle groups or cardio, inheriting the old prescription                               | Restricted replacements to compatible movement/muscle focus and available equipment; resets conservative exercise-specific targets.                                                                               |
| Estimated sessions ignored both sides and could force two exercises beyond the time budget                                | Budget includes both sides, rest, transitions, five minutes warm-up and five minutes cool-down. Short sessions reduce set volume and disclose limited coverage. Longer warm-ups/rest may require fewer exercises. |
| Progression could pass with missing prescribed sets or skip an exercise exposure that had no logs                         | Requires all prescribed sets, matching targets/volume and load on the latest two exposures on separate dates; missing/incomplete exposures block a recommendation.                                                |
| Technique feedback was pre-approved; pain during the current session could be ignored by historical advice                | New sets start with technique unchecked. Current pain takes priority. Limited recovery suppresses progression; timed holds and bands/bodyweight do not receive kilogram-based advice.                             |
| Adult generator could serve minors or overlook a restriction explicitly mentioning pain/injury                            | Withholds the unrestricted adult plan for under-18 profiles, health flags and recognized pain/injury terms. This keyword safeguard is not a diagnosis or a substitute for screening.                              |

## Existing device data

No exercise IDs, IndexedDB stores, set records or workout history are deleted by this audit. Corrected instructions appear immediately for existing IDs. Program version is now 3. Older weekly templates stay stored and require **Change plan → review preview → Save plan** before starting a new session; an already active session remains available to finish and save. This avoids silently replacing customized future plans or active-session records. New settings and plan time estimates are optional fields, so existing backups remain importable.

## Verification

- Catalog checks cover all 120 stable IDs, complete steps, valid categories and corrected anatomy/movement examples.
- The programming matrix exercises 720 combinations of equipment, duration, beginner/experienced status, general/strength goal and 2–6 available days. It verifies time budgets, equipment eligibility and strength rest intervals. Passing these checks establishes software constraints, not physiological outcomes.
- Progression regressions include missing sets, skipped exposures, volume changes, same-day sessions, changed repetition targets, pain, limited recovery and zero load.
- Browser checks cover older-plan review, feedback defaults, weekday/recovery views, saved sets, offline exercise details, language selection and update/data preservation.
