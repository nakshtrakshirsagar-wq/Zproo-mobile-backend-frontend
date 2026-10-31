/** Row of the `users` table (snake_case = column names). */
export type UserRow = {
  id: string;
  name: string | null;
  mobile: string | null;
  mobile_verified_at: Date | null;
  email: string | null;
  google_sub: string | null;
  photo_url: string | null;
  gender: 'M' | 'F' | 'O' | null;
  points: number;
  women_mode_default: boolean;
  irctc_username: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export type OtpRow = {
  mobile: string;
  code_hash: string;
  expires_at: Date;
  attempts: number;
  locked_until: Date | null;
  last_sent_at: Date;
  send_window_start: Date;
  send_count: number;
};

export type SessionRow = {
  id: string;
  user_id: string;
  install_id: string;
  refresh_hash: string;
  prev_refresh_hash: string | null;
  expires_at: Date;
  revoked_at: Date | null;
};

/** What the app's `User` type (src/store/auth.ts) looks like. */
export type UserDto = {
  id: string; name: string | null; mobile: string | null; email: string | null; photoUrl: string | null;
  gender: string | null; points: number; womenModeDefault: boolean; irctcUsername: string | null;
};

export type TokenPair = { accessToken: string; refreshToken: string; expiresInSec: number };
