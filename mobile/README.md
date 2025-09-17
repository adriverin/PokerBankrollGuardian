# Poker Bankroll Guardian – Mobile

This Expo-managed React Native app delivers the offline-first bankroll tracker and simulator described in the product brief. It shares analytics and simulation logic with the existing backend, persists data locally via SQLite, and synchronises with the FastAPI services when connectivity is available.

## Getting started

```bash
cd mobile
npm install
npm run start
```

### Running on devices

- **iOS simulator**: `npm run ios`
- **Android emulator**: `npm run android`
- **Web (for rapid UI checks)**: `npm run web`

Set the API base URL and WebSocket endpoint with environment variables consumed by `app.config.ts` (e.g. `API_URL`, `WS_URL`).

## Architecture highlights

- **State management**: Zustand stores for sessions, ledger entries, policies, simulations, and settings. React Query persists server sync status across restarts.
- **Storage**: SQLite via `expo-sqlite` with a lightweight migration runner. All domain entities mirror the server schema (`cash_sessions`, `mtt_sessions`, `ledger_entries`, `policies`, `sim_runs`, `attachments`) and include dirty flags and timestamps for sync.
- **Sync**: Outbox pattern with exponential retry; manual "Sync now" is available from the settings screen. Conflict resolution follows a last-write-wins strategy while unioning tag arrays.
- **Security**: Optional biometric lock, screenshot redaction (Face ID/Touch ID, FLAG_SECURE equivalents), and secure token storage through Expo Secure Store.
- **Notifications**: Expo Notifications channels for reminders, stake alerts, and simulation completion (registration occurs during app bootstrap).
- **Simulation**: Deterministic Student-t Monte Carlo engine implemented locally for client-side quick sims, with server job placeholders ready for long-running requests.
- **Testing**: Jest with React Native Testing Library (unit tests and simulation golden tests) plus Detox configuration for end-to-end coverage.

## Scripts

- `npm run lint` – ESLint
- `npm run test` – Jest unit tests
- `npm run typecheck` – TypeScript compiler in `--noEmit` mode
- `npm run e2e` – Detox tests (requires simulators/emulators)

## CI / CD

EAS build profiles live in `eas.json` and default OTA channels are configured inside `app.config.ts`. Build flavours: development (internal client), preview (staging channel), and production (store distribution).

## Folder structure

```
App.tsx                # App bootstrap (providers + navigation)
app.config.ts          # Expo config with OTA + env support
src/
  components/          # UI primitives (cards, charts, banners, etc.)
  db/                  # SQLite wrapper, migrations, repositories
  hooks/               # Cross-cutting hooks (biometrics, timers, sync)
  navigation/          # Stack + tab navigator definitions
  screens/             # Dashboard, Sessions, Analytics, Simulate, Settings, Auth
  services/            # API client, notifications, security, simulation
  store/               # Zustand stores for domain entities
  sync/                # Outbox helpers and sync orchestrator
  theme/               # Light/dark theme tokens
  utils/               # Formatting, date helpers
```

## Privacy & data export

Users can export anonymised JSON snapshots from **Settings → Data**. The export is written to the app's document directory (`poker-bankroll-export.json`) for sharing via the system Files app.

## Roadmap hooks

- WebSocket hooks for long-running simulations are stubbed in `services/api/client.ts`.
- CSV import/export integration points exist in `services/storage`.
- Push notification scheduling logic can be extended inside `services/notifications`.

Refer to the repository root README for backend setup instructions. This mobile client assumes the FastAPI stack is available at the configured `API_URL`.
