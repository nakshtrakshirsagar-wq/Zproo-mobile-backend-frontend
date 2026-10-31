import express from 'express';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import config from '../config';
import { tx, query } from '../db';
import { ApiError } from '../errors';
import { parseMobile, parseOtp } from '../validators';
import { requestOtp, checkOtp } from '../otp';
import { createSession, userDto, sha256, safeEq, signAccess, newRefreshToken, ACCESS_TTL_SEC, REFRESH_TTL_DAYS } from '../tokens';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { limits } from '../middleware/rateLimit';
import { wrap } from '../utils';
import type { SessionRow, TokenPair, UserRow } from '../types';

const router = express.Router();
const ctx = (req: express.Request) => ({ installId: req.installId as string, ip: req.ip, userAgent: req.get('user-agent') });

// ---- phone OTP -------------------------------------------------------------------------------

router.post('/otp/send', limits.otp, wrap(async (req, res) => {
  const mobile = parseMobile(req.body?.mobile);
  res.json(await requestOtp(mobile));
}));

/**
 * Verify = login. If nobody has this number yet a new users row is created (that is "sign up").
 * If the caller is a Google user without a mobile (LinkMobile screen) the number is linked to that account instead.
 */
router.post('/otp/verify', limits.otp, wrap(async (req, res) => {
  const mobile = parseMobile(req.body?.mobile);
  const otp = parseOtp(req.body?.otp);
  await checkOtp(mobile, otp);

  const current = await optionalAuth(req);
  const out = await tx(async (c) => {
    const existing = (await c.query<UserRow>('select * from users where mobile = $1 and deleted_at is null', [mobile])).rows[0];
    let user: UserRow;
    let isNew = false;
    let linked = false;

    if (current && !current.mobile) {
      if (existing && existing.id !== current.id) {
        throw new ApiError(409, 'MOBILE_IN_USE', 'This mobile number is already linked to another account.');
      }
      user = (await c.query<UserRow>(
        'update users set mobile = $2, mobile_verified_at = now(), updated_at = now() where id = $1 returning *',
        [current.id, mobile])).rows[0];
      linked = true;
    } else if (existing) {
      user = (await c.query<UserRow>(
        'update users set mobile_verified_at = now(), updated_at = now() where id = $1 returning *', [existing.id])).rows[0];
    } else {
      const ins = await c.query<UserRow>(
        'insert into users (mobile, mobile_verified_at) values ($1, now()) on conflict (mobile) do nothing returning *', [mobile]);
      if (ins.rows[0]) { user = ins.rows[0]; isNew = true; }
      else user = (await c.query<UserRow>('select * from users where mobile = $1', [mobile])).rows[0];
    }
    const tokens = await createSession(c, { userId: user.id, ...ctx(req) });
    return { ...tokens, user: userDto(user), isNew, linked };
  });
  res.json(out);
}));

// ---- Google ----------------------------------------------------------------------------------

const googleClient = new OAuth2Client();

