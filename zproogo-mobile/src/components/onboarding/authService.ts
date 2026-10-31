import { GoogleSignin, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';
import { Api } from '../../api/endpoints';
import type { ApiError } from '../../api/client';
import { saveTokens } from '../../security/secureStore';
import { useAuth } from '../../store/auth';
import { Config } from '../../config';
import type { Country } from './countries';
import { RESEND_SECONDS } from './validation';

/** What OnboardingAuth hands back through onAuthSuccess() once the user is logged in. */
export type MergedInfo = { holdsMerged: number; searchesMerged: number; savedTravellers: number };
export type AuthResult = {
  /** Google user who still has to verify a mobile number (-> LinkMobile screen) */
  needsMobile: boolean;
  merged?: MergedInfo;
};

/** Error shown to the user. `lockedSec` > 0 means too many attempts: block the form for that long. */
export type AuthFailure = { message: string; lockedSec?: number; resendInSec?: number };

export const fullMobile = (country: Country, phone: string) => country.dial + phone.replace(/\D/g, '');

export function toFailure(e: any): AuthFailure {
  const err = e as Partial<ApiError> | undefined;
  switch (err?.code) {
    case 'TOO_MANY_ATTEMPTS': {
      const sec = err.details?.retryAfterSec ?? 900;
      return { message: `Too many attempts. Please try again in ${Math.ceil(sec / 60)} min.`, lockedSec: sec };
    }
    case 'OTP_INVALID':
      return { message: `Wrong code. ${err.details?.attemptsLeft ?? 'Few'} attempt(s) left before a 15-minute lock.` };
    case 'OTP_COOLDOWN':
      return { message: 'Please wait a moment before asking for another code.', resendInSec: err.details?.retryAfterSec ?? RESEND_SECONDS };
    default:
      return { message: err?.message || 'Something went wrong. Please try again.' };
  }
}

async function startSession(t: { accessToken: string; refreshToken: string; user: any }): Promise<MergedInfo | undefined> {
  await saveTokens({ accessToken: t.accessToken, refreshToken: t.refreshToken });
  useAuth.getState().setUser(t.user);
  // carry the guest searches / selection over to the new account (never blocks login if it fails)
  return Api.mergeGuest().catch(() => undefined);
}

/** Step 1: send the OTP. Resolves with the number of seconds before "Resend" is allowed. */
export async function sendOtp(country: Country, phone: string): Promise<number> {
  const r = await Api.sendOtp(fullMobile(country, phone));
  return r?.resendInSec ?? RESEND_SECONDS;
}

/** Step 2: verify the OTP, store the tokens (Android Keystore) and set the logged-in user. */
export async function verifyOtp(country: Country, phone: string, otp: string): Promise<AuthResult> {
  const t = await Api.verifyOtp(fullMobile(country, phone), otp);
  const merged = await startSession(t);
  return { needsMobile: false, merged };
}

let googleConfigured = false;

/** Google sign-in. Resolves with null when the person cancelled the Google sheet. */
export async function signInWithGoogle(): Promise<AuthResult | null> {
  if (!googleConfigured) {
    GoogleSignin.configure({ webClientId: Config.GOOGLE_WEB_CLIENT_ID });
    googleConfigured = true;
  }
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const r = await GoogleSignin.signIn();
    if (!isSuccessResponse(r) || !r.data.idToken) return null; // cancelled
    const t: any = await Api.google(r.data.idToken);
    if (t.needsMobile) {
      await saveTokens({ accessToken: t.accessToken, refreshToken: t.refreshToken });
      useAuth.getState().setUser(t.user);
      return { needsMobile: true };
    }
    return { needsMobile: false, merged: await startSession(t) };
  } catch (e: any) {
    if (e?.code === statusCodes.SIGN_IN_CANCELLED || e?.code === statusCodes.IN_PROGRESS || e?.code === '12501') return null;
    if (e?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) throw { message: 'Google Play Services is not available on this device.' };
    throw e;
  }
}
