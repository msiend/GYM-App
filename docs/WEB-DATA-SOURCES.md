# Web catalog and programming changes · 1.1.0

Android work is paused. These changes concern the React web PWA only.

## Food composition researched online

Additional foods were extracted from the published USDA Standard Reference Release 28 (2015) files in [alyssaq/usda-sqlite](https://github.com/alyssaq/usda-sqlite), commit `1e457b599af101ce463a195867574eba16c81acb`. Its README documents the USDA origin and that nutrient amounts are per 100 g. The app retains original USDA NDB identifiers, descriptions, preparation states and source links for each new entry. This is a published historical reference, not the newest FoodData Central branded-product data.

Retrieved files and SHA-256:

- `FOOD_DES.txt`: `bb2047218cdad1d830da69e760386409fde3b7afabceae604c5479f280d4fa2e`
- `NUT_DATA.txt`: `506c9ee39a276ac8f53565d270597e430944ec3363adb53a91cc6ee8c061fac5`

Examples: moong dry NDB 16080, moong cooked 16081, raw mung sprouts 11043, cooked sprouts 11044, urad raw/cooked 16083/16084, pigeon peas raw/cooked 16101/16102, masoor 16144, besan 16157, whole-wheat flour 20080, plain commercial roti 28306, peanut butter unsalted 16398. Whole-bean and commercial references are labeled as such, not falsely claimed to be laboratory measurements of a user's homemade meal. Millet is a generic reference, not a verified value for every regional millet variety.

The seven Indian meal entries are explicitly **recipe estimates**, calculated from the stated ingredient quantities and illustrative yield. They include dal-rice-palak, rajma chawal, chana-roti-curd, cooked moong sprouts chaat, moong-rice, peanut-butter oats, and besan cheela. Added oil is included where listed. Real cooked yield and recipes vary. Raw sprouts are not used automatically in meal suggestions.

Soya chunks, paneer and poha have **label-entry shortcuts**, rather than invented universal nutrition values. Users supply their actual brand/recipe's calories/macros and the label's serving weight. Values normalize to per 100 g, persist in IndexedDB and export in backup format v3. The previous v2 backup format remains importable. The app makes no normal external requests to display these foods.

## Exercise library researched online

41 additional descriptions were selected from [Free Exercise DB](https://github.com/yuhonas/free-exercise-db), whose README traces its data to `wrkout/exercises.json` and publishes it under the Unlicense. The license text is retained in `docs/free-exercise-db-UNLICENSE.txt`. Individual source URLs are saved per exercise; instructions are retained from the downloaded JSON. Retrieved combined JSON SHA-256: `5bb747e3fc658f095a60dcbf6d53c96627acdcc6ffb6fffde86f7e26995d40bf`.

The library now has 63 exercises. Primary/secondary muscle groups, equipment and difficulty come from the source with app category normalization. Pull-ups and parallel-bar dips require gym equipment in the generator despite being described as bodyweight movements in the source. New community descriptions are identified as reference material, not clinically validated instruction. No externally hosted photos or videos are required for normal use.

## Programming corrections

- Beginners remain capped at up to three resistance days with lower set volume. Three-to-six-month profiles are capped at four; limited recovery uses at most three.
- The generator maximizes spacing of short-frequency full-body schedules, warns about unavoidable adjacent sessions, and chooses exercises by movement pattern **and** muscle focus.
- Five-day automatic plans use upper/lower plus push/pull/legs, giving lower body more appropriate weekly representation than simply repeating push/pull while training legs once.
- A preferred six-day body-part layout is available for experienced users with six days, with overlap/recovery guidance. The user's screenshot is a reference for coverage and day layout, not a mandate for a specific personal prescription.
- Session length controls how many sets/exercises fit. Equipment and movement exclusions are applied. Missing movement options produce an explicit limitation instead of claiming full coverage.
- Timed holds are distinguished from repetition-based core exercises; crunches are not mislabeled as timed holds.
- Plan rationale and warnings are visible. Regeneration requires the user's explicit save and does not overwrite workout history or active-session sets.

USDA's own download page, NHS Strength and Flex, and PubMed's ACSM progression paper were also requested directly, but this environment's proxy denied them (403). Those live pages were **not read** in this session. Required host additions were saved to the environment draft for optional follow-up research. The accessible dataset provenance above is the research actually completed. Exercise and clinical programming review remains appropriate before presenting these templates as individualized professional coaching.
