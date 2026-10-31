import type { Country } from './countries';

export const OTP_LENGTH = 6;
export const RESEND_SECONDS = 30;
export const TERMS_URL = 'https://zproogo.com/terms';       // TODO: replace with your real Terms of Use link
export const PRIVACY_URL = 'https://zproogo.com/privacy';   // TODO: replace with your real Privacy Policy link

export const onlyDigits = (value: string) => (value || '').replace(/\D/g, '');

/** Returns an error message, or '' when the number is fine. */
export function validatePhone(country: Country, rawValue: string): string {
  const digits = onlyDigits(rawValue);
  if (!digits) return 'Please enter your mobile number';
  if (/^(\d)\1+$/.test(digits)) return 'Please enter a valid mobile number';
  if (digits.length < country.min || digits.length > country.max) {
    return country.min === country.max
      ? `Mobile number must be ${country.min} digits`
      : `Mobile number must be ${country.min}-${country.max} digits`;
  }
  if (country.pattern && !country.pattern.test(digits)) {
    return country.code === 'IN'
      ? 'Enter a valid 10-digit number starting with 6, 7, 8 or 9'
      : 'Please enter a valid mobile number';
  }
  return '';
}

export function validateOtp(rawValue: string): string {
  const digits = onlyDigits(rawValue);
  if (!digits) return 'Please enter the OTP';
  if (digits.length !== OTP_LENGTH) return `OTP must be ${OTP_LENGTH} digits`;
  return '';
}
