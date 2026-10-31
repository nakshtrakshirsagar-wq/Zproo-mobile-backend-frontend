import dayjs from 'dayjs';

/**
 * Train booking validation (pure functions, no React) - Indian Railways / IRCTC rules.
 * Every function returns an error message string, or '' when the value is fine.
 * Change the constants below if the rules change.
 */
export const TRAIN_RULES = {
  ARP_DAYS: 60,              // advance reservation period (days before journey a ticket can be booked)
  MAX_PAX_GENERAL: 6,        // IRCTC: max 6 passengers per ticket (general quota)
  MAX_PAX_TATKAL: 4,         // IRCTC: max 4 passengers per ticket (Tatkal)
  NAME_MIN: 3,               // IRCTC: passenger name 3-16 characters
  NAME_MAX: 16,
  AGE_MIN_BERTH: 5,          // children below 5 travel free without a berth; this flow books berths/seats
  AGE_MAX: 125,
  SENIOR_AGE_MALE: 60,       // senior citizen concession: male/other 60+, female 58+
  SENIOR_AGE_FEMALE: 58,
} as const;

/** Classes with seats only (no berth preference). */
export const SEAT_ONLY_CLASSES = ['CC', 'EC', '2S', 'EA', 'EV', 'VC'];
export const isSeatOnlyClass = (classCode?: string) => !!classCode && SEAT_ONLY_CLASSES.includes(classCode.toUpperCase());

