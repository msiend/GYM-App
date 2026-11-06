# FORM — Build your everyday strong

Mobile-first, offline-first personal fitness and nutrition PWA. React, TypeScript, Vite, Tailwind, React Router, Dexie, Zustand, Recharts, React Hook Form, Zod and Workbox. No backend, login, analytics, remote fonts or health-data uploads.

**Web 1.3.2:** a consistent light-first interface, refreshed FORM logo, four-step setup and an explicit preview of every selected training day. Workout contains My workout, Exercise library, Yoga and History; the library and yoga are available without a profile, including offline after caching. A shared device-install flow is available from Home, the header and Settings. Nutrition meal rows and ordering have been corrected, with an audit of all 100 food references. See the [nutrition audit](docs/NUTRITION-AUDIT.md) and [redesign notes](docs/WEB-RELEASE-1.3.md).

## Run

Validated with Node 24.19.0 / npm 11.9.0.

```sh
npm ci
npm run dev
npm test
npm run test:e2e
npm run test:ux
npm run test:redesign
# All validation, including production browser checks:
npm run check
npm run build
npm run preview -- --port 4173
```

PWA registration is enabled in production builds. Use HTTPS or localhost. Serve `dist` with navigation fallback to `index.html`; serve `/sw.js` with `Cache-Control: no-cache`. The initial online visit must finish precaching before offline reload works. Do not aggressively cache HTML or service-worker files on the host. Static assets are bundled locally. The 192/512 PNG icons and manifest support installation in Chromium; iOS uses browser-specific Home Screen installation.

## Install on a device

Open your deployed **HTTPS** website, then tap **Install app** in the header or **Settings → Install on your device**. Android Chrome/Edge display the native installer when available. On iPhone/iPad, open the site in Safari and choose **Share → Add to Home Screen**; keep **Open as Web App** enabled if shown. Desktop Chrome/Edge also support browser installation, and supported Mac Safari versions offer **File → Add to Dock**.

Let the initial offline download finish while online, then launch FORM from the Home Screen/app launcher. Settings shows when offline access is ready. The install prompt is captured at startup, so visiting Settings later does not lose it. Dismissed prompts are not reused, and an accepted prompt is not reported as installed until the browser confirms installation. Browsers already running the installed app hide install controls.

Plain HTTP local-IP URLs cannot install a PWA on a phone. Use an HTTPS deployment or an HTTPS development server with a certificate trusted by that phone. Computer localhost is trusted only on that computer. Keep using the same website/browser for your records; export a backup before changing origins. Installation does not upload records or grant notification permission.

The hosting server must serve `manifest.webmanifest` and PNG icons as files, serve `/sw.js` as JavaScript with `Cache-Control: no-cache`, and route app navigation to `index.html`. Manifest identity, scope and start URL currently target the domain root. For hosting in a subdirectory, update Vite's base, router base, manifest and worker scope together.

Run `npm run test:install` to check the production manifest/icons/service worker with Chromium's installability diagnostics, installation event handling, simulated iOS/Android/standalone guidance and real insecure-origin handling. Browser-native installation UI and physical-device installation are not automated by this suite. Validation on 6 November 2026 passed the production build, 74 unit tests, the offline/update suite, 24 UI audit screens, 14 redesign checks and 10 installation checks. Chromium reported no installability errors in a fresh normal browser profile.

## Implemented

- Four-step optional profile setup with shared training/equipment controls, health screening, optional food preferences and a weekly preview. Setup is opened explicitly; guests can explore workout and yoga guides immediately. Plan edits preserve history and active sessions.
- Pure training engine honoring all 2–6 selected days, with suitable strength/easy-activity allocation, equipment and named-movement exclusions, full-body, upper/lower and push/pull/legs templates. Beginners selecting six days receive three strength and three easy days rather than six heavy sessions. Warm-up, cool-down and 132 offline exercise/yoga guides with source links.
- Transactional workout creation, immediate set persistence, resume after reload, weight units, editable reps/weights/rest/RPE, technique and pain feedback, set addition/deletion, exercise replacement, previous performance and conservative progression suggestions. No automatic weight increases.
- Workout history, measurements and notes, body-weight and training-volume charts, cardio logging and recorded exercise-load trends.
- 100 offline generic food references plus 12 ingredient-calculated Indian meal ideas with preparation states, dietary/allergen filtering, gram-adjusted food logging, macros/fiber, hydration logging, seven-day editable meal suggestions, protein/lean-mass estimates, nutrition analytics and educational content.
- Adult calorie estimates with conservative goal adjustments. Relevant health screening and minors block unrestricted nutrition targets; medical exercise screening blocks unrestricted plans.
- Dark/light themes, install guidance, storage persistence requests, best-effort foreground workout reminders and rest notifications, JSON backup/export and validated transactional restore, confirmed deletion, reviewable legal/privacy information.
- Prompt-based service-worker updates using a real `registration.update()` request. Updated assets install into a waiting worker. Activation requires confirmation, is blocked during active workouts and reloads without clearing IndexedDB. Browsers may perform their own lifecycle update checks; no automatic skipWaiting or forced activation is used.

