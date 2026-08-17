# Pomelo

Pomelo is an Expo SDK 57 application backed by Supabase. Development uses native development builds because the baseline includes iOS and Android widgets.

## Architecture

Pomelo uses a feature-based architecture with lightweight layers inspired by Clean Architecture and Ports and Adapters. Product code belongs under `src/features/<feature>/`; a feature introduces `domain`, `application`, `infrastructure`, or `presentation` only when that separation has a concrete purpose.

The complete dependency rules and placement guide live in [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Clean checkout setup

Prerequisites: Node.js 22+, Docker Desktop, Xcode 26.4+ for iOS, and Android Studio with its bundled JDK plus the Android 36 SDK for Android.

```bash
npm ci
npm run db:start
npx supabase status -o env
cp .env.example .env.local
```

Copy `API_URL` into `EXPO_PUBLIC_SUPABASE_URL` and `PUBLISHABLE_KEY` (or the legacy `ANON_KEY`) into `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Only those public values belong in the client environment. Never expose `SECRET_KEY`, `SERVICE_ROLE_KEY`, database passwords, or access tokens through an `EXPO_PUBLIC_` variable.

The printed API URL uses `127.0.0.1`, which works from the iOS simulator. Android Emulator must use `10.0.2.2` as the hostname. A physical device must use the development machine's LAN address and be able to reach the Supabase ports through the local firewall.

Rebuild the deterministic local database and verify it:

```bash
npm run smoke:local
```

The command validates client configuration, reapplies all migrations and seed data, runs the RLS contract tests, regenerates database types, creates a real temporary Auth session, reads its authorized Profile through PostgREST, verifies anonymous and cross-User reads fail, and removes the temporary Users.

## Native development builds

Generate and install a local development build:

```bash
npm run ios
npm run android
```

After the first native build, start Metro for the installed development client with:

```bash
npm run dev
```

For local Premium purchases, serve the Supabase Functions with the same environment as the app:

```bash
npx supabase functions serve --env-file .env.local
```

The client syncs the purchase automatically after RevenueCat confirms it. Set `POMELO_DEV_TOOLS_ENABLED=true` in `.env.local` to show the Local / Develop tools in Settings. The `Advance one day` action creates the next Pair Moment and selects its format without changing the device clock; it is a development-only QA bypass and does not require Premium. Hosted environments must set the server-only `REVENUECAT_API_KEY` secret and deploy `revenuecat-sync`; the RevenueCat webhook remains responsible for later renewals, cancellations, and expirations.

Cloud development artifacts use the versioned EAS profiles:

```bash
npx eas-cli build --profile development-simulator --platform ios
npx eas-cli build --profile development --platform android
```

Native dependency or app configuration changes require a new development build. The generated `ios/` and `android/` folders are intentionally ignored; Expo Continuous Native Generation recreates them from `app.json` and the versioned config plugin.

## Account and Profile

The app supports email sign-up, sign-in, session restoration, Profile completion, and logout. Auth persists the session in native AsyncStorage. Account UI reaches Supabase through feature gateways and repositories; Profile reads and updates remain protected by owner-only RLS.

Local email sign-up creates a session immediately. Hosted Supabase projects can require email confirmation; after sign-up the User confirms the received link and returns to the explicit sign-in path.

Startup configuration, connectivity, and session errors are recoverable and emit category/code diagnostics only. Credentials, Profile fields, tokens, and backend error payloads are never logged.

Social authentication remains disabled by default while its external provisioning is pending. Keep `EXPO_PUBLIC_APPLE_AUTH_ENABLED` and `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED` set to `false` until the corresponding provider passes end-to-end verification. Google additionally requires a valid `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` before its button is shown.

### Sign in with Apple

Before enabling Apple authentication:

1. Register the final `app.pomelo.mobile` App ID with Sign in with Apple in Apple Developer.
2. Register the native App ID as an accepted Client ID in Supabase Auth.
3. Verify sign-up, login, cancellation, and Profile recovery on a physical iPhone.
4. Set `EXPO_PUBLIC_APPLE_AUTH_ENABLED=true` and rebuild the native app.

### Sign in with Google on Android

Android uses Credential Manager through `react-native-nitro-google-signin`. Before enabling it:

1. Create Web and Android OAuth clients in one Google Cloud project.
2. Configure the Android client with package `app.pomelo.mobile` and every development or release signing SHA-1.
3. Put the Web Client ID in `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
4. Configure the Google provider in Supabase with its Web Client ID and secret, keeping nonce verification enabled.
5. Verify sign-up, login, cancellation, and Profile recovery on Android.
6. Set `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED=true` and rebuild the native app.

Never place an OAuth Client Secret, Apple `.p8`, service-role key, or other private credential in an `EXPO_PUBLIC_*` variable.

## Locale and appearance

The app initially follows the device locale (`es` or `en`, falling back to Spanish) and system appearance. Locale and `system`/`light`/`dark` overrides are persisted independently on the device. All current UI copy comes from complete ES/EN catalogs, and components consume semantic light/dark tokens.

## Widget smoke test

iOS uses Expo Widgets. Android uses a dedicated `AppWidgetProvider` generated by `plugins/with-pomelo-android-widget.js`; this avoids relying on Expo Widgets' incomplete Android runtime path in SDK 57. Both surfaces show non-private status copy and open `pomelo://widget`.

1. Install the development build on each simulator or device.
2. Add `Pomelo Moment` from the system widget gallery.
3. Tap it and verify Pomelo opens through the `/widget` Expo Router route.
4. Verify the deep link directly when diagnosing:

```bash
xcrun simctl openurl booted pomelo://widget
adb shell am start -a android.intent.action.VIEW -d pomelo://widget app.pomelo.mobile
```

## Verification

```bash
npm run typecheck
npm test
npm run lint
npx expo-doctor
```

When the schema changes, run `npm run db:reset`, `npm run db:test`, and `npm run db:types`, then commit both the migration and regenerated `database.types.ts`.
