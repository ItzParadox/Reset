# Reset

Reset is a personal health companion for people trying to lose weight without turning their life into a spreadsheet. The goal is to make progress feel calmer, clearer, and more doable: set a realistic target, check in each day, understand what is changing, and keep moving without shame or noise.

The project is currently a React web app/PWA prototype, but the long-term aim is to grow Reset into a proper mobile app, likely with React Native, backed by cloud sync and user accounts. The current version proves the product experience: onboarding, weight tracking, hydration, daily habits, calorie planning, and optional medication-aware logging.

## Product Aim

Reset is being built to help users create a sustainable weight-loss routine that fits into real life. It should feel supportive, simple, and practical rather than clinical or intimidating.

The end goal is an app that can:

- Guide someone from their starting point to a realistic health plan.
- Turn big goals into small daily actions.
- Track progress without making the user feel judged.
- Support people using weight-loss medication with useful logging around appetite, side effects, dose, and injection routines.
- Help users notice patterns across food, hydration, movement, weight, and medication.
- Sync safely across devices through accounts and cloud storage.
- Become a polished mobile app experience through React Native.

## What It Does

- Onboards the user with profile, unit, goal, activity, and medication details.
- Calculates BMI, BMR, estimated maintenance calories, and calorie targets using moderate, aggressive, or extreme deficit options.
- Tracks daily habit completion for movement, calories, protein, hydration, and notes.
- Includes a movement timer based on the user's daily walking target.
- Logs water intake with configurable step and daily hydration targets.
- Tracks weight history, current weight, starting weight, goal distance, and longer-term trends.
- Shows food and meal-structure guidance based on the user's plan and profile.
- Adds a medication tab when a supported medication is selected during onboarding.
- Exports all local data as JSON for backup.
- Clears local data from the current browser when the user wants a fresh start.

## Tech Stack

Current prototype:

- React
- Vite
- Plain CSS
- Browser `localStorage`
- Web app manifest and service worker for PWA support
- Static deployment support through the generated `dist/` build

Planned direction:

- React Native mobile app
- User accounts
- Cloud-backed storage and sync
- More complete backend integration
- Improved long-term progress insights

## Project Structure

```text
reset/
  public/
    brand/                  App logos and brand assets
    icons/                  PWA and favicon assets
    manifest.webmanifest    Web app manifest
    sw.js                   Production service worker
  src/
    components/             Reusable UI components
    lib/                    Calculations, validation, storage, and PWA helpers
    views/                  Main app screens
    App.jsx                 App state, routing, and feature orchestration
    main.jsx                React entry point
    styles.css              Global styles
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

## Build

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

For deployment, run `npm run build` and publish the generated `dist/` folder. The current clean upload does not include deployment-specific config files, so hosting settings should be configured in the platform dashboard.

## Data And Privacy

The current prototype saves data in browser `localStorage` while the product experience is being built and tested. This is not the intended final data model.

The future version should support proper accounts, cloud storage, and sync across devices. A Supabase helper file already exists as an early placeholder for backend work, but it is not wired into the main app yet.

Current stored data includes:

- Profile and onboarding details
- Health plan and calorie target
- Weight logs
- Daily logs
- Medication logs
- Settings
- Pending sync-style mutation records for future backend work

For now, users can export their data as JSON from settings. This is a backup tool for the prototype stage, not the final account system.

## PWA Notes

In production, Reset registers `public/sw.js` and uses `public/manifest.webmanifest` so it can behave like an installable mobile app. Service workers require HTTPS or localhost. Offline support is intended for the app shell and cached assets, while user data remains in local browser storage.

## Important Health Note

Reset provides estimates and tracking tools, not medical advice. Calorie targets, BMI categories, and medication logs should be treated as personal planning aids. Users should speak with a qualified clinician before following aggressive plans, extreme deficits, or medication-related changes.
