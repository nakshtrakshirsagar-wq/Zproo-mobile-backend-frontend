import {
  findDuplicates, validateAge, validateEmail, validateEmergencyContact, validateIdNumber, validateMobile, validateName,
} from '../../utils/validation';
import type { PassengerErrors, PassengerFormValue } from './types';

export const MAX_SEATS_PER_BOOKING = 6;
export const INSURANCE_PER_SEAT_PAISE = 1500;

export type ValidateOpts = {
  /** Seats that only a woman may use: the gender of that passenger must be Female. */
  ladiesSeatIds?: string[];
  /** Operator needs an ID proof of the first passenger (and only Male / Female). */
  needsId?: boolean;
};

/**
 * All rules of the passenger page in one pure function (no React). Returns {} when the form can be submitted.
 * Rules: name (letters only, 2-60, no digits), age 1-110, gender required (Female on a ladies seat, no "Other" when the operator
 * needs ID), no duplicate passengers, 10-digit Indian mobile, valid email, ID number format, emergency contact differs from the booker.
 */
export function validatePassengerForm(v: PassengerFormValue, o: ValidateOpts = {}): PassengerErrors {
  const e: PassengerErrors = {};
  const ladies = o.ladiesSeatIds ?? [];
  const dup = findDuplicates(v.pax.map((p) => `${p.name}|${p.age}|${p.gender}`));
  v.pax.forEach((p, i) => {
    const n = validateName(p.name, { label: 'Passenger name' }) || dup[i];
    if (n) e['n' + i] = n;
    const a = validateAge(p.age);
    if (a) e['a' + i] = a;
    if (!p.gender) e['g' + i] = 'Select gender';
    else if (ladies.includes(p.seatId) && p.gender !== 'F') e['g' + i] = 'Ladies seat: only a woman can travel here';
    else if (o.needsId && p.gender === 'O') e['g' + i] = 'This operator accepts Male or Female only';
  });
  if (o.needsId) { const x = validateIdNumber(v.idType, v.idNumber); if (x) e.idNumber = x; }
  const m = validateMobile(v.mobile); if (m) e.mobile = m;
  const em = validateEmail(v.email); if (em) e.email = em;
  if (v.addEmergency) {
    const x = validateEmergencyContact(v.emergency, [v.mobile]);
    if (x.name) e.ecName = x.name;
    if (x.mobile) e.ecMobile = x.mobile;
  }
  return e;
}

/** First field (in screen order) that has an error, e.g. "n1" - used to scroll to it. */
export function firstErrorKey(e: PassengerErrors, paxCount: number): string | undefined {
  for (let i = 0; i < paxCount; i++) for (const k of ['n', 'a', 'g']) if (e[k + i]) return k + i;
  return ['idNumber', 'mobile', 'email', 'ecName', 'ecMobile'].find((k) => e[k]);
}

export const totalWithInsurance = (basePaise: number, taxPaise: number, seats: number, insurance: boolean) =>
  basePaise + taxPaise + (insurance ? seats * INSURANCE_PER_SEAT_PAISE : 0);
