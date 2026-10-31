import express from 'express';
import { tx, query } from '../db';
import { ApiError } from '../errors';
import { userDto } from '../tokens';
import { requireAuth } from '../middleware/auth';
import { isEmail, collapse } from '../validators';
import { wrap } from '../utils';
import type { UserRow } from '../types';

const router = express.Router();
router.use(requireAuth);

const me = (req: express.Request): UserRow => req.user as UserRow; // set by requireAuth

router.get('/', (req, res) => { res.json(userDto(me(req))); });

router.patch('/', wrap(async (req, res) => {
  const b = req.body ?? {};
  const sets: string[] = [];
  const vals: unknown[] = [me(req).id];
  const add = (col: string, v: unknown) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };

  if (b.name !== undefined) {
    const name = typeof b.name === 'string' ? collapse(b.name) : '';
    if (name.length < 1 || name.length > 60) throw new ApiError(400, 'INVALID_NAME', 'Please enter your name (up to 60 characters).');
    add('name', name);
  }
  if (b.email !== undefined && b.email !== null && b.email !== '') {
    const email = typeof b.email === 'string' ? b.email.trim() : '';
    if (!isEmail(email)) throw new ApiError(400, 'INVALID_EMAIL', 'Please enter a valid email address.');
    add('email', email.toLowerCase());
  }
  if (b.gender !== undefined && b.gender !== null && b.gender !== '') {
    if (!['M', 'F', 'O'].includes(b.gender)) throw new ApiError(400, 'INVALID_GENDER', 'Invalid gender.');
    add('gender', b.gender);
  }
  if (b.womenModeDefault !== undefined) {
    if (typeof b.womenModeDefault !== 'boolean') throw new ApiError(400, 'INVALID_VALUE', 'womenModeDefault must be true or false.');
    add('women_mode_default', b.womenModeDefault);
  }
  if (!sets.length) { res.json(userDto(me(req))); return; }

  try {
    const { rows } = await query<UserRow>(`update users set ${sets.join(', ')}, updated_at = now() where id = $1 returning *`, vals);
    res.json(userDto(rows[0]));
  } catch (e) {
    if ((e as { code?: string }).code === '23505') throw new ApiError(409, 'EMAIL_IN_USE', 'This email is already used by another account.');
    throw e;
  }
}));

router.post('/irctc', wrap(async (req, res) => {
  const u = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  if (!/^[A-Za-z0-9_.@-]{3,40}$/.test(u)) throw new ApiError(400, 'INVALID_IRCTC', 'Please enter a valid IRCTC user id.');
  await query('update users set irctc_username = $2, updated_at = now() where id = $1', [me(req).id, u]);
  res.json({ ok: true });
}));

/** Delete account: personal details are wiped, every session is revoked. */
router.delete('/', wrap(async (req, res) => {
  const id = me(req).id;
  await tx(async (c) => {
    await c.query(
      `update users set deleted_at = now(), name = null, mobile = null, mobile_verified_at = null, email = null,
              google_sub = null, photo_url = null, irctc_username = null, updated_at = now() where id = $1`, [id]);
    await c.query('update sessions set revoked_at = now() where user_id = $1 and revoked_at is null', [id]);
    await c.query('delete from devices where user_id = $1', [id]);
  });
  res.json({ ok: true });
}));

export default router;