## Architecture

- `src/domain`: framework-independent types, program/progression/nutrition calculations.
- `src/data`: IndexedDB schemas (version 1 training, version 2 nutrition, version 3 custom foods), repository/backup operations, exercise and food catalogs.
- Screen modules and reusable dialog/form/chart components provide UI. IndexedDB is the source of truth; live queries refresh screens. Zustand carries transient toast state only.
- Static resources use Cache Storage / Workbox; health records use IndexedDB. No personal records are placed in caches or sent through network APIs. User-selected backups contain sensitive information and are not encrypted.

## Validation

`npm test` exercises frequency caps, equipment exclusions, medical gates, nutrition calculations, conservative progression, food exclusions, IndexedDB backup roundtrip, and invalid-import preservation. `npm run build` performs a strict TypeScript check and production PWA build.

`npm run test:e2e` uses system Chromium when available, or a Playwright-managed browser (`npx playwright install chromium`). Set `CHROMIUM_PATH` to override. It starts an isolated local server on port 4175 and writes screenshots to ignored `test-results/`.

A Chromium smoke flow was run against production: complete onboarding, start a workout, save a set, reload and recover that set, log a 150 g food portion, activate precaching, disable network and reload a workout route, check mobile horizontal overflow, and request a real no-update check. Desktop/mobile screenshots were inspected. A controlled local service-worker update was also tested through detection, confirmation, activation, reload and IndexedDB preservation. This does not establish Android/iOS device compatibility or notification delivery on physical devices.

## Remaining release work

This is a functional first implementation, not completion of every item in the supplied specification.

- Hindi currently translates navigation and greetings; full exercise/form/nutrition localization remains.
- Meal plans are editable **starter suggestions**, not calorie/macro-optimized complete diets. Budget is collected but is not used as verified cost data. Twelve Indian recipe estimates and user-defined food labels are supported. Verified paneer/soya brand compositions must be entered from the actual label; supplement catalogs, meal-version history, more regional recipes, comprehensive intake analytics and CSV exports remain release work.
- The engine is template-based, not an advanced periodized coaching system. Restrictions are comma-separated matching terms, not a clinical contraindication model. Cardio estimates, individualized endurance/mobility programs, previous-activity onboarding, progress photos and a completed/rest-day calendar remain.
- Workout reminders, optional water reminders and rest notifications are supported while open. Water reminders have configurable intervals, a daily window and optional browser notifications, and stop once logged water reaches the personal target. Weekly scheduled reminders and reliable closed-app alarms are not implemented; ordinary browser APIs cannot guarantee such background scheduling.
- Optional protein-reference fields exist in the profile, but users should obtain professional advice before choosing lean/reference-weight methods. Body-fat estimates are not clinical measurements.
- Generic USDA food values are rounded, preparation-specific references and have not been independently audited against the current database. Exercise guidance is based on common NHS/ACE technique principles and needs specialist review. The web expansion was researched from published USDA SR28 files and the licensed Free Exercise DB; see [data sources](docs/WEB-DATA-SOURCES.md). Direct USDA/NHS/PubMed pages were blocked, and the community exercise descriptions are not clinically validated. Do not treat starter content as a professionally validated library.
- Legal policies are templates. Before publishing, supply deployment-specific identity/contact details, obtain legal review for applicable Indian data protection/consumer law, review clinical screening and content with qualified professionals, test accessibility and actual target devices, and test an update between real hosted releases.
- Browser storage can be evicted. Regular JSON backups are essential. Import is capped at 10 MB. There is no encryption, sync, account recovery, remote backup or cross-device restore without a user-managed file.

Serve the production build from your hosting provider. A repository push does not by itself confirm that a hosted deployment has finished.

## Web 1.1 update

The web app now defaults to a simpler light interface. Home focuses on today's workout, food, water and the training week. Workout → Change plan shows an explained preview; saving preserves workout history and any active session. The engine now handles recovery/frequency caps, clearer weekly focus, five-day upper/lower plus push/pull/legs, and an optional six-day body-part layout for suitable experienced users. Existing saved plans are not silently overwritten: use Change plan to regenerate intentionally.

