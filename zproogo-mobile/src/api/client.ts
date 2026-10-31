import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Config } from '../config';
import { loadTokens, saveTokens, clearTokens, installId } from '../security/secureStore';
import { integrityToken } from '../security/integrity';
import { useAuth } from '../store/auth';

export type ApiError = { status: number; code: string; message: string; details?: any };

/** Requests that must carry a Play Integrity token (server enforces it in production). */
const SENSITIVE = [/^\/auth\/(otp|google)/, /^\/holds$/, /^\/holds\/[^/]+\/block$/, /^\/bookings$/, /^\/payments\/order/, /^\/safety\/sos/, /^\/cancellations$/];
const BASE_PATH = Config.API_URL.replace(/^https?:\/\/[^/]+/, '');

export const api = axios.create({ baseURL: Config.API_URL, timeout: 25000 });

api.interceptors.request.use(async (cfg: InternalAxiosRequestConfig) => {
  cfg.headers.set('X-Install-Id', installId());
  cfg.headers.set('X-App-Version', Config.VERSION);
  const t = await loadTokens();
  if (t && !cfg.headers.has('Authorization')) cfg.headers.set('Authorization', 'Bearer ' + t.accessToken);
  // serialise the body ourselves so the integrity hash covers the exact bytes sent
  const body = cfg.data === undefined ? '' : typeof cfg.data === 'string' ? cfg.data : JSON.stringify(cfg.data);
  if (cfg.data !== undefined) { cfg.data = body; cfg.headers.set('Content-Type', 'application/json'); }
  const path = (cfg.url ?? '').split('?')[0];
  if (SENSITIVE.some((r) => r.test(path))) {
    const tok = await integrityToken(cfg.method ?? 'get', BASE_PATH + path, body);
    if (tok) cfg.headers.set('X-Integrity-Token', tok);
  }
  return cfg;
});

let refreshing: Promise<string | null> | null = null;
async function refreshAccess(): Promise<string | null> {
  const t = await loadTokens();
  if (!t) return null;
  try {
    const { data } = await axios.post(Config.API_URL + '/auth/refresh', { refreshToken: t.refreshToken },
      { headers: { 'X-Install-Id': installId(), 'Content-Type': 'application/json' }, timeout: 15000 });
    await saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    return data.accessToken;
  } catch {
    await clearTokens();
    useAuth.getState().setUser(null);
    return null;
  }
}

api.interceptors.response.use((r) => r, async (err: AxiosError<any>) => {
  const code = err.response?.data?.error?.code;
  const orig: any = err.config;
  if (err.response?.status === 401 && code === 'TOKEN_EXPIRED' && orig && !orig._retry) {
    orig._retry = true;
    refreshing ??= refreshAccess().finally(() => setTimeout(() => { refreshing = null; }, 0));
    const fresh = await refreshing;
    if (fresh) {
      orig.headers.Authorization = 'Bearer ' + fresh;
      return api(orig);
    }
  }
  if (err.response?.status === 401 && ['SESSION_REVOKED', 'DEVICE_MISMATCH', 'TOKEN_INVALID'].includes(code)) {
    await clearTokens();
    useAuth.getState().setUser(null);
  }
  const e: ApiError = {
    status: err.response?.status ?? 0,
    code: code ?? (err.response ? 'ERROR' : 'NETWORK'),
    message: err.response?.data?.error?.message ?? (err.response ? 'Something went wrong' : 'No internet connection. Check your network and try again.'),
    details: err.response?.data?.error?.details,
  };
  return Promise.reject(e);
});

export const newIdemKey = () => `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
