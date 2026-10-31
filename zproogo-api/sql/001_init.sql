-- ZPROO GO auth schema. Needs PostgreSQL 13+ (gen_random_uuid is built in).

-- One row per person. Created automatically the first time someone verifies an OTP
-- (that is "sign up") or signs in with Google. Logging in again finds the same row.
create table users (
  id                  uuid primary key default gen_random_uuid(),
  name                text,
  mobile              text unique,                 -- E.164, e.g. +919876543210
  mobile_verified_at  timestamptz,
  email               text,
  google_sub          text unique,                 -- Google account id
  photo_url           text,
  gender              char(1) check (gender in ('M','F','O')),
  points              integer not null default 0,
  women_mode_default  boolean not null default false,
  irctc_username      text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);
create unique index users_email_lower_uq on users (lower(email)) where email is not null;

-- Pending one-time passwords. Only a keyed hash of the code is stored, never the code itself.
create table otp_codes (
  mobile             text primary key,
  code_hash          text not null,
  expires_at         timestamptz not null,
  attempts           integer not null default 0,   -- wrong tries so far
  locked_until       timestamptz,                  -- set after too many wrong tries
  last_sent_at       timestamptz not null default now(),
  send_window_start  timestamptz not null default now(),
  send_count         integer not null default 1    -- sends in the current hour
);

-- One row per logged-in phone. Refresh tokens are stored hashed and rotate on every use.
create table sessions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references users(id) on delete cascade,
  install_id         text not null,                -- X-Install-Id of the app install
  refresh_hash       text not null,
  prev_refresh_hash  text,                         -- used to detect a stolen / replayed refresh token
  ip                 text,
  user_agent         text,
  created_at         timestamptz not null default now(),
  last_used_at       timestamptz not null default now(),
  expires_at         timestamptz not null,
  revoked_at         timestamptz
);
create index sessions_user_idx on sessions (user_id);

-- Phones that registered for push notifications (guests too, so user_id may be empty).
create table devices (
  install_id   text primary key,
  user_id      uuid references users(id) on delete set null,
  fcm_token    text,
  app_version  text,
  platform     text,
  updated_at   timestamptz not null default now()
);
