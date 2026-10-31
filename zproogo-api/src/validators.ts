import { ApiError } from './errors';

/** The app always sends E.164: "+" + country code + number, e.g. +919876543210. */
export const MOBILE_RE = /^\+[1-9]\d{7,14}$/;
export const INSTALL_ID_RE = /^[A-Za-z0-9_-]{8,100}$/;

export function parseMobile(v: unknown): string {
  const m = typeof v === 'string' ? v.trim() : '';
  if (!MOBILE_RE.test(m)) throw new ApiError(400, 'INVALID_MOBILE', 'Please enter a valid mobile number.');
  return m;
}

export function parseOtp(v: unknown): string {
  const s = typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '';
  if (!/^\d{6}$/.test(s)) throw new ApiError(400, 'INVALID_OTP', 'OTP must be 6 digits.');
  return s;
}

export function isEmail(v: unknown): v is string {
  return typeof v === 'string' && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export const collapse = (s: string): string => s.replace(/\s+/g, ' ').trim();
