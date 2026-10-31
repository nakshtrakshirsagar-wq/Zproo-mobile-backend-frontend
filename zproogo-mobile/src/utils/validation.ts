/**
 * Shared input validation (pure functions, no React).
 * Every validator returns an error message, or '' when the value is fine.
 * Limits mirror the backend (zproogo-api/src/modules/bookings/bookings.service.ts) so the app
 * never lets the user submit something the server would reject.
 */

export const LIMITS = {
  NAME_MIN: 2,
  NAME_MAX: 60,          // backend: 2-60
  FIRST_NAME_MAX: 30,
  LAST_NAME_MAX: 30,
  AGE_MIN: 1,
  AGE_MAX: 110,          // backend (bus): 1-110
  MOBILE_LEN: 10,
  OTP_LEN: 6,
  EMAIL_MAX: 120,        // backend: 120
  PASSPORT_MIN: 6,
  PASSPORT_MAX: 12,      // backend: 6-12
  PASSPORT_MIN_VALIDITY_MONTHS: 6,
  GSTIN_LEN: 15,
  IFSC_LEN: 11,
  ACCOUNT_MIN: 9,
  ACCOUNT_MAX: 18,
  UPI_MAX: 100,
  COUPON_MIN: 4,
  COUPON_MAX: 30,        // backend: 30
  PICKUP_NOTE_MAX: 120,
  SPECIAL_REQUEST_MAX: 400,
  SUPPORT_MIN: 5,
  SUPPORT_MAX: 2000,
  MAX_STAY_NIGHTS: 30,
  MAX_ADVANCE_DAYS_FLIGHT: 365,
  MAX_ADVANCE_DAYS_BUS: 90,
  MAX_ADVANCE_DAYS_HOTEL: 365,
  MAX_ROUNDTRIP_GAP_DAYS: 365,
  MAX_ROOMS: 5,
  MAX_GUESTS_PER_ROOM: 4,
} as const;