const NAME_RE = /^[A-Za-z]+(?:[ .'-][A-Za-z]+)*\.?$/;
const MOBILE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
const IRCTC_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.]{2,34}$/;

// ------------------------------------------------------------------ search
export type TrainSearchInput = { from: string; to: string; date: string; tatkal: boolean; paxCount: number };
export type TrainSearchResult = { errors: Partial<Record<'from' | 'to' | 'date' | 'pax', string>>; warning?: string };

export function validateTrainSearch(i: TrainSearchInput, now = dayjs()): TrainSearchResult {
  const errors: TrainSearchResult['errors'] = {};
  let warning: string | undefined;
  if (!i.from) errors.from = 'Select the departure station';
  if (!i.to) errors.to = 'Select the destination station';
  if (i.from && i.to && i.from === i.to) errors.to = 'From and To stations cannot be the same';

  const d = dayjs(i.date);
  const today = now.startOf('day');
  if (!i.date || !d.isValid()) errors.date = 'Select a valid journey date';
  else if (d.isBefore(today, 'day')) errors.date = 'Journey date cannot be in the past';
  else if (d.diff(today, 'day') > TRAIN_RULES.ARP_DAYS) {
    errors.date = `Bookings open ${TRAIN_RULES.ARP_DAYS} days in advance. Latest date: ${today.add(TRAIN_RULES.ARP_DAYS, 'day').format('D MMM YYYY')}`;
  } else if (i.tatkal) {
    if (d.isSame(today, 'day')) errors.date = 'Tatkal booking is closed for today. Choose tomorrow or a later date';
    else if (d.diff(today, 'day') > 1) warning = `Tatkal for ${d.format('D MMM')} opens on ${d.subtract(1, 'day').format('D MMM')} at 10:00 (AC) / 11:00 (non-AC).`;
  }

  const max = i.tatkal ? TRAIN_RULES.MAX_PAX_TATKAL : TRAIN_RULES.MAX_PAX_GENERAL;
  if (!Number.isInteger(i.paxCount) || i.paxCount < 1) errors.pax = 'Select at least 1 passenger';
  else if (i.paxCount > max) errors.pax = `Maximum ${max} passengers per ticket${i.tatkal ? ' on Tatkal' : ''}`;
  return { errors, warning };
}

// -------------------------------------------------------------- passengers
export type PaxInput = { name: string; age: string; gender: string; berth: string; senior: boolean };
export type PaxErrors = Partial<Record<'name' | 'age' | 'gender' | 'senior', string>>;

export function validatePassengerName(raw: string): string {
  const n = raw.trim().replace(/\s+/g, ' ');
  if (!n) return 'Enter the passenger name as on ID';
  if (n.length < TRAIN_RULES.NAME_MIN) return `Name must be at least ${TRAIN_RULES.NAME_MIN} characters`;
  if (n.length > TRAIN_RULES.NAME_MAX) return `Name can be at most ${TRAIN_RULES.NAME_MAX} characters (IRCTC limit). Shorten the middle name`;
  if (/\d/.test(n)) return 'Name cannot contain numbers';
  if (!NAME_RE.test(n)) return 'Use letters only (spaces, . \' - allowed)';
  return '';
}

export function validatePassengerAge(raw: string): string {
  if (!raw.trim()) return 'Enter age';
  const a = Number(raw);
  if (!Number.isInteger(a)) return 'Age must be a whole number';
  if (a < TRAIN_RULES.AGE_MIN_BERTH) return `Minimum age is ${TRAIN_RULES.AGE_MIN_BERTH} for a berth/seat (children under 5 travel free)`;
  if (a > TRAIN_RULES.AGE_MAX) return `Enter a valid age (up to ${TRAIN_RULES.AGE_MAX})`;
  return '';
}

export function validatePassenger(p: PaxInput): PaxErrors {
  const e: PaxErrors = {};
  const name = validatePassengerName(p.name); if (name) e.name = name;
  const age = validatePassengerAge(p.age); if (age) e.age = age;
  if (!['M', 'F', 'O'].includes(p.gender)) e.gender = 'Select gender';
  if (p.senior && !e.age) {
    const need = p.gender === 'F' ? TRAIN_RULES.SENIOR_AGE_FEMALE : TRAIN_RULES.SENIOR_AGE_MALE;
    if (Number(p.age) < need) e.senior = `Senior citizen concession needs age ${need}+ for ${p.gender === 'F' ? 'women' : 'men/other'}`;
  }
  return e;
}

/** Validates all passengers, including duplicate detection. Returns errors per passenger index + a summary message. */
export function validatePassengers(pax: PaxInput[]): { errors: PaxErrors[]; message: string } {
  const errors = pax.map(validatePassenger);
  const seen = new Map<string, number>();
  pax.forEach((p, i) => {
    const key = `${p.name.trim().replace(/\s+/g, ' ').toLowerCase()}|${p.age}|${p.gender}`;
    if (!errors[i].name && seen.has(key)) errors[i].name = `Same as passenger ${seen.get(key)! + 1}. Duplicate passengers are not allowed`;
    else seen.set(key, i);
  });
  const bad = errors.findIndex((e) => Object.keys(e).length > 0);
  return { errors, message: bad >= 0 ? `Please correct the details of passenger ${bad + 1}` : '' };
}

// ----------------------------------------------------------------- contact
export function validateMobile(v: string): string {
  if (!v) return 'Enter mobile number';
  if (v.length !== 10) return 'Mobile number must be 10 digits';
  if (!MOBILE_RE.test(v)) return 'Enter a valid Indian mobile number (starts with 6-9)';
  if (/^(\d)\1{9}$/.test(v)) return 'Enter a valid mobile number';
  return '';
}

export function validateEmail(v: string): string {
  const e = v.trim();
  if (!e) return 'Enter email address';
  if (e.length > 254) return 'Email address is too long';
  if (/\s/.test(e) || !EMAIL_RE.test(e) || e.includes('..')) return 'Enter a valid email, e.g. name@example.com';
  return '';
}

// ---------------------------------------------------------------- IRCTC / PNR
export function validateIrctcId(v: string): string {
  const u = v.trim();
  if (!u) return 'Enter your IRCTC user id';
  if (u.length < 3) return 'IRCTC user id has at least 3 characters';
  if (u.length > 35) return 'IRCTC user id has at most 35 characters';
  if (/\s/.test(u)) return 'User id cannot contain spaces';
  if (!IRCTC_ID_RE.test(u)) return 'Use only letters, numbers, underscore (_) and dot (.)';
  return '';
}

export function validatePnr(v: string): string {
  if (!v) return '';
  if (v.length < 10) return `PNR must be 10 digits (${v.length}/10)`;
  if (v[0] === '0') return 'Enter a valid PNR (cannot start with 0)';
  return '';
}