Nutrition → Food database provides ingredients, Indian meal ideas and My foods filters. Add your own food converts nutrition-panel servings to per-100 g values and stores the food in IndexedDB. Soya chunks, paneer and poha have brand-label entry shortcuts. Backup format v3 includes custom foods and remains able to import v2 backups. See [the source/provenance notes](docs/WEB-DATA-SOURCES.md) for NDB identifiers, recipe calculation limits and exercise licensing.

## Muscle targets and tutorials

The set-tracking cards keep muscle detail blocks out of the space above the set table. “About the exercise” contains the benefit explanation, primary muscle group, supporting body parts and guidance. Session summaries show the main muscles covered by that workout. The workout cards, exercise library and instruction dialog each provide a visible **Watch on YouTube** action that opens an encoded technique search in a new tab without leaving the active workout. No videos or external requests are needed to read the offline guidance; the tutorial link explicitly requires internet.

## Web 1.1.1 · local-IP save fix and readability

Profile saving previously called `crypto.randomUUID()`, which is unavailable on plain HTTP local-IP origins such as a development server opened from a phone. This produced a misleading generic storage error. Record IDs now fall back to an RFC 4122 v4 identifier generated using `crypto.getRandomValues()`, which is available in these contexts. Profile/plan/starting-weight saves remain atomic. Error messages now distinguish a genuinely full storage quota, blocked site storage, database version conflicts and application errors; no repair flow clears existing records. Regression checks create a profile and all subsequent records with `randomUUID` deliberately unavailable.

Basic local data entry can work on HTTP LAN origins. PWA installation, service-worker caching and browser notifications still require HTTPS or a trustworthy localhost origin; the UUID fix does not change browser security requirements. A phone's local-IP URL and a computer's localhost URL have separate browser storage. Keep the same origin for your records, and export backups before changing hosts.

Home and Nutrition share water controls: 150/250/500 ml quick adds, a custom amount, undo, a personal daily target and optional water prompts. Configure interval, start/end time, message and optional browser notifications under Water preferences or Settings → Water goal & reminders. Prompts run while the app is open; no background/closed-app delivery guarantee is made. Reaching a logged target suppresses further prompts. Fluid needs are individual, and the tracker does not override medical fluid limits.

On phone-width screens, reading text and inputs use a 16 px baseline with larger touch controls, clearer labels and single-column exercise cards. Settings → Appearance & language → Text size offers an extra-large 18 px mode. Browser zoom is not disabled. Preferences are stored locally and included in JSON backups.

## Expanded offline libraries

The web library now includes 120 exercises, 100 food references and 12 ingredient-calculated Indian meal ideas. New foods include mango, guava, papaya, pomegranate, nuts/seeds, sweet potato, cooked vegetables, quinoa, barley, buckwheat, low-fat dairy and additional protein sources. Preparation state, allergens and USDA SR28 source IDs are retained. New exercise records include equipment, difficulty, instructions, muscle information and the YouTube search action. Existing catalog IDs and user records are preserved. Community exercise content and historical generic food references remain subject to the limitations in the source notes.

## About the exercise · language selection

“How to do it” is now **About the exercise**. The dialog includes “Why this exercise?”, muscle details and practice tips; the extra Main muscles/Also works blocks have been removed from workout and library cards.

The dialog offers English, Hindi, Marathi, Gujarati, Bengali, Tamil, Telugu, Kannada, Malayalam and Punjabi. Benefit explanations, muscle labels, practice tips and dialog labels are bundled locally and work offline. The selected exercise-explanation language is saved separately from the app UI language and is included in JSON backups. Tutorial links inside the dialog add the selected language to the YouTube search. Detailed exercise-specific instructions remain in English and are explicitly labeled. These educational translations have not received independent specialist language/clinical review.

## Height units and workout weekdays

Profile entry and editing support feet/inches (the default) or centimetres. Feet and inches have separate fields to avoid confusing 5 ft 8 in with 5.8 ft. Height remains stored in centimetres for nutrition calculations; switching the input unit alone preserves its exact value. The chosen unit is included in backups, and older profiles remain compatible.

Workout weekday selection now shows only that day's scheduled session. Recovery days have their own view and an explicit button to view the next scheduled workout; they no longer substitute the first workout in the plan. The weekday picker is hidden while a saved workout is active, with a message to finish it before browsing another day. Full-body plans explain why several training days can have the same focus. Existing plans and workout history are preserved.

## Exercise and programming audit

The [exercise audit](docs/EXERCISE-AUDIT.md) records corrections across the 120-exercise catalog, explicit bench/anchor/platform requirements, conservative difficulty and prescription rules, compatible replacements and stricter progression checks. Older saved templates must be reviewed using Change plan before starting another session; existing active workouts and history remain saved. The audit documents source-access limitations and does not claim clinical certification or a live review of the latest literature.
