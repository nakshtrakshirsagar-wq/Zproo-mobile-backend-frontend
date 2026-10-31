import dotenv from 'dotenv';
dotenv.config();

const env = process.env;
const isProd = env.NODE_ENV === 'production';

function need(name: string, devFallback: string): string {
  const v = env[name];
  if (v) return v;
  if (isProd) throw new Error(`Missing required environment variable ${name}`);
  return devFallback;
}

const config = {
  isProd,
  port: Number(env.PORT || 8080),
  databaseUrl: need('DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/zproogo'),
  dbSsl: env.DB_SSL === 'true',
  jwtSecret: need('JWT_ACCESS_SECRET', 'dev-only-access-secret-change-me'),
  otpPepper: need('OTP_PEPPER', 'dev-only-otp-pepper-change-me'),
  otpMode: (env.OTP_MODE || (isProd ? 'sms' : 'dev')) as 'dev' | 'sms',
  googleWebClientId: env.GOOGLE_WEB_CLIENT_ID || '',
  minAppVersion: env.MIN_APP_VERSION || '1.0.0',
  smsProvider: env.SMS_PROVIDER || 'twilio',
  twilio: { sid: env.TWILIO_ACCOUNT_SID || '', token: env.TWILIO_AUTH_TOKEN || '', from: env.TWILIO_FROM || '' },
  trustProxy: !!env.TRUST_PROXY,
};

if (isProd && config.otpMode === 'dev') {
  throw new Error('OTP_MODE=dev is not allowed in production (the OTP would always be 123456).');
}
if (isProd && /change-me|dev-only/.test(config.jwtSecret + config.otpPepper)) {
  throw new Error('Set real JWT_ACCESS_SECRET and OTP_PEPPER values in production.');
}

export default config;
