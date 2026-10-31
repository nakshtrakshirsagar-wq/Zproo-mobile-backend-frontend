import crypto from 'crypto';
import config from './config';
import { tx } from './db';
import { ApiError } from './errors';
import { safeEq } from './tokens';
import { sendSms } from './sms';
import type { OtpRow } from './types';

const OTP_EXPIRES_SEC = 5 * 60;
const RESEND_SEC = 30;            // same as RESEND_SECONDS in the app
const MAX_ATTEMPTS = 5;           // wrong tries before the 15-minute lock
const LOCK_SEC = 15 * 60;
const MAX_SENDS_PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;

const secsUntil = (date: Date): number => Math.max(0, Math.ceil((date.getTime() - Date.now()) / 1000));
const tooMany = (sec: number): ApiError =>
  new ApiError(429, 'TOO_MANY_ATTEMPTS', 'Too many attempts. Please try again later.', { retryAfterSec: sec });

const makeCode = (): string => (config.otpMode === 'dev' ? '123456' : String(crypto.randomInt(0, 1000000)).padStart(6, '0'));
const hashCode = (mobile: string, code: string): string =>
  crypto.createHmac('sha256', config.otpPepper).update(`${mobile}:${code}`).digest('hex');

/** POST /auth/otp/send */
export async function requestOtp(mobile: string): Promise<{ expiresInSec: number; resendInSec: number }> {
  return tx(async (c) => {
    const now = Date.now();
    const { rows } = await c.query<OtpRow>('select * from otp_codes where mobile = $1 for update', [mobile]);
    const row = rows[0];

    let windowStart = new Date(now);
    let sendCount = 0;
    if (row) {
      if (row.locked_until && row.locked_until.getTime() > now) throw tooMany(secsUntil(row.locked_until));
      const cooldown = secsUntil(new Date(row.last_sent_at.getTime() + RESEND_SEC * 1000));
      if (cooldown > 0) {
        throw new ApiError(429, 'OTP_COOLDOWN', 'Please wait before asking for another code.', { retryAfterSec: cooldown });
      }
      if (now - row.send_window_start.getTime() < HOUR_MS) {
        windowStart = row.send_window_start;
        sendCount = row.send_count;
      }
      if (sendCount >= MAX_SENDS_PER_HOUR) throw tooMany(secsUntil(new Date(windowStart.getTime() + HOUR_MS)));
    }

    const code = makeCode();
    await c.query(
      `insert into otp_codes (mobile, code_hash, expires_at, attempts, locked_until, last_sent_at, send_window_start, send_count)
       values ($1, $2, $3, 0, null, $4, $5, $6)
       on conflict (mobile) do update set
         code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0, locked_until = null,
         last_sent_at = excluded.last_sent_at, send_window_start = excluded.send_window_start, send_count = excluded.send_count`,
      [mobile, hashCode(mobile, code), new Date(now + OTP_EXPIRES_SEC * 1000), new Date(now), windowStart, sendCount + 1],
    );
    // If the SMS fails the whole transaction rolls back, so the user is not put on cooldown for nothing.
    await sendSms(mobile, `${code} is your ZPROO GO login code. It is valid for 5 minutes. Do not share it with anyone.`);
    return { expiresInSec: OTP_EXPIRES_SEC, resendInSec: RESEND_SEC };
  });
}

type CheckResult =
  | { status: 'ok' }
  | { status: 'expired' }
  | { status: 'locked'; retryAfterSec: number }
  | { status: 'invalid'; attemptsLeft: number };

/** Resolves when the code is correct (and consumes it); otherwise throws OTP_INVALID / OTP_EXPIRED / TOO_MANY_ATTEMPTS. */
export async function checkOtp(mobile: string, code: string): Promise<void> {
  // The wrong-attempt counter must be saved even though we then throw, so decide inside the transaction and throw after it commits.
  const result = await tx<CheckResult>(async (c) => {
    const now = Date.now();
    const { rows } = await c.query<OtpRow>('select * from otp_codes where mobile = $1 for update', [mobile]);
    const row = rows[0];
    if (!row) return { status: 'expired' };
    if (row.locked_until && row.locked_until.getTime() > now) return { status: 'locked', retryAfterSec: secsUntil(row.locked_until) };
    if (row.expires_at.getTime() <= now) return { status: 'expired' };

    if (safeEq(row.code_hash, hashCode(mobile, code))) {
      await c.query('delete from otp_codes where mobile = $1', [mobile]);
      return { status: 'ok' };
    }
    const attempts = row.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await c.query('update otp_codes set attempts = 0, expires_at = now(), locked_until = $2 where mobile = $1', [
        mobile, new Date(now + LOCK_SEC * 1000),
      ]);
      return { status: 'locked', retryAfterSec: LOCK_SEC };
    }
    await c.query('update otp_codes set attempts = $2 where mobile = $1', [mobile, attempts]);
    return { status: 'invalid', attemptsLeft: MAX_ATTEMPTS - attempts };
  });

  switch (result.status) {
    case 'ok': return;
    case 'locked': throw tooMany(result.retryAfterSec);
    case 'invalid': throw new ApiError(400, 'OTP_INVALID', 'Wrong code.', { attemptsLeft: result.attemptsLeft });
    default: throw new ApiError(400, 'OTP_EXPIRED', 'This code has expired. Please request a new one.');
  }
}
