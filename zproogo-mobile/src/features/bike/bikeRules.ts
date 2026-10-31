import dayjs from 'dayjs';

/**
 * Bike rental - pure rules, pricing and validation (no React, no storage).
 * Prices are in paise (same as the rest of the app) and include GST.
 */

export type PlanId = 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type BikeType = 'SCOOTER' | 'BIKE' | 'ELECTRIC' | 'PREMIUM';
export type DeliveryMode = 'HUB' | 'DOORSTEP';
export type LicenceClass = 'MCWOG' | 'MCWG' | 'LMV';

export const BIKE_RULES = {
  DEPOSIT_REFUND_HOURS: 24,
  DOORSTEP_PAISE: 9900,          // each way
  LATE_PER_HR_PAISE: 6000,
  LATE_GRACE_MIN: 10,
  FUEL_PER_QUARTER_PAISE: 11000, // charged per 1/4 tank used below the pickup level
  FREE_CANCEL_BEFORE_MIN: 60,    // free cancellation until 1 hr before pickup
  CANCEL_FEE_PAISE: 9900,
  MIN_AGE: 18,
  PICKUP_FIRST_HOUR: 10, PICKUP_LAST_HOUR: 20, // hub open 10 AM - 8 PM
  MIN_AHEAD_MIN: 30, MAX_AHEAD_DAYS: 30,
  PHOTOS_REQUIRED: 4,
} as const;

export const PLANS: { id: PlanId; label: string; unit: string; units: string; min: number; max: number; def: number; hours: number }[] = [
  { id: 'HOURLY', label: 'Hourly', unit: 'hour', units: 'hours', min: 2, max: 12, def: 10, hours: 1 },
  { id: 'DAILY', label: 'Daily', unit: 'day', units: 'days', min: 1, max: 6, def: 1, hours: 24 },
  { id: 'WEEKLY', label: 'Weekly', unit: 'week', units: 'weeks', min: 1, max: 3, def: 1, hours: 24 * 7 },
  { id: 'MONTHLY', label: 'Monthly', unit: 'month', units: 'months', min: 1, max: 6, def: 1, hours: 24 * 30 },
];
export const planOf = (id: PlanId) => PLANS.find((p) => p.id === id)!;

export type Hub = { id: string; name: string; area: string; lat: number; lng: number; phone: string; distKm: number };
export const HUBS: Hub[] = [
  { id: 'KOTHRUD', name: 'Kothrud hub', area: 'Karve Road, Pune', lat: 18.5074, lng: 73.8077, phone: '+912000000001', distKm: 1.2 },
  { id: 'SHIVAJI', name: 'Shivajinagar hub', area: 'FC Road, Pune', lat: 18.5308, lng: 73.8475, phone: '+912000000002', distKm: 4.1 },
  { id: 'HINJEWADI', name: 'Hinjewadi hub', area: 'Phase 1, Pune', lat: 18.5912, lng: 73.7389, phone: '+912000000003', distKm: 11.6 },
  { id: 'KALYANI', name: 'Kalyani Nagar hub', area: 'Central Avenue, Pune', lat: 18.5463, lng: 73.9022, phone: '+912000000004', distKm: 9.3 },
];
export const hubOf = (id: string) => HUBS.find((h) => h.id === id) ?? HUBS[0];

