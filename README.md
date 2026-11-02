# FORM — Build your everyday strong

Mobile-first, offline-first personal fitness and nutrition PWA. React, TypeScript, Vite, Tailwind, React Router, Dexie, Zustand, Recharts, React Hook Form, Zod and Workbox. No backend, login, analytics, remote fonts or health-data uploads.

## Run

Validated with Node 24.19.0 / npm 11.9.0.

```sh
npm ci
npm run dev
npm test
npm run test:e2e
npm run build
npm run preview -- --port 4173
```

PWA registration is enabled in production builds. Use HTTPS or localhost. Serve `dist` with navigation fallback to `index.html`; serve `/sw.js` with `Cache-Control: no-cache`. The initial online visit must finish precaching before offline reload works. Do not aggressively cache HTML or service-worker files on the host. Static assets are bundled locally. The 192/512 PNG icons and manifest support installation in Chromium; iOS uses browser-specific Home Screen installation.

## Implemented

- Eight-step profile wizard including fitness goals, availability, equipment, dietary exclusions and health screening. Profile edits regenerate the training plan after confirmation while preserving history.
- Pure training engine with beginner frequency/volume caps, equipment and named-movement exclusions, full-body, upper/lower and push/pull/legs templates. Warm-up, cool-down and 22 offline exercise guides.
- Transactional workout creation, immediate set persistence, resume after reload, weight units, editable reps/weights/rest/RPE, technique and pain feedback, set addition/deletion, exercise replacement, previous performance and conservative progression suggestions. No automatic weight increases.
- Workout history, measurements and notes, body-weight and training-volume charts, cardio logging and recorded exercise-load trends.
- 20 offline generic food references with preparation states, dietary/allergen filtering, gram-adjusted food logging, macros/fiber, hydration logging, seven-day editable meal suggestions, protein/lean-mass estimates, nutrition analytics and educational content.
- Adult calorie estimates with conservative goal adjustments. Relevant health screening and minors block unrestricted nutrition targets; medical exercise screening blocks unrestricted plans.
- Dark/light themes, install guidance, storage persistence requests, best-effort foreground workout reminders and rest notifications, JSON backup/export and validated transactional restore, confirmed deletion, reviewable legal/privacy information.
- Prompt-based service-worker updates using a real `registration.update()` request. Updated assets install into a waiting worker. Activation requires confirmation, is blocked during active workouts and reloads without clearing IndexedDB. Browsers may perform their own lifecycle update checks; no automatic skipWaiting or forced activation is used.

## Architecture

- `src/domain`: framework-independent types, program/progression/nutrition calculations.
- `src/data`: IndexedDB schemas (version 1 training, version 2 nutrition), repository/backup operations, exercise and food catalogs.
- Screen modules and reusable dialog/form/chart components provide UI. IndexedDB is the source of truth; live queries refresh screens. Zustand carries transient toast state only.
- Static resources use Cache Storage / Workbox; health records use IndexedDB. No personal records are placed in caches or sent through network APIs. User-selected backups contain sensitive information and are not encrypted.

## Validation

`npm test` exercises frequency caps, equipment exclusions, medical gates, nutrition calculations, conservative progression, food exclusions, IndexedDB backup roundtrip, and invalid-import preservation. `npm run build` performs a strict TypeScript check and production PWA build.

`npm run test:e2e` uses system Chromium when available, or a Playwright-managed browser (`npx playwright install chromium`). Set `CHROMIUM_PATH` to override. It starts an isolated local server on port 4175 and writes screenshots to ignored `test-results/`.

A Chromium smoke flow was run against production: complete onboarding, start a workout, save a set, reload and recover that set, log a 150 g food portion, activate precaching, disable network and reload a workout route, check mobile horizontal overflow, and request a real no-update check. Desktop/mobile screenshots were inspected. A controlled local service-worker update was also tested through detection, confirmation, activation, reload and IndexedDB preservation. This does not establish Android/iOS device compatibility or notification delivery on physical devices.

## Remaining release work

This is a functional first implementation, not completion of every item in the supplied specification.

- Hindi currently translates navigation and greetings; full exercise/form/nutrition localization remains.
- Meal plans are editable **starter suggestions**, not calorie/macro-optimized complete diets. Budget is collected but is not used as verified cost data. Regional Indian recipes, paneer/roti-specific verified composition, custom foods and supplements, meal-level add/remove/restore/version history, comprehensive intake analytics and CSV exports need further implementation.
- The engine is template-based, not an advanced periodized coaching system. Restrictions are comma-separated matching terms, not a clinical contraindication model. Cardio estimates, individualized endurance/mobility programs, previous-activity onboarding, progress photos and a completed/rest-day calendar remain.
- Workout reminder configuration and rest notifications are supported while open. Hydration/weekly scheduled reminders and reliable closed-app alarms are not implemented. Ordinary browser APIs cannot guarantee such background scheduling.
- Optional protein-reference fields exist in the profile, but users should obtain professional advice before choosing lean/reference-weight methods. Body-fat estimates are not clinical measurements.
- Generic USDA food values are rounded, preparation-specific references and have not been independently audited against the current database. Exercise guidance is based on common NHS/ACE technique principles and needs specialist review. No external source research was completed in this network-restricted session. Do not treat starter content as a professionally validated library.
- Legal policies are templates. Before publishing, supply deployment-specific identity/contact details, obtain legal review for applicable Indian data protection/consumer law, review clinical screening and content with qualified professionals, test accessibility and actual target devices, and test an update between real hosted releases.
- Browser storage can be evicted. Regular JSON backups are essential. Import is capped at 10 MB. There is no encryption, sync, account recovery, remote backup or cross-device restore without a user-managed file.

The application has not been deployed. Environment draft saving and publication are separate from app deployment.
