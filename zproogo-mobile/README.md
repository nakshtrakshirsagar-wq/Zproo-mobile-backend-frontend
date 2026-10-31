# zproogo-mobile

Zproogo Android app (React Native 0.76, TypeScript, New Architecture, Hermes). Guest-first: browse everything, log in (OTP or Google — **no passwords**) only at *Proceed to Book*, My Trips, Wallet or Account.

**Owners:** FE-1 (app shell, auth, home, bus + booking for women, checkout, trips, safety, releases) · FE-2 (hotel, flight + international, train, cancellation & refunds, account).

---

## 1. Run it (debug)

Prerequisites: Node 20+, JDK 17, Android Studio (SDK 35, an emulator or a phone with USB debugging).

```bash
# 1) start the backend first (see zproogo-api/README.md): npm run dev  -> http://localhost:8080
# 2) the app
npm install
npm run android        # builds, installs and starts Metro
```

The debug app talks to `http://10.0.2.2:8080/v1` (the emulator's alias for your laptop). On a real phone change `DEV_API` in `src/config.ts` to your laptop's LAN IP and add that IP to `android/app/src/debug/res/xml/network_security_config.xml`.

With the backend in local mode: OTP is always **123456**, suppliers are mocked, and payments show a *Test payment* sheet (simulate success / failure).

Checks: `npm run typecheck` · `npm test` · `npm run bundle:android` (verifies every import resolves).

---

## 2. Configure before a real build (`src/config.ts` + gradle properties)

| What | Where | How |
|---|---|---|
| API URL | `src/config.ts` → `API_URL` | `https://api.zproogo.com/v1` (already set for release) |
| Google Sign-In | `GOOGLE_WEB_CLIENT_ID` | Google Cloud → Credentials → **Web** client id (same value as server `GOOGLE_WEB_CLIENT_ID`). Also create an **Android** OAuth client with package `com.zproogo.app` + your signing SHA-1. |
| Push | `android/app/google-services.json` | Firebase console → add Android app `com.zproogo.app` → download. Without it the app runs, push is just off. |
| Maps | `MAPS_API_KEY` gradle property | Google Maps SDK for Android key, restricted to package + SHA-256 |
| Play Integrity | `CLOUD_PROJECT_NUMBER` | Play Console → App integrity → link a Google Cloud project; put its **project number** here |
| SSL pins | `PIN_PRIMARY`, `PIN_BACKUP` | see section 4 |
| Release signing | `~/.gradle/gradle.properties` | `ZPROOGO_UPLOAD_STORE_FILE`, `ZPROOGO_UPLOAD_STORE_PASSWORD`, `ZPROOGO_UPLOAD_KEY_ALIAS`, `ZPROOGO_UPLOAD_KEY_PASSWORD` (never commit) |

Create the upload key once:
```bash
keytool -genkeypair -v -keystore zproogo-upload.keystore -alias zproogo-upload -keyalg RSA -keysize 4096 -validity 10000
```
Enrol in **Play App Signing**; register the *app signing* SHA-256 from Play Console in Firebase, Google Sign-In, Maps and Play Integrity.

Release build: `npm run release:aab` → `android/app/build/outputs/bundle/release/app-release.aab` (upload to Play internal testing).

---

## 3. Folder structure

```
src/
  App.tsx                 boot: encrypted storage → pinning → integrity → session → navigation → push
  config.ts               non-secret settings only
  api/client.ts           axios: install id, tokens, Play Integrity header, refresh rotation, error mapping
  api/endpoints.ts        typed calls for every backend endpoint
  security/               secureStore (Keystore + encrypted MMKV), integrity, pinning, deviceRisk, useSecureScreen
  store/                  zustand: auth, booking draft (hold + passengers), prefs
  theme/                  tokens (Zproogo red + Rose/Ice/Navy), dark mode
  components/             ui.tsx (Button, Card, Field, Chip, Tabs, Sheet, PriceRow, HoldTimer, Stepper, Timeline…),
                          widgets.tsx (SearchCard, pickers, calendar, QR + scanner line, scenes), Icon.tsx
  navigation/             RootNavigator (stack + 5 tabs), route types
  features/
    onboarding/  auth/  home/                         FE-1
    bus/ (+ women mode)  checkout/  trips/            FE-1
    cab/ (search, car options, rider, live ride)     FE-1
    hotel/  flight/  train/  cancel/  account/        FE-2
android/app/src/main/java/com/zproogo/app/security/  ZproogoSecurityModule.kt (Play Integrity, FLAG_SECURE, cert)
```

Screen numbers in comments match the HTML prototype; whiteboard changes are implemented and marked in comments (e.g. `whiteboard 13`).

---

## 4. Security built in (Android)

- **No secrets in the APK.** Only public ids (Razorpay key_id, Google client id). Supplier keys, Razorpay secret and JWT keys stay on the server.
- **Server decides everything:** prices, payment status, women seat rules, refunds. A modified app cannot change them.
- **Play Integrity** token on login, holds, bookings, payments, cancellations, SOS — bound to a hash of the exact request; the server rejects repackaged APKs, emulators and rooted/hooked devices (`INTEGRITY_MODE=enforce`).
- **Tokens in Android Keystore** (react-native-keychain), cache in **encrypted MMKV**; 15-min access tokens bound to the install id; rotating refresh tokens.
- **SSL public-key pinning** (2 pins) + system CAs only + no cleartext in release. Get the pins:
  ```bash
  openssl s_client -connect api.zproogo.com:443 -servername api.zproogo.com </dev/null 2>/dev/null \
   | openssl x509 -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64
  ```
  Do the same for your **backup** key (generate a second key pair now and keep it offline). Pinning stays off while the placeholders are in `config.ts`.
- **FLAG_SECURE** (no screenshots/recording) on login/OTP, checkout, travellers/passport, wallet and tickets.
- **R8 + shrinkResources + Hermes bytecode**, `console.*` stripped, Android logs stripped, `debuggable false`.
- `allowBackup=false` + data-extraction rules; no READ_SMS (SMS Retriever for OTP); verified App Links only.
- Root / hook / debugger signals (jail-monkey) warn the user; final decision is on the server.
- Before every release: `npm run bundle:android`, build AAB, scan it with **MobSF**, fix all High findings.

---

## 5. Booking flow (how screens connect)

`Search → List → Select (seat/room/fare/class) → POST /holds (guest ok) → login gate if needed → Details → Checkout (POST /holds/:id/quote) → POST /bookings → POST /payments/order → Razorpay → PaymentStatus (polls server) → Ticket`

Cancellation: `Booking → CancelSelect → CancelConfirm (live quote) → POST /cancellations → RefundTracker`.

Cab: `CabSearch (City / Airport / Outstation / Rental, now or scheduled) → CabOptions (map + car types, POST /cab/estimate) → Book = POST /holds (fare lock, guest ok) → login gate → CabRider (rider, passengers, bags, pay online or pay driver) → Checkout → PaymentStatus → CabRide (polls GET /cab/rides/:id: finding driver → driver + OTP → arrived → on trip → completed → rate)`.
Cancel a ride from CabRide → CancelConfirm (fee by ride stage) → back to CabRide. SOS / share trip use the same Safety kit as buses.


## Bus data (sample data in the app)

`src/config.ts` -> `BUS_DATA`:

- `'mock'` (default) - the app shows built-in sample buses, seat maps and boarding / dropping points (`src/mock/busMock.ts`). No backend needed.
- `'fallback'` - calls the real API first and uses the sample data if the server cannot be reached or returns no buses.
- `'api'` - real API only.

Bus flow: Search -> `BusResults` -> `SeatLayout` (uses `components/SeatMap`) -> `BoardingDropping` -> `BusPassengers`.
Checkout / payment still need the backend.


## Typography (bus booking screens)

| Element | Font | Size | Used for |
| --- | --- | --- | --- |
| Header | Montserrat Bold 700 | 24 | `type('header', 24)` screen titles |
| Sub-header | Montserrat Medium 500 | 18-19 | `type('subHeader')` section titles, seat badge, prices |
| Body | Inter Regular 400 | 14-16 | `type('body')`, typed text in inputs `type('input')` |
| Plain text / labels | Inter Regular 400 | 12-13 | `type('label')` addresses, errors, hints |
| List title / buttons | Inter Medium 500 | 14 (buttons 16) | `type('listTitle')`, `type('button')` |

Fonts: Inter SemiBold is not used in the bus flow any more.

## First-launch onboarding + login (`src/components/onboarding`)
The first screen after installing the app is **one** component: image slider on top (65%) + "Log in or create a new account" below (35%).
It replaces the old 3 text/image onboarding pages (those slides were removed from `features/onboarding/Onboarding.tsx`).

- Shown while `prefs.onboarded` is `false` (persisted in MMKV), so it appears only once per install. `RootNavigator` -> `features/onboarding/OnboardingScreen.tsx`.
- **Skip** -> guest mode -> Location screen (first time only) -> Home.
- **Phone OTP / Google** use the real API (`Api.sendOtp / verifyOtp / google / mergeGuest`), tokens go to the Keystore (`saveTokens`), user into `useAuth`.
  Success -> Welcome -> Location (first time only) -> Home. Google users without a mobile number go through `LinkMobile` first.
- Country picker (+91 default), per-country number validation, 6-digit OTP boxes with auto-submit, SMS auto-fill, resend timer, "too many attempts" lock.
- Before release: set `Config.GOOGLE_WEB_CLIENT_ID` and replace `TERMS_URL` / `PRIVACY_URL` in `src/components/onboarding/validation.ts`.
- Images: `src/assets/onboarding/`. Test: `__tests__/onboardingValidation.test.ts`.
