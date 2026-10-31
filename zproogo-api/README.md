# zproogo-api

Login / sign-up backend for the ZPROO GO app. Node.js + Express + PostgreSQL, written in TypeScript (`src/*.ts`).

The app has **no passwords**: a person logs in with a **mobile number + OTP** or with **Google**.
"Sign up" is automatic: the first time a number (or Google account) is verified, a row is created in `users`; the next time the same row is found.

## What is included

| Endpoint | What it does |
|---|---|
| `POST /v1/auth/otp/send` | creates and sends a 6-digit OTP (5 min valid, 30 s resend wait, 5 sends/hour) |
| `POST /v1/auth/otp/verify` | checks the OTP, creates the user if new, returns tokens + `user` (5 wrong tries = 15 min lock) |
| `POST /v1/auth/google` | verifies a Google ID token, creates/finds the user, returns tokens + `needsMobile` |
| `POST /v1/auth/refresh` | rotates the refresh token (a replayed old token revokes the session) |
| `POST /v1/auth/logout`, `POST /v1/auth/merge-guest` | end the session / guest-merge placeholder |
| `GET /v1/me`, `PATCH /v1/me`, `DELETE /v1/me`, `POST /v1/me/irctc` | profile (name, email, gender, women mode), delete account |
| `POST /v1/devices` | saves the push token of a phone |
| `GET /v1/app-config` | minimum app version |
| `GET /v1/offers`, `GET /v1/recent-searches` | return `[]` for now (so the home screen does not error) |
| `GET /health` | server + database check |

Not included yet: buses, flights, hotels, trains, cab, bookings, payments, travellers, emergency contacts. The app still uses its built-in sample bus data (`BUS_DATA: 'mock'`).

## Tables (`sql/001_init.sql`)

`users` (the login/sign-up table) · `otp_codes` · `sessions` (refresh tokens, hashed) · `devices`

## Run it (Windows)

**1. PostgreSQL** - either install PostgreSQL 13+ from postgresql.org (remember the password you set for user `postgres`), or run `docker compose up -d` in this folder (then user/password are both `postgres`).

**2. Create the database** (skip if you used docker compose):
```powershell
psql -U postgres -c "CREATE DATABASE zproogo;"
```

**3. Install and configure**
```powershell
cd zproogo-api
npm install
copy .env.example .env
```
Open `.env` and set `DATABASE_URL` (user, password, port of your PostgreSQL). Leave `OTP_MODE=dev` for now.

**4. Create the tables and start**
```powershell
npm run migrate
npm run dev
```
You should see `zproogo-api listening on http://localhost:8080` and `Connected to PostgreSQL.`

Useful scripts: `npm run typecheck` (check types) · `npm test` · `npm run build` (compile to `dist/`) · `npm start` (run the compiled build).

**5. Test without the app** (PowerShell)
```powershell
$h = @{ "X-Install-Id" = "test-install-0001" }
Invoke-RestMethod -Method Post -Uri http://localhost:8080/v1/auth/otp/send -Headers $h -ContentType "application/json" -Body '{"mobile":"+919876543210"}'
$r = Invoke-RestMethod -Method Post -Uri http://localhost:8080/v1/auth/otp/verify -Headers $h -ContentType "application/json" -Body '{"mobile":"+919876543210","otp":"123456"}'
$r.user
Invoke-RestMethod -Uri http://localhost:8080/v1/me -Headers @{ "X-Install-Id"="test-install-0001"; Authorization="Bearer $($r.accessToken)" }
```
See the saved user:
```powershell
psql -U postgres -d zproogo -c "select id, mobile, email, created_at from users;"
```

**6. Run the app** (backend must be running)
```powershell
cd ..\zproogo-mobile
npm install
npm run android
```
Emulator: the app already points to `http://10.0.2.2:8080/v1` (`src/config.ts`). In dev mode the OTP is always **123456**.

Real phone on the same Wi-Fi: either run `adb reverse tcp:8080 tcp:8080` and set `DEV_API` to `http://localhost:8080/v1`, or set `DEV_API` to `http://<your-laptop-IP>:8080/v1`, add that IP to `android/app/src/debug/res/xml/network_security_config.xml`, and allow port 8080 in Windows Firewall.

## Before going live

- Build and run: `npm run build`, `npm run migrate:prod`, `npm start` (needs `NODE_ENV=production`).
- `OTP_MODE=sms`, real `JWT_ACCESS_SECRET` / `OTP_PEPPER` (the server refuses to start with the dev values).
- SMS: Twilio is wired in (`TWILIO_*` in `.env`, written but not tested against a real account). For India you will likely want a DLT-registered provider (MSG91, etc.): add it in `src/sms.js`.
- Google: set `GOOGLE_WEB_CLIENT_ID` here and in the app's `src/config.ts`.
- Play Integrity: the app sends `X-Integrity-Token` on login; this server does not verify it yet.
- Serve over HTTPS (reverse proxy) and set `TRUST_PROXY=1`.
