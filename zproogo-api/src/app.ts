import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import config from './config';
import { query } from './db';
import { ApiError } from './errors';
import { requireInstallId, optionalAuth } from './middleware/auth';
import { limits } from './middleware/rateLimit';
import authRoutes from './routes/auth';
import meRoutes from './routes/me';
import { wrap } from './utils';

const app = express();
if (config.trustProxy) app.set('trust proxy', 1); // needed for correct client IPs behind nginx / a PaaS
app.disable('x-powered-by');
app.use(helmet());
app.use(cors()); // the mobile app does not need CORS; this only helps browser based tools
app.use(express.json({ limit: '100kb' }));
app.use((req, res, next) => {
  const json = res.json.bind(res);
  res.json = (body?: any) => {
    if (res.statusCode >= 400) console.log('   ->', JSON.stringify(body), '| mobile sent:', req.body?.mobile);
    return json(body);
  };
  res.on('finish', () => console.log(new Date().toLocaleTimeString(), req.method, req.originalUrl, res.statusCode));
  next();
});

app.get('/health', async (_req, res) => {
  try { await query('select 1'); res.json({ ok: true, db: true }); }
  catch { res.status(503).json({ ok: false, db: false }); }
});

const v1 = express.Router();
v1.use(limits.general);

// public calls the app makes on start-up / on the home screen
v1.get('/app-config', (_req, res) => { res.json({ minVersion: config.minAppVersion, otpLength: 6 }); });
v1.get('/offers', (_req, res) => { res.json([]); });            // no offers table yet
v1.get('/recent-searches', (_req, res) => { res.json([]); });   // no search history table yet

v1.use(requireInstallId);
v1.use('/auth', authRoutes);
v1.use('/me', meRoutes);

v1.post('/devices', wrap(async (req, res) => {
  const user = await optionalAuth(req);
  const b = req.body ?? {};
  const str = (v: unknown, n: number): string | null => (typeof v === 'string' ? v.slice(0, n) : null);
  await query(
    `insert into devices (install_id, user_id, fcm_token, app_version, platform)
     values ($1, $2, $3, $4, $5)
     on conflict (install_id) do update set
       user_id = coalesce(excluded.user_id, devices.user_id),
       fcm_token = coalesce(excluded.fcm_token, devices.fcm_token),
       app_version = excluded.app_version, platform = excluded.platform, updated_at = now()`,
    [req.installId, user ? user.id : null, str(b.fcmToken, 500), str(b.appVersion, 20), str(b.platform, 20)]);
  res.json({ ok: true });
}));

app.use('/v1', v1);

app.use((_req, _res, next) => next(new ApiError(404, 'NOT_FOUND', 'Not found.')));

// Express recognises error handlers by their 4 parameters.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  const e = err as { type?: string; code?: string };
  if (e?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Invalid request body.' } });
    return;
  }
  if (e?.code === '23505') { // unique violation that a route did not handle itself
    res.status(409).json({ error: { code: 'CONFLICT', message: 'This value is already in use.' } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong. Please try again.' } });
});

export default app;
