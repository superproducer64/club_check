# Club Check — Setup & Boot Instructions

## Why you need a custom dev client, not Expo Go

This app uses `expo-task-manager` + background location, which **does not work in Expo Go**.
You need a custom dev client build via EAS. This only has to be done once (or whenever you add
a new native module) — after that, `expo start` reconnects to the same dev client instantly.

## First-time setup (Windows)

```powershell
# 1. Unzip this project, cd into it
cd club-check

# 2. Install dependencies
npm install

# 3. Install EAS CLI if you don't have it
npm install -g eas-cli

# 4. Log into your Expo account
eas login

# 5. Configure the project (creates/links an EAS project ID)
eas build:configure

# 6. Build a development client for your test device
eas build --profile development --platform ios
# or: eas build --profile development --platform android
```

That last command builds in the cloud and gives you a QR code / install link.
Install it on your physical phone — **use a physical device, not a simulator**,
since GPS/motion/background-location behavior can't be meaningfully tested
on a simulator.

## Running after the dev client is installed

```powershell
npx expo start --dev-client
```

Scan the QR code with your phone's camera (it'll open in the Club Check dev
client, not the regular Expo Go app).

## What will actually work when it boots

- App boots, SQLite tables get created (`lib/db/init.ts` runs automatically)
- Onboarding → Home → Start Round → enter a course name manually
- GPS permission prompts (foreground, then background — iOS requires these sequentially, which `backgroundLocationManager.ts` handles)
- Round screen shows hole counter, GPS status, round timer
- If the state machine detects a green departure, you'll get a notification + (if app is foregrounded) the reminder modal with "All Clubs Accounted For"

## What's stubbed / not yet built

These are flagged in-code with comments, but calling them out here too:

- **Onboarding** is a single placeholder screen, not the full Playing Style /
  Round Length / Permissions walkthrough from the PRD
- **Settings** only has two toggles wired up — Reminder Delay, Reminder
  Distance, GPS Accuracy picker, Voice Selection, Metric/Imperial, Reset
  Learning are all listed in the PRD but not built
- **Course selection** is manual text entry — no course database or
  geocoding, matching MVP scope, but also no autocomplete
- **Hole auto-advance** doesn't exist — "Next Hole" is a manual tap
  (see earlier discussion: this was a deliberate MVP simplification, not an oversight)
- **Playing style** is hardcoded to `'riding'` in `select-course.tsx` — needs
  wiring to whatever the onboarding flow eventually collects

## Testing the actual detection logic before you're on a real course

The state machine (`lib/detection/stateMachine.ts`) and green resolver
(`lib/detection/greenResolver.ts`) are pure functions/classes with no React
Native dependencies — they can be unit tested with fake GPS coordinate
sequences without needing a device at all. Worth writing a test harness that
feeds in a simulated round (array of lat/lng/speed samples) before your first
real on-course test, so you're not debugging the state machine AND the GPS
hardware at the same time.

## Known risk areas to watch on first real-world test

1. GPS accuracy filter (`sample.accuracyM > 25` in `roundController.ts`) may
   be too strict or too loose — tune based on what your phone actually reports
   on a course vs. in your backyard
2. Battery drain — NFR target is <10% per 18 holes; `pausesUpdatesAutomatically: false`
   trades battery for reliability, worth measuring on your actual device
3. Background permission prompt copy — Apple reviews "Always" location
   requests closely; the current explanation text in `app.json` and the
   permission-denied screen in `active.tsx` should be reviewed before
   App Store submission
