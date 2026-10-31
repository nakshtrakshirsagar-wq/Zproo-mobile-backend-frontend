import type { NextFunction, Request, Response } from 'express';
import { query } from '../db';
import { ApiError } from '../errors';
import { verifyAccess } from '../tokens';
import { INSTALL_ID_RE } from '../validators';
import type { UserRow } from '../types';

/** Every call from the app carries X-Install-Id (src/api/client.ts). Tokens are bound to it. */
export function requireInstallId(req: Request, _res: Response, next: NextFunction): void {
  const id = req.get('x-install-id') || '';
  if (!INSTALL_ID_RE.test(id)) return next(new ApiError(400, 'INSTALL_ID_REQUIRED', 'Missing or invalid X-Install-Id header.'));
  req.installId = id;
  next();
}

type AuthRow = UserRow & { s_revoked_at: Date | null; s_expires_at: Date };

/** Reads the Bearer token, checks it belongs to this install and to a live session. Returns the user row. */
async function loadAuth(req: Request): Promise<UserRow> {
  const m = /^Bearer (.+)$/i.exec(req.get('authorization') || '');
  if (!m) throw new ApiError(401, 'UNAUTHENTICATED', 'Please log in.');
  const claims = verifyAccess(m[1]);
  if (claims.iid !== req.installId) throw new ApiError(401, 'DEVICE_MISMATCH', 'This session belongs to a different device.');
  const { rows } = await query<AuthRow>(
    `select u.*, s.revoked_at as s_revoked_at, s.expires_at as s_expires_at
       from sessions s join users u on u.id = s.user_id
      where s.id = $1 and u.id = $2`,
    [claims.sid, claims.sub],
  );
  const row = rows[0];
  if (!row || row.s_revoked_at || row.deleted_at || row.s_expires_at.getTime() <= Date.now()) {
    throw new ApiError(401, 'SESSION_REVOKED', 'Please log in again.');
  }
  req.sessionId = claims.sid;
  return row;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try { req.user = await loadAuth(req); next(); } catch (e) { next(e); }
}

/** Like requireAuth but returns null instead of failing (guest, expired token ...). */
export async function optionalAuth(req: Request): Promise<UserRow | null> {
  try { return await loadAuth(req); } catch (e) {
    if (e instanceof ApiError) return null;
    throw e;
  }
}