export type Bike = {
  id: string; name: string; type: BikeType; cc: number; fuel: 'Petrol' | 'Electric'; gear: 'Automatic' | 'Manual';
  mileage: string; seats: number; rating: number; reviews: number; model: string; plate: string; servicedDaysAgo: number;
  hourly: number;       // paise per hour
  tenHr: number;        // paise for a 10-hour package
  daily: number; overnight: number; weekly: number; monthly: number; // paise
  freeKm10: number | null; // free km per 10 hours; null = unlimited
  extraKm: number;      // paise per extra km
  deposit: number;      // paise
  stock: number; badge?: string; licence: 'ANY' | 'MCWG'; tint: string; accent: string;
};
export const BIKES: Bike[] = [
  { id: 'ACTIVA', name: 'Honda Activa 6G', type: 'SCOOTER', cc: 110, fuel: 'Petrol', gear: 'Automatic', mileage: '50 km/l', seats: 2, rating: 4.7, reviews: 820, model: '2024 or similar', plate: 'MH 12 RT 4471', servicedDaysAgo: 3,
    hourly: 4900, tenHr: 39900, daily: 39900, overnight: 19900, weekly: 229900, monthly: 679900, freeKm10: 100, extraKm: 400, deposit: 150000, stock: 3, licence: 'ANY', tint: '#E6F2FA', accent: '#D90404' },
  { id: 'ATHER', name: 'Ather 450X', type: 'ELECTRIC', cc: 0, fuel: 'Electric', gear: 'Automatic', mileage: '105 km range', seats: 2, rating: 4.8, reviews: 412, model: '2024 or similar', plate: 'MH 12 EV 2208', servicedDaysAgo: 5,
    hourly: 7900, tenHr: 59900, daily: 59900, overnight: 29900, weekly: 349900, monthly: 999900, freeKm10: null, extraKm: 0, deposit: 250000, stock: 2, badge: 'Charged 92%', licence: 'ANY', tint: '#E6F2FA', accent: '#0EA5E9' },
  { id: 'PULSAR', name: 'Bajaj Pulsar 150', type: 'BIKE', cc: 150, fuel: 'Petrol', gear: 'Manual', mileage: '45 km/l', seats: 2, rating: 4.5, reviews: 604, model: '2023 or similar', plate: 'MH 12 PL 1530', servicedDaysAgo: 7,
    hourly: 6900, tenHr: 54900, daily: 54900, overnight: 27500, weekly: 319900, monthly: 929900, freeKm10: 120, extraKm: 500, deposit: 300000, stock: 2, licence: 'MCWG', tint: '#E6F2FA', accent: '#D90404' },
  { id: 'RE350', name: 'Royal Enfield Classic 350', type: 'PREMIUM', cc: 350, fuel: 'Petrol', gear: 'Manual', mileage: '35 km/l', seats: 2, rating: 4.8, reviews: 951, model: '2024 or similar', plate: 'MH 12 RE 3500', servicedDaysAgo: 2,
    hourly: 9900, tenHr: 89900, daily: 89900, overnight: 44900, weekly: 549900, monthly: 1549900, freeKm10: 150, extraKm: 600, deposit: 500000, stock: 1, badge: 'Last one', licence: 'MCWG', tint: '#E6F2FA', accent: '#9F1239' },
  { id: 'JUPITER', name: 'TVS Jupiter', type: 'SCOOTER', cc: 110, fuel: 'Petrol', gear: 'Automatic', mileage: '55 km/l', seats: 2, rating: 4.6, reviews: 530, model: '2024 or similar', plate: 'MH 12 JP 1100', servicedDaysAgo: 4,
    hourly: 3900, tenHr: 37900, daily: 37900, overnight: 18900, weekly: 219900, monthly: 649900, freeKm10: 100, extraKm: 400, deposit: 150000, stock: 4, licence: 'ANY', tint: '#E6F2FA', accent: '#F2A93B' },
];
export const bikeOf = (id: string) => BIKES.find((b) => b.id === id) ?? BIKES[0];
export const FILTERS: { value: 'ALL' | BikeType; label: string }[] = [
  { value: 'ALL', label: 'All' }, { value: 'SCOOTER', label: 'Scooter' }, { value: 'BIKE', label: 'Bike' }, { value: 'ELECTRIC', label: 'Electric' }, { value: 'PREMIUM', label: 'Premium' },
];
export type SortId = 'RECOMMENDED' | 'PRICE_LOW' | 'PRICE_HIGH' | 'RATING';
export const SORTS: { value: SortId; label: string }[] = [
  { value: 'RECOMMENDED', label: 'Recommended' }, { value: 'PRICE_LOW', label: 'Price: low to high' }, { value: 'PRICE_HIGH', label: 'Price: high to low' }, { value: 'RATING', label: 'Top rated' },
];

export type Addon = { id: 'DAMAGE' | 'PILLION' | 'HOLDER'; title: string; sub: string; paise: number; def: boolean };
export const ADDONS: Addon[] = [
  { id: 'DAMAGE', title: 'Damage protection', sub: 'Your cost for any damage capped at ₹1,000', paise: 4900, def: true },
  { id: 'PILLION', title: 'Pillion helmet', sub: 'Second ISI helmet for your passenger', paise: 3000, def: false },
  { id: 'HOLDER', title: 'Phone holder', sub: 'Handlebar mount for maps', paise: 2000, def: true },
];
export const DAMAGE_CAP_PAISE = 100000;

