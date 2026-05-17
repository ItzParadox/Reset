# Reset

Reset is a personal health companion for people trying to lose weight without turning daily life into a spreadsheet. The product goal is to make weight loss feel calmer, clearer, and more doable: set a realistic target, check in each day, understand what is changing, and keep moving without shame or noise.

The project is currently a React web app/PWA prototype deployed on Netlify. It is still in testing, but it now proves the main product loop: onboarding, calculated calorie targets, calorie tracking, daily habit tracking, hydration, weight progress, optional medication-aware logging, and local data export.

## Product Aim

Reset is being built for people who need a practical weight-loss routine that fits into real life. It should feel supportive and simple rather than clinical, punitive, or overloaded.

The long-term goal is an app that can:

- Guide someone from their starting point to a realistic health plan.
- Turn big goals into small daily actions.
- Track weight, calories, water, movement, notes, and medication patterns in one place.
- Support people using weight-loss medication without forcing medication UI on everyone.
- Help users notice patterns across food, hydration, movement, weight, appetite, and side effects.
- Sync safely across devices through accounts and cloud storage.
- Grow into a polished mobile app experience, likely through React Native once the product model is clearer.

## Current Capabilities

- Onboarding with profile, unit, goal, activity, and optional medication details.
- BMI, BMR, estimated maintenance calories, and calorie target calculation.
- Deficit options are calculated from the user's profile and update when weight changes.
- Home dashboard with weight status, calorie progress, daily progress, BMI, weekly trend, and goal projection.
- Today checklist for movement, calories, protein, hydration, and notes.
- Calories page with live calorie budget, quick manual calorie entry, food diary, and animated food search.
- Food search test flow using Open Food Facts through a Netlify Function proxy.
- Hydration tracking with configurable daily target and water step size.
- Weight logging with metric/imperial display support.
- Movement timer based on the user's walking target.
- Optional medication tab only when medication is selected during onboarding.
- Medication logging for dose, site, appetite, nausea, side effects, and taken status.
- Local JSON export for backup.
- Local data reset for testing or starting over.
- PWA manifest and production service worker support.

## Calorie Tracking Status

Calorie tracking is now in active testing.

What exists today:

- The app calculates a daily calorie target during onboarding.
- The Calories tab shows calories left, calories logged, the target, and visual progress.
- Users can quick-add a manual food/calorie estimate.
- Users can open a dedicated food-search modal to search a free test database.
- Search results add a 100g calorie entry into the current day's diary.
- Food entries are stored in the current daily log as `foodEntries`.
- `caloriesConsumed` is derived from the diary entries.
- The Today checklist now shows calorie progress in the same style as water, for example `Calories - 520 / 2019 kcal`.
- The Home calorie card reads from the same daily calorie data and shows progress.
- If a user is on medication, the Calories page gives a small reminder that smaller meals spread across the day may sit better.

The current search API is intentionally a testing implementation. It uses Open Food Facts because it is free and good enough for validating the product flow. It is not the intended final nutrition database.

Near-term calorie tracking plans:

- Improve search quality, ranking, and result presentation.
- Add serving-size controls instead of assuming 100g for search results.
- Add common/recent foods so repeat logging is faster.
- Add edit support for logged calorie entries.
- Decide whether barcode scanning belongs in the web prototype or later mobile app.
- Improve meal grouping, such as breakfast, lunch, dinner, and snacks.
- Keep refining the calorie UI against familiar patterns from apps like MyFitnessPal while keeping Reset simpler and less noisy.
- Eventually connect calorie logs to real accounts and cloud sync.

## Tech Stack

Current prototype:

- React
- Vite
- Plain CSS
- Browser `localStorage`
- Netlify Functions for the test food-search API
- Web app manifest and service worker for PWA support
- Vitest and Testing Library for app-level regression tests

Planned direction:

- Cloud-backed user accounts and sync
- A stronger nutrition data source
- More complete backend integration
- Better insights across weight, calories, hydration, medication, and symptoms
- React Native or another mobile-first implementation once the product shape is proven

## Project Structure

```text
reset/
  netlify/
    functions/
      food-search.js          Open Food Facts proxy used for calorie search testing
  public/
    brand/                    App logos and brand assets
    icons/                    PWA and favicon assets
    manifest.webmanifest      Web app manifest
    sw.js                     Production service worker
  src/
    components/               Reusable UI components
    lib/                      Calculations, validation, storage, units, PWA helpers
    views/                    Main app screens
    App.jsx                   App state, routing, and feature orchestration
    App.test.jsx              Integration-style app tests
    main.jsx                  React entry point
    styles.css                Global styles and animation system
  index.html
  package.json
```

## Local Development

Install dependencies:

```powershell
npm install
```

Start the Vite dev server:

```powershell
npm run dev
```

The app runs on the local Vite URL shown in the terminal. In development, the service worker is disabled and existing Reset caches are cleared so changes are easier to test.

Vite alone does not run Netlify Functions. The app includes a direct Open Food Facts fallback for local testing, while the deployed Netlify site uses `/api/food-search`.

## Test And Build

Run tests:

```powershell
npm test
```

Create a production build:

```powershell
npm run build
```

Preview the production build locally:

```powershell
npm run preview
```

The compiled app is written to `dist/`.

## Deployment

Live site: https://resetlifeproject.netlify.app/

Reset is currently deployed on Netlify. The Vite app builds to `dist/`, and the calorie search test endpoint lives at:

```text
/api/food-search
```

The Netlify Function proxies Open Food Facts so the frontend has a stable app-owned endpoint for testing. This is expected to change as the nutrition and account backend become more mature.

## Data And Privacy

The current prototype saves user data in browser `localStorage`. This is useful for fast product testing, but it is not the intended final data model.

Current stored data includes:

- Profile and onboarding details
- Health plan and calorie target
- Weight logs
- Daily logs
- Food entries and calorie totals
- Water progress
- Medication logs
- Settings
- Pending sync-style mutation records for future backend work

For now, users can export their local data as JSON from Settings. This is a backup/testing tool, not the final account system.

Future versions should support:

- User accounts
- Cloud sync across devices
- More reliable data persistence
- Better privacy and account controls
- Migration from local-only logs into a real backend

## PWA Notes

In production, Reset registers `public/sw.js` and uses `public/manifest.webmanifest` so it can behave like an installable mobile web app. Service workers require HTTPS or localhost. Offline support is intended for the app shell and cached assets, while user data currently remains in local browser storage.

## Important Health Note

Reset provides estimates and tracking tools, not medical advice. Calorie targets, BMI categories, medication logs, and projections should be treated as personal planning aids. Users should speak with a qualified clinician before following aggressive calorie deficits, extreme plans, or medication-related changes.