router.post('/google', limits.otp, wrap(async (req, res) => {
  if (!config.googleWebClientId) throw new ApiError(503, 'GOOGLE_NOT_CONFIGURED', 'Google sign-in is not configured on the server.');
  const idToken: unknown = req.body?.idToken;
  if (typeof idToken !== 'string' || idToken.length < 20) throw new ApiError(400, 'INVALID_TOKEN', 'Missing Google token.');

  let p: TokenPayload | undefined;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: config.googleWebClientId });
    p = ticket.getPayload();
  } catch {
    throw new ApiError(401, 'GOOGLE_TOKEN_INVALID', 'Google sign-in failed. Please try again.');
  }
  if (!p || !p.sub) throw new ApiError(401, 'GOOGLE_TOKEN_INVALID', 'Google sign-in failed. Please try again.');
  const google = p;
  const email = google.email && google.email_verified ? google.email.toLowerCase() : null;

  const out = await tx(async (c) => {
    let user = (await c.query<UserRow>('select * from users where google_sub = $1 and deleted_at is null', [google.sub])).rows[0];
    let isNew = false;
    if (!user && email) {
      const byEmail = (await c.query<UserRow>('select * from users where lower(email) = $1 and deleted_at is null', [email])).rows[0];
      if (byEmail) {
        user = (await c.query<UserRow>(
          `update users set google_sub = $2, photo_url = coalesce(photo_url, $3), name = coalesce(name, $4), updated_at = now()
            where id = $1 returning *`, [byEmail.id, google.sub, google.picture || null, google.name || null])).rows[0];
      }
    }
    if (!user) {
      user = (await c.query<UserRow>(
        'insert into users (google_sub, email, name, photo_url) values ($1, $2, $3, $4) returning *',
        [google.sub, email, google.name || null, google.picture || null])).rows[0];
      isNew = true;
    }
    const tokens = await createSession(c, { userId: user.id, ...ctx(req) });
    return { ...tokens, user: userDto(user), isNew, needsMobile: !user.mobile };
  });
  res.json(out);
}));

// ---- refresh / logout ------------------------------------------------------------------------

type RefreshResult = { ok: TokenPair } | { err: 'SESSION_REVOKED' | 'DEVICE_MISMATCH' | 'TOKEN_INVALID' };

/** Refresh tokens rotate on every use. Presenting an already-used one means it leaked, so the whole session is revoked. */
router.post('/refresh', wrap(async (req, res) => {
  const token: unknown = req.body?.refreshToken;
  const sid = typeof token === 'string' ? token.split('.')[0] : '';
  if (typeof token !== 'string' || !/^[0-9a-f-]{36}$/i.test(sid)) throw new ApiError(401, 'TOKEN_INVALID', 'Please log in again.');

  const result = await tx<RefreshResult>(async (c) => {
    const s = (await c.query<SessionRow & { u_deleted: Date | null }>(
      `select s.*, u.deleted_at as u_deleted from sessions s join users u on u.id = s.user_id where s.id = $1 for update of s`, [sid])).rows[0];
    if (!s || s.revoked_at || s.u_deleted || s.expires_at.getTime() <= Date.now()) return { err: 'SESSION_REVOKED' };
    if (s.install_id !== req.installId) return { err: 'DEVICE_MISMATCH' };

    const h = sha256(token);
    if (safeEq(h, s.refresh_hash)) {
      const fresh = newRefreshToken(sid);
      await c.query(
        `update sessions set prev_refresh_hash = refresh_hash, refresh_hash = $2, last_used_at = now(),
                expires_at = now() + make_interval(days => $3::int) where id = $1`,
        [sid, sha256(fresh), REFRESH_TTL_DAYS]);
      return { ok: { accessToken: signAccess({ userId: s.user_id, sessionId: sid, installId: s.install_id }), refreshToken: fresh, expiresInSec: ACCESS_TTL_SEC } };
    }
    if (s.prev_refresh_hash && safeEq(h, s.prev_refresh_hash)) {
      await c.query('update sessions set revoked_at = now() where id = $1', [sid]); // replay detected
      return { err: 'SESSION_REVOKED' };
    }
    return { err: 'TOKEN_INVALID' };
  });

  if ('ok' in result) { res.json(result.ok); return; }
  const msg = result.err === 'DEVICE_MISMATCH' ? 'This session belongs to a different device.' : 'Please log in again.';
  throw new ApiError(401, result.err, msg);
}));

router.post('/logout', requireAuth, wrap(async (req, res) => {
  await query('update sessions set revoked_at = now() where id = $1 and revoked_at is null', [req.sessionId]);
  res.json({ ok: true });
}));

/** Guest searches / holds are not stored on the server yet, so there is nothing to carry over. */
router.post('/merge-guest', requireAuth, (_req, res) => {
  res.json({ holdsMerged: 0, searchesMerged: 0, savedTravellers: 0 });
});

export default router;