// ------------------------------------------------------------------ time + pricing
export type Slot = { plan: PlanId; units: number; start: number };
export const durationHours = (plan: PlanId, units: number) => planOf(plan).hours * units;
export const endOf = (s: Slot) => dayjs(s.start).add(durationHours(s.plan, s.units), 'hour').valueOf();

/** Hourly: hr x hours, capped at the 10-hour package; beyond 10 hours it is the package + extra hours, capped at a day. */
export function rentPaise(b: Bike, plan: PlanId, units: number): number {
  if (plan === 'DAILY') return b.daily * units;
  if (plan === 'WEEKLY') return b.weekly * units;
  if (plan === 'MONTHLY') return b.monthly * units;
  if (units <= 10) return Math.min(b.hourly * units, b.tenHr);
  return Math.min(b.tenHr + (units - 10) * b.hourly, b.daily);
}
/** "from" price shown on the plan chip */
export const fromHourly = (b: Bike) => b.hourly;
export const freeKm = (b: Bike, hours: number): number | null => (b.freeKm10 === null ? null : Math.round((b.freeKm10 / 10) * hours));
export const freeKmLabel = (b: Bike, hours: number) => { const f = freeKm(b, hours); return f === null ? 'Unlimited km' : `${f} km free`; };
export const extendOptions = (b: Bike) => [
  { id: 'H1', label: '+1 hour', hours: 1, paise: b.hourly },
  { id: 'H3', label: '+3 hours', hours: 3, paise: Math.floor((b.hourly * 3 * 0.95) / 100) * 100 },
  { id: 'NIGHT', label: 'Overnight', hours: 12, paise: b.overnight },
  { id: 'DAY', label: '+1 day', hours: 24, paise: b.daily },
];

export type Breakup = { rentPaise: number; addonsPaise: number; deliveryPaise: number; depositPaise: number; payNowPaise: number; hours: number; freeKm: number | null };
export function computeBreakup(b: Bike, plan: PlanId, units: number, addons: string[], delivery: DeliveryMode): Breakup {
  const hours = durationHours(plan, units);
  const rent = rentPaise(b, plan, units);
  const addonsPaise = ADDONS.filter((a) => addons.includes(a.id)).reduce((s, a) => s + a.paise, 0);
  const deliveryPaise = delivery === 'DOORSTEP' ? BIKE_RULES.DOORSTEP_PAISE * 2 : 0;
  return { rentPaise: rent, addonsPaise, deliveryPaise, depositPaise: b.deposit, hours, freeKm: freeKm(b, hours),
    payNowPaise: rent + addonsPaise + deliveryPaise + b.deposit };
}

// ------------------------------------------------------------------ return bill
export type Fuel = 0 | 1 | 2 | 3 | 4; // quarters of a tank
export const FUEL_LABELS = ['Empty', '1/4', '1/2', '3/4', 'Full'];
export type FinalBill = { kmDriven: number; extraKm: number; extraKmPaise: number; lateHours: number; latePaise: number; fuelQuarters: number; fuelPaise: number; deductions: number; refundPaise: number; lateMin: number };
export function finalBill(b: Bike, o: { depositPaise: number; freeKm: number | null; endsAt: number; returnedAt: number; startFuel: Fuel; endFuel: Fuel; kmDriven: number }): FinalBill {
  const extraKm = o.freeKm === null ? 0 : Math.max(0, o.kmDriven - o.freeKm);
  const extraKmPaise = extraKm * b.extraKm;
  const lateMin = Math.max(0, Math.round((o.returnedAt - o.endsAt) / 60000));
  const lateHours = lateMin > BIKE_RULES.LATE_GRACE_MIN ? Math.ceil(lateMin / 60) : 0;
  const latePaise = lateHours * BIKE_RULES.LATE_PER_HR_PAISE;
  const fuelQuarters = b.fuel === 'Electric' ? 0 : Math.max(0, o.startFuel - o.endFuel);
  const fuelPaise = fuelQuarters * BIKE_RULES.FUEL_PER_QUARTER_PAISE;
  const deductions = Math.min(o.depositPaise, extraKmPaise + latePaise + fuelPaise);
  return { kmDriven: o.kmDriven, extraKm, extraKmPaise, lateHours, latePaise, fuelQuarters, fuelPaise, deductions, refundPaise: o.depositPaise - deductions, lateMin };
}

