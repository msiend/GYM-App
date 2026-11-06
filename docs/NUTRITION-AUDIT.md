# Nutrition audit · web 1.3.2

## Screenshot and meal display

The meal rows had inherited native button backgrounds/borders and intrinsic widths. The updated rows use the shared theme, full card width, separated food names/preparation states, aligned nutrient estimates and consistent touch targets. Meal groups are sorted by numeric meal slot rather than IndexedDB's random record ID order, so Breakfast precedes Lunch. Existing records are preserved.

The screenshot's energy arithmetic is correct: 100 g boiled spinach (23 kcal), 150 g boiled pigeon peas/toor (181.5 kcal), and 180 g cooked brown rice (221.4 kcal) total 425.9 kcal, displayed as 426 kcal. Food rows are rounded for display; totals are calculated before rounding.

Meal ideas show daily energy/protein totals and an explicit scope statement. They are illustrative portions, not a complete or calorie-target-optimized diet prescription. New ideas distinguish breakfast, main meals and snacks, with 2–6 editable meal times. Time edits apply to the whole meal; invalid portions cannot be saved or duplicated. Existing saved suggestions are only replaced after explicit regeneration confirmation, while intake history stays intact.

## Food composition verification

All 100 generic food records and their 500 energy/protein/carbohydrate/fat/fiber fields were compared with the published USDA Standard Reference Release 28 (2015) files, obtained again from the pinned [USDA dataset mirror](https://github.com/alyssaq/usda-sqlite/tree/1e457b599af101ce463a195867574eba16c81acb/data). Both input checksums match the values recorded in [data provenance](WEB-DATA-SOURCES.md).

The original 20 starter entries now also have NDB identifiers and pinned source URLs. Firm tofu protein was corrected from a rounded 17.3 to the source's 17.27 g per 100 g. Milk is labeled as cow's milk with 3.25% fat, salmon as farmed Atlantic salmon, and potato preparation as boiled in skin with flesh consumed. These changes prevent confusing generic references with different food types/preparations. Existing food IDs remain stable.

Raw, cooked, dried and sprouted entries remain separate. Their per-100-g values must not be interchanged: added/absorbed water changes nutrient concentration. The 12 Indian recipes are calculated from listed ingredient weights and an illustrative cooked yield, not measured restaurant/home recipes. Oil and other additions must be included when used. Paneer, soya chunks and poha retain label-entry shortcuts because products/recipes vary. Custom-food editing now retains the original label serving weight and converts its values correctly back to per 100 g.

Run the reproducible audit with:

```sh
python3 scripts/verify-usda-catalog.py /path/to/usda-sqlite/data
```

The script rejects altered input files and checks both starter and additional food catalogs. No health records or live API calls are involved in normal app operation.

## Nutrition calculations and guidance

- Mifflin–St Jeor energy calculations and activity multipliers remain estimates. If sex-specific equation inputs are absent, the energy midpoint is explicitly illustrative, with a displayed equation range and uncertainty explanation.
- Body-weight protein factors are no longer silently applied to lean body mass. Lean mass is shown separately; a selected lean-mass mode falls back to a clearly labeled body-weight reference and explains the limitation. Clinician-provided reference weights are distinguished and missing reference weights produce a clear fallback notice.
- Lean muscle building uses the same conservative illustrative surplus as muscle building. Athletic-performance and fat-loss references use 1.6 g/kg within the existing active-adult reference range; these are starting heuristics, not individualized prescriptions. Carbohydrate/fat amounts are labeled an illustrative split.
- Impossible energy/protein combinations do not produce negative carbohydrate targets. Screening still withholds personal targets for minors and reported medical/dietary risks. A fat-loss estimate is also withheld for reported adult BMI below 18.5 as a conservative screening rule, not a diagnosis.
- Protein summaries include every logged meal name, including snacks, pre/post-workout meals and user-defined meal names. Analytics average only logged days; missing days appear as missing rather than confirmed zero intake.
- Dietary filtering checks recipe ingredients as well as recipe names, recognizes common allergy synonyms and accepts comma, semicolon or newline separators. Pescatarian filtering includes eggs, dairy and fish while excluding meat. Saved meals outside changed preferences are flagged and cannot be batch-logged until reviewed. Filters cannot assess cross-contact or guarantee food safety.
- Educational guidance describes thorough cooking of sprouts/kidney beans and checking product allergen labels. Unnecessary month-by-month habit schedules were removed. Food references and educational content can be browsed without providing a profile.

## Research limits

On 6 November 2026, direct requests to NIH ODS exercise/sports nutrition guidance, NHS balanced-diet guidance and ICMR-NIN's 2024 dietary-guidelines PDF were denied by this environment's network policy (403). Those pages were not read. This release does not claim current live guideline verification, clinical certification or an independent dietitian review. The archived USDA composition comparison above is the online source verification actually completed. Current product labels and individual clinical guidance take priority over generic estimates.

The app retains citations to Mifflin et al. (1990) and the Academy/Dietitians of Canada/ACSM Nutrition and Athletic Performance position statement (2016). These are historical references; the implementation's heuristic goals and activity multipliers should not be presented as precise clinical measurements.

## Validation

Unit checks cover the screenshot's exact cooked-portion arithmetic, preparation-state differences, source metadata, equation constants/uncertainty, lean/reference-weight behavior, unsuitable-target screening, non-negative macros, all meal names, missing-day analytics, recipe ingredient exclusions and 2–6 meal schedules across dietary preferences. IndexedDB tests cover shared meal times, invalid-write preservation and backup roundtrips including optional item positions.

`npm run test:nutrition` builds the PWA and exercises the seven Nutrition views, the existing-data screenshot case, desktop and 320 px phone layouts, dark/large text, portion edits, grouped logging, custom-label editing, changed-allergy review, six-meal generation, medical screening, guest reference access and offline reload. It includes accessibility/overflow checks and screenshots in ignored `test-results/`. `npm run check` includes this suite alongside existing workout, update, installation and UI regressions.

Final validation on 6 November 2026 passed 90 unit tests across 16 files, the production build, the offline/update browser suite, 24 UI audit screens, 14 redesign checks, 10 installation checks and 12 Nutrition checks. The 100-record USDA comparison also passed. No browser errors, detected WCAG A/AA violations or horizontal overflow were reported in the audited Nutrition screens. These are automated Chromium checks supplemented by screenshot inspection, not physical-device testing or clinical certification.