// ----------------------------------------------------------------- patterns
const NAME_RE = /^[A-Za-z]+(?:[ .'-][A-Za-z]+)*\.?$/;
const MOBILE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;   // same as backend
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const UPI_RE = /^[A-Za-z0-9._-]{2,64}@[A-Za-z][A-Za-z0-9]{1,63}$/;
const PASSPORT_RE = /^[A-Z0-9]+$/;
const COUPON_RE = /^[A-Z0-9_-]+$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// --------------------------------------------------------- input sanitisers
// Use these inside onChangeText so invalid characters never get typed in.
export const onlyDigits = (v: string, max?: number) => { const d = v.replace(/\D/g, ''); return max ? d.slice(0, max) : d; };
export const cleanName = (v: string, max: number = LIMITS.NAME_MAX) => v.replace(/[^A-Za-z .'-]/g, '').replace(/\s{2,}/g, ' ').replace(/^\s+/, '').slice(0, max);
export const cleanEmail = (v: string) => v.replace(/\s/g, '').slice(0, LIMITS.EMAIL_MAX);
export const cleanMobile = (v: string) => onlyDigits(v, LIMITS.MOBILE_LEN);
export const cleanAge = (v: string) => onlyDigits(v, 3);
export const cleanAlnumUpper = (v: string, max: number) => v.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, max);
export const cleanCoupon = (v: string) => v.replace(/[^A-Za-z0-9_-]/g, '').toUpperCase().slice(0, LIMITS.COUPON_MAX);
/** Date typing helper: digits only, auto-inserts dashes -> YYYY-MM-DD. */
export function cleanDateInput(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
}
export const collapseSpaces = (v: string) => v.trim().replace(/\s+/g, ' ');

// ------------------------------------------------------------------- dates
type YMD = { y: number; m: number; d: number };
/** Strict YYYY-MM-DD parse: rejects 2026-02-30, 2026-13-01, etc. Returns null when invalid. */
export function parseYmd(v: string): YMD | null {
  const m = DATE_RE.exec(v ?? '');
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (mo < 1 || mo > 12 || d < 1) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return { y, m: mo, d };
}
const toUtc = (p: YMD) => Date.UTC(p.y, p.m - 1, p.d);
const todayParts = (now: Date = new Date()): YMD => ({ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() });
const DAY = 86400000;
export const daysBetween = (a: YMD, b: YMD) => Math.round((toUtc(b) - toUtc(a)) / DAY);
/** Whole years between a birth date and a reference date. */
export function ageOn(dob: YMD, ref: YMD): number {
  let a = ref.y - dob.y;
  if (ref.m < dob.m || (ref.m === dob.m && ref.d < dob.d)) a -= 1;
  return a;
}
const addMonths = (p: YMD, n: number): YMD => {
  const dt = new Date(Date.UTC(p.y, p.m - 1 + n, 1));
  const last = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: Math.min(p.d, last) };
};
const fmt = (p: YMD) => `${String(p.d).padStart(2, '0')}-${String(p.m).padStart(2, '0')}-${p.y}`;
/** Accepts 'YYYY-MM-DD' or a full ISO date-time (uses the date part). */
const refDate = (v?: string, now?: Date): YMD => (v && parseYmd(v.slice(0, 10))) || todayParts(now);

// ------------------------------------------------------------------ person
export function validateName(raw: string, o: { label?: string; min?: number; max?: number } = {}): string {
  const label = o.label ?? 'Name';
  const min = o.min ?? LIMITS.NAME_MIN, max = o.max ?? LIMITS.NAME_MAX;
  const n = collapseSpaces(raw ?? '');
  if (!n) return `Enter ${label.toLowerCase()}`;
  if (/\d/.test(n)) return `${label} cannot contain numbers`;
  if (n.length < min) return `${label} must be at least ${min} characters`;
  if (n.length > max) return `${label} can be at most ${max} characters`;
  if (!NAME_RE.test(n)) return `${label}: use letters only (spaces, . ' - allowed)`;
  return '';
}

export function validateAge(raw: string, o: { min?: number; max?: number } = {}): string {
  const min = o.min ?? LIMITS.AGE_MIN, max = o.max ?? LIMITS.AGE_MAX;
  if (!raw || !raw.trim()) return 'Enter age';
  if (!/^\d+$/.test(raw.trim())) return 'Age must be a whole number';
  const a = Number(raw);
  if (a < min) return `Minimum age is ${min}`;
  if (a > max) return `Enter a valid age (up to ${max})`;
  return '';
}

export function validateMobile(v: string, label = 'mobile number'): string {
  if (!v) return `Enter ${label}`;
  if (!/^\d+$/.test(v)) return 'Mobile number can contain digits only';
  if (v.length !== LIMITS.MOBILE_LEN) return `Mobile number must be ${LIMITS.MOBILE_LEN} digits (${v.length}/${LIMITS.MOBILE_LEN})`;
  if (!MOBILE_RE.test(v)) return 'Enter a valid Indian mobile number (starts with 6-9)';
  if (/^(\d)\1{9}$/.test(v)) return 'Enter a valid mobile number';
  return '';
}

export function validateEmail(v: string, o: { required?: boolean } = {}): string {
  const e = (v ?? '').trim();
  if (!e) return o.required === false ? '' : 'Enter email address';
  if (e.length > LIMITS.EMAIL_MAX) return `Email can be at most ${LIMITS.EMAIL_MAX} characters`;
  if (/\s/.test(e) || e.includes('..') || !EMAIL_RE.test(e)) return 'Enter a valid email, e.g. name@example.com';
  return '';
}

export function validateOtp(v: string): string {
  if (!v) return 'Enter the OTP';
  if (!/^\d+$/.test(v)) return 'OTP has digits only';
  if (v.length !== LIMITS.OTP_LEN) return `OTP must be ${LIMITS.OTP_LEN} digits`;
  return '';
}

/** Emergency contact: name + mobile, and the mobile must differ from the traveller's own number(s). */
export function validateEmergencyContact(c: { name: string; mobile: string }, ownMobiles: string[] = []): { name?: string; mobile?: string } {
  const e: { name?: string; mobile?: string } = {};
  const n = validateName(c.name, { label: 'Contact name' }); if (n) e.name = n;
  const m = validateMobile(c.mobile, 'contact mobile'); if (m) e.mobile = m;
  else if (ownMobiles.filter(Boolean).includes(c.mobile)) e.mobile = 'Emergency contact must be a different number from yours';
  return e;
}

// ------------------------------------------------------- date of birth (flight)
export type FlightPaxType = 'ADULT' | 'CHILD' | 'INFANT';
/** Airline age bands on the travel date: adult 12+, child 2-11, infant under 2. */
export function validateDob(raw: string, type?: FlightPaxType, travelDate?: string, now?: Date): string {
  if (!raw) return 'Enter date of birth (YYYY-MM-DD)';
  const dob = parseYmd(raw);
  if (!dob) return raw.length < 10 ? 'Enter date as YYYY-MM-DD' : 'Enter a valid date of birth';
  const today = todayParts(now);
  if (daysBetween(today, dob) > 0) return 'Date of birth cannot be in the future';
  if (ageOn(dob, today) > 120) return 'Enter a valid date of birth';
  if (type) {
    const age = ageOn(dob, refDate(travelDate, now));
    if (type === 'ADULT' && age < 12) return 'Adult must be 12 years or older on the travel date';
    if (type === 'CHILD' && (age < 2 || age >= 12)) return 'Child must be 2 to 11 years old on the travel date';
    if (type === 'INFANT' && age >= 2) return 'Infant must be under 2 years on the travel date';
  }
  return '';
}

// ------------------------------------------------------------ passport / ID
export function validatePassportNo(v: string): string {
  const p = (v ?? '').trim().toUpperCase();
  if (!p) return 'Enter passport number';
  if (!PASSPORT_RE.test(p)) return 'Passport number can have letters and digits only';
  if (p.length < LIMITS.PASSPORT_MIN || p.length > LIMITS.PASSPORT_MAX) return `Passport number must be ${LIMITS.PASSPORT_MIN}-${LIMITS.PASSPORT_MAX} characters`;
  if (!/\d/.test(p)) return 'Enter a valid passport number';
  return '';
}

/** Passport must be valid for at least 6 months after the travel date (standard airline/immigration rule). */
export function validatePassportExpiry(raw: string, travelDate?: string, now?: Date): string {
  if (!raw) return 'Enter passport expiry (YYYY-MM-DD)';
  const exp = parseYmd(raw);
  if (!exp) return raw.length < 10 ? 'Enter date as YYYY-MM-DD' : 'Enter a valid expiry date';
  const travel = refDate(travelDate, now);
  if (daysBetween(travel, exp) < 0) return 'Passport expires before the travel date';
  const need = addMonths(travel, LIMITS.PASSPORT_MIN_VALIDITY_MONTHS);
  if (daysBetween(need, exp) < 0) return `Passport must be valid for ${LIMITS.PASSPORT_MIN_VALIDITY_MONTHS}+ months from travel (until ${fmt(need)})`;
  if (exp.y - travel.y > 20) return 'Enter a valid expiry date';
  return '';
}

export function validateNationality(v: string): string {
  if (!v) return 'Enter 2-letter country code';
  if (!/^[A-Za-z]{2}$/.test(v)) return 'Use the 2-letter country code, e.g. IN';
  return '';
}

// --------------------------------------------------------- GST / bank / UPI
export function validateGstin(v: string): string {
  const g = (v ?? '').trim().toUpperCase();
  if (!g) return 'Enter GSTIN';
  if (g.length !== LIMITS.GSTIN_LEN) return `GSTIN must be ${LIMITS.GSTIN_LEN} characters (${g.length}/${LIMITS.GSTIN_LEN})`;
  if (!GSTIN_RE.test(g)) return 'Enter a valid GSTIN, e.g. 27ABCDE1234F1Z5';
  return '';
}

export function validateIfsc(v: string): string {
  const i = (v ?? '').trim().toUpperCase();
  if (!i) return 'Enter IFSC code';
  if (i.length !== LIMITS.IFSC_LEN) return `IFSC must be ${LIMITS.IFSC_LEN} characters (${i.length}/${LIMITS.IFSC_LEN})`;
  if (!IFSC_RE.test(i)) return 'Enter a valid IFSC, e.g. HDFC0001234 (5th character is 0)';
  return '';
}

export function validateAccountNumber(v: string): string {
  if (!v) return 'Enter account number';
  if (!/^\d+$/.test(v)) return 'Account number can have digits only';
  if (v.length < LIMITS.ACCOUNT_MIN || v.length > LIMITS.ACCOUNT_MAX) return `Account number must be ${LIMITS.ACCOUNT_MIN}-${LIMITS.ACCOUNT_MAX} digits`;
  if (/^(\d)\1+$/.test(v)) return 'Enter a valid account number';
  return '';
}

export function validateUpi(v: string): string {
  const u = (v ?? '').trim();
  if (!u) return 'Enter UPI ID';
  if (u.length > LIMITS.UPI_MAX) return 'UPI ID is too long';
  if (/\s/.test(u)) return 'UPI ID cannot contain spaces';
  if (!UPI_RE.test(u)) return 'Enter a valid UPI ID, e.g. name@bank';
  return '';
}

// ------------------------------------------------------------- free text
const BAD_CHARS = /[<>]|[\u0000-\u0008\u000B\u000C\u000E-\u001F]/;
export function validateText(v: string, o: { label: string; min?: number; max: number; required?: boolean }): string {
  const t = (v ?? '').trim();
  if (!t) return o.required ? `Enter ${o.label.toLowerCase()}` : '';
  if (o.min && t.length < o.min) return `${o.label} must be at least ${o.min} characters`;
  if (t.length > o.max) return `${o.label} can be at most ${o.max} characters`;
  if (BAD_CHARS.test(t)) return `${o.label}: remove < and > characters`;
  return '';
}

export function validateCoupon(v: string): string {
  const c = (v ?? '').trim().toUpperCase();
  if (!c) return 'Enter a coupon code';
  if (c.length < LIMITS.COUPON_MIN) return `Coupon code has at least ${LIMITS.COUPON_MIN} characters`;
  if (c.length > LIMITS.COUPON_MAX) return `Coupon code has at most ${LIMITS.COUPON_MAX} characters`;
  if (!COUPON_RE.test(c)) return 'Coupon code can have letters, digits, - and _ only';
  return '';
}

// ----------------------------------------------------------- search forms
type Errs<K extends string> = Partial<Record<K, string>>;

function checkJourneyDate(date: string, maxDays: number, label: string, now?: Date): string {
  const d = parseYmd(date);
  if (!d) return `Select a valid ${label}`;
  const diff = daysBetween(todayParts(now), d);
  if (diff < 0) return `${label[0].toUpperCase()}${label.slice(1)} cannot be in the past`;
  if (diff > maxDays) return `Bookings open up to ${maxDays} days in advance`;
  return '';
}

export function validateBusSearch(i: { from: string; to: string; date: string }, now?: Date): Errs<'from' | 'to' | 'date'> {
  const e: Errs<'from' | 'to' | 'date'> = {};
  if (!i.from) e.from = 'Select the departure city';
  if (!i.to) e.to = 'Select the destination city';
  if (i.from && i.to && i.from === i.to) e.to = 'From and To cannot be the same';
  const d = checkJourneyDate(i.date, LIMITS.MAX_ADVANCE_DAYS_BUS, 'journey date', now); if (d) e.date = d;
  return e;
}

export type FlightSearchInput = { from: string; to: string; date: string; returnDate?: string; roundTrip: boolean; adults: number; children: number; infants: number };
export function validateFlightSearch(i: FlightSearchInput, now?: Date): Errs<'from' | 'to' | 'date' | 'returnDate' | 'pax'> {
  const e: Errs<'from' | 'to' | 'date' | 'returnDate' | 'pax'> = {};
  if (!i.from) e.from = 'Select the departure airport';
  if (!i.to) e.to = 'Select the destination airport';
  if (i.from && i.to && i.from === i.to) e.to = 'From and To airports cannot be the same';
  const d = checkJourneyDate(i.date, LIMITS.MAX_ADVANCE_DAYS_FLIGHT, 'departure date', now); if (d) e.date = d;
  if (i.roundTrip) {
    const dep = parseYmd(i.date), ret = i.returnDate ? parseYmd(i.returnDate) : null;
    if (!ret) e.returnDate = 'Select a valid return date';
    else if (dep && daysBetween(dep, ret) < 0) e.returnDate = 'Return date cannot be before the departure date';
    else if (dep && daysBetween(dep, ret) > LIMITS.MAX_ROUNDTRIP_GAP_DAYS) e.returnDate = 'Return date is too far from the departure date';
  }
  if (i.adults < 1) e.pax = 'At least 1 adult is required';
  else if (i.adults + i.children > 9) e.pax = 'Maximum 9 adults + children per booking';
  else if (i.infants > i.adults) e.pax = 'Each infant must travel with an adult';
  return e;
}

export type HotelSearchInput = { city: string; checkIn: string; checkOut: string; rooms: number; adults: number };
export function validateHotelSearch(i: HotelSearchInput, now?: Date): Errs<'city' | 'checkIn' | 'checkOut' | 'guests'> {
  const e: Errs<'city' | 'checkIn' | 'checkOut' | 'guests'> = {};
  if (!i.city) e.city = 'Select a city';
  const ci = parseYmd(i.checkIn), co = parseYmd(i.checkOut);
  const c1 = checkJourneyDate(i.checkIn, LIMITS.MAX_ADVANCE_DAYS_HOTEL, 'check-in date', now); if (c1) e.checkIn = c1;
  if (!co) e.checkOut = 'Select a valid check-out date';
  else if (ci && daysBetween(ci, co) < 1) e.checkOut = 'Check-out must be after check-in';
  else if (ci && daysBetween(ci, co) > LIMITS.MAX_STAY_NIGHTS) e.checkOut = `Maximum stay is ${LIMITS.MAX_STAY_NIGHTS} nights`;
  if (i.rooms < 1 || i.adults < 1) e.guests = 'Select at least 1 room and 1 adult';
  else if (i.rooms > i.adults) e.guests = 'Rooms cannot be more than guests';
  else if (i.adults > i.rooms * LIMITS.MAX_GUESTS_PER_ROOM) e.guests = `Maximum ${LIMITS.MAX_GUESTS_PER_ROOM} guests per room`;
  return e;
}

// -------------------------------------------------------- passenger lists
/** Marks duplicate passengers (same name + age/dob) on one booking. Returns error text per index ('' = ok). */
export function findDuplicates(keys: string[]): string[] {
  const seen = new Map<string, number>();
  return keys.map((k, i) => {
    const key = k.trim().replace(/\s+/g, ' ').toLowerCase();
    if (!key.replace(/\|/g, '')) return '';
    if (seen.has(key)) return `Same as passenger ${seen.get(key)! + 1}. Duplicate passengers are not allowed`;
    seen.set(key, i);
    return '';
  });
}

// ------------------------------------------------------- ID proof (bus operators that need it, e.g. ETS)
export const ID_TYPES = [
  { value: 'PAN', label: 'PAN' }, { value: 'AADHAAR', label: 'Aadhaar' }, { value: 'PASSPORT', label: 'Passport' },
  { value: 'DRIVING_LICENCE', label: 'Driving licence' }, { value: 'VOTER_ID', label: 'Voter ID' },
] as const;
export type IdTypeCode = typeof ID_TYPES[number]['value'];
export const cleanIdNumber = (v: string) => (v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
/** Mirrors the backend rules (holds.routes blockBody). */
export function validateIdNumber(type: IdTypeCode | '', raw: string): string {
  if (!type) return 'Select an ID type';
  const v = cleanIdNumber(raw);
  if (!v) return 'Enter ID number';
  if (type === 'PAN' && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v)) return 'Enter a valid PAN (e.g. ABCDE1234F)';
  if (type === 'AADHAAR' && !/^\d{12}$/.test(v)) return 'Aadhaar must be 12 digits';
  if (type === 'PASSPORT' && !/^[A-Z][0-9]{7}$/.test(v)) return 'Enter a valid passport number (e.g. A1234567)';
  if (v.length < 6) return 'Enter a valid ID number';
  return '';
}