// ------------------------------------------------------------------ cancellation
export function cancelQuote(startAt: number, paidPaise: number, depositPaise: number, now = Date.now()) {
  const free = now <= startAt - BIKE_RULES.FREE_CANCEL_BEFORE_MIN * 60000;
  const fee = free ? 0 : Math.min(BIKE_RULES.CANCEL_FEE_PAISE, paidPaise - depositPaise);
  return { free, feePaise: fee, refundPaise: paidPaise - fee, freeUntil: startAt - BIKE_RULES.FREE_CANCEL_BEFORE_MIN * 60000 };
}

// ------------------------------------------------------------------ validation (each returns an error message or '')
export function pickupSlots(date: string, now = Date.now()): string[] {
  const out: string[] = [];
  for (let h = BIKE_RULES.PICKUP_FIRST_HOUR; h <= BIKE_RULES.PICKUP_LAST_HOUR; h++) for (const m of [0, 30]) {
    if (h === BIKE_RULES.PICKUP_LAST_HOUR && m) continue;
    const t = dayjs(`${date} ${h}:${m}`, 'YYYY-MM-DD H:m');
    if (t.valueOf() >= now + BIKE_RULES.MIN_AHEAD_MIN * 60000) out.push(t.format('HH:mm'));
  }
  return out;
}
export function validateSlot(date: string, time: string, now = Date.now()): string {
  if (!date) return 'Select the pickup date';
  if (!time) return 'Select the pickup time';
  const t = dayjs(`${date} ${time}`, 'YYYY-MM-DD HH:mm');
  if (!t.isValid()) return 'Select a valid pickup time';
  if (t.valueOf() < now + BIKE_RULES.MIN_AHEAD_MIN * 60000) return `Pickup must be at least ${BIKE_RULES.MIN_AHEAD_MIN} minutes from now`;
  if (t.isAfter(dayjs(now).add(BIKE_RULES.MAX_AHEAD_DAYS, 'day'))) return `You can book up to ${BIKE_RULES.MAX_AHEAD_DAYS} days ahead`;
  if (t.hour() < BIKE_RULES.PICKUP_FIRST_HOUR || t.hour() > BIKE_RULES.PICKUP_LAST_HOUR) return 'Hubs hand over bikes between 10:00 AM and 8:00 PM';
  return '';
}
export const DL_RE = /^[A-Z]{2}\d{2}\s?\d{4}\s?\d{7}$/;
export const cleanDl = (t: string) => t.toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').slice(0, 20);
export function validateLicence(dl: string, classes: LicenceClass[], learner: boolean): string {
  if (learner) return 'Learner licences are not accepted';
  if (!dl.trim()) return 'Enter your driving licence number';
  if (!DL_RE.test(dl.trim())) return 'Enter a valid licence number, e.g. MH12 2019 0045123';
  if (!classes.length) return 'Select the vehicle class on your licence';
  return '';
}
export function licenceAllows(b: Bike, classes: LicenceClass[]): boolean {
  if (b.licence === 'ANY') return classes.includes('MCWOG') || classes.includes('MCWG');
  return classes.includes('MCWG');
}
export const DOC_RE = { AADHAAR: /^\d{12}$/, PASSPORT: /^[A-PR-WY][1-9]\d\s?\d{4}[1-9]$/ };
export function validateIdProof(kind: 'AADHAAR' | 'PASSPORT', value: string): string {
  const v = value.replace(/\s/g, '').toUpperCase();
  if (!v) return kind === 'AADHAAR' ? 'Enter your 12-digit Aadhaar number' : 'Enter your passport number';
  if (!DOC_RE[kind].test(v)) return kind === 'AADHAAR' ? 'Aadhaar must be 12 digits' : 'Enter a valid passport number';
  return '';
}
export function validateAge(dob: string, now = Date.now()): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return 'Enter your date of birth as YYYY-MM-DD';
  const d = dayjs(dob);
  if (!d.isValid() || d.isAfter(now)) return 'Enter a valid date of birth';
  if (dayjs(now).diff(d, 'year') < BIKE_RULES.MIN_AGE) return `You must be at least ${BIKE_RULES.MIN_AGE} years old to rent`;
  return '';
}
export const validateOdometer = (t: string, min = 0): string => {
  if (!/^\d{1,7}$/.test(t)) return 'Enter the odometer reading in km';
  if (Number(t) < min) return `Odometer cannot be below ${min} km`;
  return '';
};
