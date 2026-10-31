import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { PoolClient } from 'pg';
import config from './config';
import { ApiError } from './errors';
import type { TokenPair, UserDto, UserRow } from './types';

export const ACCESS_TTL_SEC = 15 * 60; // 15-minute access token (the app refreshes it silently)
export const REFRESH_TTL_DAYS = 30;
const ISSUER = 'zproogo-api';

export type AccessClaims = { sub: string; sid: string; iid: string };

export const sha256 = (s: string): string => crypto.createHash('sha256').update(s).digest('hex');

export const safeEq = (a: string, b: string): boolean => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

export function signAccess(p: { userId: string; sessionId: string; installId: string }): string {
  return jwt.sign({ sid: p.sessionId, iid: p.installId }, config.jwtSecret, {
    algorithm: 'HS256', subject: p.userId, issuer: ISSUER, expiresIn: ACCESS_TTL_SEC,
  });
}

/** Throws TOKEN_EXPIRED (the app then refreshes) or TOKEN_INVALID. */
export function verifyAccess(token: string): AccessClaims {
  try {
    return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'], issuer: ISSUER }) as unknown as AccessClaims;
  } catch (e) {
    if (e instanceof jwt.TokenExpiredError) throw new ApiError(401, 'TOKEN_EXPIRED', 'Session expired.');
    throw new ApiError(401, 'TOKEN_INVALID', 'Please log in again.');
  }
}

/** Refresh token = "<sessionId>.<random>"; only its sha256 is stored. */
export const newRefreshToken = (sessionId: string): string => `${sessionId}.${crypto.randomBytes(32).toString('base64url')}`;

/** Creates a session row and returns the token pair the app stores in the Android Keystore. */
export async function createSession(
  client: PoolClient,
  p: { userId: string; installId: string; ip?: string; userAgent?: string },
): Promise<TokenPair> {
  const sessionId = crypto.randomUUID();
  const refreshToken = newRefreshToken(sessionId);
  await client.query(
    `insert into sessions (id, user_id, install_id, refresh_hash, ip, user_agent, expires_at)
     values ($1, $2, $3, $4, $5, $6, now() + make_interval(days => $7::int))`,
    [sessionId, p.userId, p.installId, sha256(refreshToken), p.ip || null, (p.userAgent || '').slice(0, 300), REFRESH_TTL_DAYS],
  );
  return {
    accessToken: signAccess({ userId: p.userId, sessionId, installId: p.installId }),
    refreshToken,
    expiresInSec: ACCESS_TTL_SEC,
  };
}

export const userDto = (u: UserRow): UserDto => ({
  id: u.id,
  name: u.name,
  mobile: u.mobile,
  email: u.email,
  photoUrl: u.photo_url,
  gender: u.gender,
  points: u.points,
  womenModeDefault: u.women_mode_default,
  irctcUsername: u.irctc_username,
});
