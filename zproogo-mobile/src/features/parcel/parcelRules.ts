import dayjs from 'dayjs';
import { LIMITS, collapseSpaces, validateCoupon, validateName, validateText, validateUpi } from '../../utils/validation';

/**
 * Parcel delivery - pure rules, pricing and validation (no React, no storage).
 * Every validator returns an error message string, or '' when the value is fine.
 * Prices are in paise (same as the rest of the app) and include GST.
 */

// ------------------------------------------------------------------ constants
export const PARCEL_RULES = {
  MOBILE_LEN: 10,
  MOBILE_FIRST_DIGITS: '789',     // parcel contacts: mobile must start with 7, 8 or 9
  HOUSE_MIN: 2, HOUSE_MAX: 80,
  NOTE_MAX: 150,
  OTHER_GOODS_MIN: 3, OTHER_GOODS_MAX: 40,
  VALUE_MAX_DIGITS: 6,
  BASE_COVER_RUPEES: 10000,       // goods covered up to this value at no cost
  PROTECTION_COVER_RUPEES: 25000, // with Goods protection; we do not carry goods worth more
  PROTECTION_PAISE: 1900,
  HELPER_PAISE: 15000,            // per helper, up to 2 floors
  MAX_HELPERS: 3,
  FREE_LOADING_MIN: 25, WAIT_PER_MIN_PAISE: 200,
  MIN_KM: 0.3, MAX_KM: 50,        // same-city service
  SCHEDULE_MIN_AHEAD_MIN: 60, SCHEDULE_MAX_DAYS: 7,
  SLOT_FIRST_HOUR: 6 as number, SLOT_LAST_HOUR: 22 as number,
  RETRY_TIP_PAISE: 3000,
  DRIVER_TIPS_PAISE: [1000, 2000, 3000] as number[],
  CANCEL_FEE_AFTER_ASSIGN_PAISE: 3000,
  MAX_SAVED_ADDRESSES: 10,
} as const;

export type VehicleId = 'TWO_WHEELER' | 'THREE_WHEELER' | 'MINI_TRUCK' | 'PICKUP';
export type Vehicle = { id: VehicleId; label: string; short: string; capacityKg: number; dims: string; basePaise: number; includedKm: number;
  perKmPaise: number; etaMin: number; tag: string; helpersAllowed: boolean; driverVehicle: string };

export const VEHICLES: Vehicle[] = [
  { id: 'TWO_WHEELER', label: '2-wheeler', short: '2-wheeler', capacityKg: 20, dims: '40×40×40 cm bag', basePaise: 4900, includedKm: 2, perKmPaise: 660, etaMin: 4, tag: 'Fastest', helpersAllowed: false, driverVehicle: 'Honda Activa' },
  { id: 'THREE_WHEELER', label: '3-wheeler', short: '3-wheeler', capacityKg: 500, dims: '5.5×4.5 ft', basePaise: 18900, includedKm: 2, perKmPaise: 960, etaMin: 7, tag: 'Best value', helpersAllowed: true, driverVehicle: 'Piaggio Ape 3-wheeler' },
  { id: 'MINI_TRUCK', label: 'Mini truck · Tata Ace 7ft', short: 'Mini truck', capacityKg: 750, dims: '7×4.8 ft', basePaise: 29900, includedKm: 2, perKmPaise: 1630, etaMin: 11, tag: 'Shifting', helpersAllowed: true, driverVehicle: 'Tata Ace' },
  { id: 'PICKUP', label: 'Pickup 8ft', short: 'Pickup 8ft', capacityKg: 1250, dims: '8×5 ft', basePaise: 44900, includedKm: 2, perKmPaise: 1920, etaMin: 18, tag: 'Heavy loads', helpersAllowed: true, driverVehicle: 'Mahindra Bolero Pickup' },
];
export const vehicleOf = (id: VehicleId) => VEHICLES.find((v) => v.id === id)!;

export const GOODS_TYPES = ['Household', 'Electronics', 'Documents', 'Furniture', 'Food', 'Construction', 'Other'] as const;
export type GoodsType = (typeof GOODS_TYPES)[number];
export const WEIGHTS = [
  { id: 'W20', label: 'Under 20 kg', maxKg: 20 }, { id: 'W100', label: '20–100', maxKg: 100 }, { id: 'W250', label: '100–250', maxKg: 250 },
  { id: 'W500', label: '250–500', maxKg: 500 }, { id: 'W1250', label: 'Over 500 kg', maxKg: 1250 },
] as const;
export type WeightId = (typeof WEIGHTS)[number]['id'];
export const weightOf = (id: WeightId) => WEIGHTS.find((w) => w.id === id)!;

export const PROHIBITED = ['Cash, jewellery and valuables', 'Liquids over 5 litres', 'Illegal or restricted items (drugs, weapons)', 'Flammable, explosive or hazardous goods',
  'Live animals', 'Perishables that need cold storage', 'Government IDs, cards and cheque books'];

export type PayMethod = 'UPI' | 'WALLET' | 'CASH_PICKUP' | 'CASH_DROP';
export const PAY_METHODS: { id: PayMethod; title: string; sub: string }[] = [
  { id: 'UPI', title: 'UPI · GPay / PhonePe', sub: 'Pay now, instant confirmation' },
  { id: 'WALLET', title: 'Zproogo wallet', sub: 'Pay from your wallet balance' },
  { id: 'CASH_PICKUP', title: 'Cash at pickup', sub: 'Pay the driver when loading' },
  { id: 'CASH_DROP', title: 'Cash at drop', sub: 'Receiver pays on delivery' },
];
export const isPrepaid = (m: PayMethod) => m === 'UPI' || m === 'WALLET';

// ------------------------------------------------------------------ service area (Pune)
export type ParcelArea = { id: string; name: string; pin: string; lat: number; lng: number };
/** Replace with a places/geocoding API when the backend is connected. */
export const PARCEL_AREAS: ParcelArea[] = [
  { id: 'swargate', name: 'Swargate Bus Stand', pin: '411042', lat: 18.5018, lng: 73.8636 },
  { id: 'baner', name: 'Baner Road, Baner', pin: '411045', lat: 18.559, lng: 73.7868 },
  { id: 'kothrud', name: 'Kothrud', pin: '411038', lat: 18.5074, lng: 73.8077 },
  { id: 'deccan', name: 'Deccan Gymkhana', pin: '411004', lat: 18.5167, lng: 73.8412 },
  { id: 'shivajinagar', name: 'Shivajinagar', pin: '411005', lat: 18.5308, lng: 73.8475 },
  { id: 'aundh', name: 'Aundh', pin: '411007', lat: 18.5580, lng: 73.8075 },
  { id: 'hinjewadi', name: 'Hinjewadi Phase 1', pin: '411057', lat: 18.5912, lng: 73.7389 },
  { id: 'wakad', name: 'Wakad', pin: '411057', lat: 18.5987, lng: 73.7603 },
  { id: 'pimpri', name: 'Pimpri', pin: '411018', lat: 18.6279, lng: 73.8009 },
  { id: 'vimannagar', name: 'Viman Nagar', pin: '411014', lat: 18.5679, lng: 73.9143 },
  { id: 'kharadi', name: 'Kharadi', pin: '411014', lat: 18.5515, lng: 73.9348 },
  { id: 'hadapsar', name: 'Hadapsar', pin: '411028', lat: 18.5089, lng: 73.926 },
  { id: 'kondhwa', name: 'Kondhwa', pin: '411048', lat: 18.4636, lng: 73.8938 },
  { id: 'katraj', name: 'Katraj', pin: '411046', lat: 18.4575, lng: 73.8677 },
  { id: 'camp', name: 'Pune Camp', pin: '411001', lat: 18.5136, lng: 73.8786 },
  { id: 'railway', name: 'Pune Railway Station', pin: '411001', lat: 18.5286, lng: 73.8744 },
];
export const areaOf = (id: string) => PARCEL_AREAS.find((a) => a.id === id);

/** Road distance estimate: straight line x 1.2 (replace with a routing API later). */
export function kmBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371, rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 1.2 * 10) / 10;
}

// ------------------------------------------------------------------ pricing
export const tripFarePaise = (v: Vehicle, km: number) =>
  Math.round((v.basePaise + Math.max(0, km - v.includedKm) * v.perKmPaise) / 100) * 100;

export type Coupon = { code: string; label: string; flatPaise?: number; pct?: number; maxPaise?: number; minFarePaise: number };
export const PARCEL_COUPONS: Coupon[] = [
  { code: 'PARCEL50', label: '₹50 off on trips of ₹200 or more', flatPaise: 5000, minFarePaise: 20000 },
  { code: 'FIRSTSEND', label: '20% off (up to ₹40) on trips of ₹100 or more', pct: 20, maxPaise: 4000, minFarePaise: 10000 },
];
export function applyCoupon(raw: string, farePaise: number): { discountPaise: number; coupon?: Coupon; error: string } {
  const bad = validateCoupon(raw); if (bad) return { discountPaise: 0, error: bad };
  const code = raw.trim().toUpperCase();
  const c = PARCEL_COUPONS.find((x) => x.code === code);
  if (!c) return { discountPaise: 0, error: 'This coupon is not valid for parcel delivery' };
  if (farePaise < c.minFarePaise) return { discountPaise: 0, error: `Valid on trip fare of ₹${c.minFarePaise / 100} or more` };
  const d = c.flatPaise ?? Math.min(Math.round((farePaise * (c.pct ?? 0)) / 100), c.maxPaise ?? Infinity);
  return { discountPaise: Math.min(d, farePaise), coupon: c, error: '' };
}

export type Breakup = { tripPaise: number; helperPaise: number; protectionPaise: number; discountPaise: number; totalPaise: number; coupon?: string };
export function computeBreakup(i: { vehicle: VehicleId; km: number; helpers: number; protection: boolean; coupon?: string }): Breakup {
  const v = vehicleOf(i.vehicle);
  const tripPaise = tripFarePaise(v, i.km);
  const helperPaise = v.helpersAllowed ? i.helpers * PARCEL_RULES.HELPER_PAISE : 0;
  const protectionPaise = i.protection ? PARCEL_RULES.PROTECTION_PAISE : 0;
  const cp = i.coupon ? applyCoupon(i.coupon, tripPaise) : null;
  const discountPaise = cp && !cp.error ? cp.discountPaise : 0;
  return { tripPaise, helperPaise, protectionPaise, discountPaise, coupon: discountPaise ? i.coupon!.trim().toUpperCase() : undefined,
    totalPaise: tripPaise + helperPaise + protectionPaise - discountPaise };
}

// ------------------------------------------------------------------ sanitisers (use inside onChangeText)
/** Mobile: digits only, 10 max. */
export const cleanParcelMobile = (v: string) => v.replace(/\D/g, '').slice(0, PARCEL_RULES.MOBILE_LEN);
/** Address line: letters, digits and  , . / # ( ) & ' -  only. */
export const cleanAddressLine = (v: string) => v.replace(/[^A-Za-z0-9 ,./#()&'-]/g, '').replace(/\s{2,}/g, ' ').replace(/^\s+/, '').slice(0, PARCEL_RULES.HOUSE_MAX);
/** Goods value: digits only (no letters, no decimals, no minus). */
export const cleanRupees = (v: string) => v.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, PARCEL_RULES.VALUE_MAX_DIGITS);
export const cleanNote = (v: string) => v.replace(/[<>]/g, '').slice(0, PARCEL_RULES.NOTE_MAX);
export const cleanOtherGoods = (v: string) => v.replace(/[^A-Za-z0-9 &,-]/g, '').replace(/\s{2,}/g, ' ').replace(/^\s+/, '').slice(0, PARCEL_RULES.OTHER_GOODS_MAX);

// ------------------------------------------------------------------ validators
export function validateParcelMobile(v: string, label = 'mobile number'): string {
  if (!v) return `Enter ${label}`;
  if (!/^\d+$/.test(v)) return 'Mobile number can contain digits only';
  if (!PARCEL_RULES.MOBILE_FIRST_DIGITS.includes(v[0])) return 'Mobile number must start with 7, 8 or 9';
  if (v.length !== PARCEL_RULES.MOBILE_LEN) return `Mobile number must be ${PARCEL_RULES.MOBILE_LEN} digits (${v.length}/${PARCEL_RULES.MOBILE_LEN})`;
  if (/^(\d)\1{9}$/.test(v)) return 'Enter a valid mobile number';
  return '';
}
/** Person name: letters only (space . ' - allowed), no digits, 2-60 characters. */
export const validatePersonName = (v: string, label = 'Name') => validateName(v, { label, max: LIMITS.NAME_MAX });

export function validateHouse(raw: string): string {
  const v = collapseSpaces(raw ?? '');
  if (!v) return 'Enter house / flat / floor';
  if (v.length < PARCEL_RULES.HOUSE_MIN) return `Enter at least ${PARCEL_RULES.HOUSE_MIN} characters`;
  if (v.length > PARCEL_RULES.HOUSE_MAX) return `At most ${PARCEL_RULES.HOUSE_MAX} characters`;
  if (!/^[A-Za-z0-9 ,./#()&'-]+$/.test(v)) return "Use letters, digits and , . / # ( ) & ' - only";
  if (!/[A-Za-z0-9]/.test(v)) return 'Enter a valid house / flat / floor';
  return '';
}

export type Place = { areaId: string; areaName: string; pin: string; lat: number; lng: number };
export const placeOf = (a: ParcelArea): Place => ({ areaId: a.id, areaName: a.name, pin: a.pin, lat: a.lat, lng: a.lng });
export function validateRoute(pickup?: Place | null, drop?: Place | null, km?: number): { pickup?: string; drop?: string } {
  const e: { pickup?: string; drop?: string } = {};
  if (!pickup) e.pickup = 'Select the pickup location';
  if (!drop) e.drop = 'Select the drop location';
  if (pickup && drop) {
    const d = km ?? kmBetween(pickup, drop);
    if (pickup.areaId === drop.areaId && d < PARCEL_RULES.MIN_KM) e.drop = 'Pickup and drop cannot be the same place';
    else if (d < PARCEL_RULES.MIN_KM) e.drop = 'Drop is too close to the pickup. Choose a different place';
    else if (d > PARCEL_RULES.MAX_KM) e.drop = `We deliver within the city, up to ${PARCEL_RULES.MAX_KM} km`;
  }
  return e;
}

export type ContactInput = { house: string; name: string; mobile: string };
export function validateContact(c: ContactInput, who: 'Sender' | 'Receiver'): Partial<Record<'house' | 'name' | 'mobile', string>> {
  const e: Partial<Record<'house' | 'name' | 'mobile', string>> = {};
  const h = validateHouse(c.house); if (h) e.house = h;
  const n = validatePersonName(c.name, `${who} name`); if (n) e.name = n;
  const m = validateParcelMobile(c.mobile, `${who.toLowerCase()} mobile`); if (m) e.mobile = m;
  return e;
}
/** Receiver must be a different number than the sender unless "I am the receiver" is ticked. */
export function validateReceiverMobile(receiver: string, sender: string, iAmReceiver: boolean): string {
  const m = validateParcelMobile(receiver, 'receiver mobile'); if (m) return m;
  if (!iAmReceiver && receiver === sender) return 'Receiver mobile is the same as the sender. Tick "I am the receiver" if that is you';
  return '';
}

export function validateSchedule(date: string, slot: string, now = dayjs()): string {
  if (!date) return 'Select the pickup date';
  if (!slot) return 'Select the pickup time';
  const t = dayjs(`${date} ${slot}`, 'YYYY-MM-DD HH:mm');
  if (!t.isValid()) return 'Select a valid pickup time';
  if (t.isBefore(now.add(PARCEL_RULES.SCHEDULE_MIN_AHEAD_MIN, 'minute'))) return `Pick a time at least ${PARCEL_RULES.SCHEDULE_MIN_AHEAD_MIN} minutes from now`;
  if (t.isAfter(now.add(PARCEL_RULES.SCHEDULE_MAX_DAYS, 'day'))) return `You can schedule up to ${PARCEL_RULES.SCHEDULE_MAX_DAYS} days ahead`;
  return '';
}
/** Half-hour slots between 06:00 and 22:00, already filtered for "too soon" on the chosen date. */
export function scheduleSlots(date: string, now = dayjs()): string[] {
  const out: string[] = [];
  for (let h = PARCEL_RULES.SLOT_FIRST_HOUR; h <= PARCEL_RULES.SLOT_LAST_HOUR; h++) for (const m of [0, 30]) {
    if (h === PARCEL_RULES.SLOT_LAST_HOUR && m === 30) continue;
    const s = `${String(h).padStart(2, '0')}:${m === 0 ? '00' : '30'}`;
    if (!date || !validateSchedule(date, s, now)) out.push(s);
  }
  return out;
}

export type GoodsInput = { type: GoodsType | ''; other: string; weightId: WeightId | ''; value: string; note: string; helpers: number; protection: boolean; rulesOk: boolean };
export type GoodsErrors = Partial<Record<'type' | 'other' | 'weight' | 'value' | 'note' | 'helpers' | 'rules', string>>;
export function validateGoods(g: GoodsInput, vehicle: VehicleId): GoodsErrors {
  const e: GoodsErrors = {};
  const v = vehicleOf(vehicle);
  if (!g.type) e.type = 'Select the type of goods';
  if (g.type === 'Other') {
    const t = collapseSpaces(g.other);
    if (!t) e.other = 'Tell us what you are sending';
    else if (/^\d+$/.test(t)) e.other = 'Describe the goods in words, not only numbers';
    else if (t.length < PARCEL_RULES.OTHER_GOODS_MIN) e.other = `Enter at least ${PARCEL_RULES.OTHER_GOODS_MIN} characters`;
  }
  if (!g.weightId) e.weight = 'Select the approximate weight';
  else if (weightOf(g.weightId).maxKg > v.capacityKg) e.weight = `${v.short} carries up to ${v.capacityKg} kg. Choose a bigger vehicle or a lower weight`;
  e.value = validateGoodsValue(g.value, g.protection) || undefined;
  if (!e.value) delete e.value;
  const n = validateText(g.note, { label: 'Note', max: PARCEL_RULES.NOTE_MAX }); if (n) e.note = n;
  if (!Number.isInteger(g.helpers) || g.helpers < 0) e.helpers = 'Helpers cannot be negative';
  else if (g.helpers > 0 && !v.helpersAllowed) e.helpers = `Loading helpers are not available with a ${v.short}`;
  else if (g.helpers > PARCEL_RULES.MAX_HELPERS) e.helpers = `Maximum ${PARCEL_RULES.MAX_HELPERS} helpers`;
  if (!g.rulesOk) e.rules = 'Please confirm that you are not sending prohibited items';
  return e;
}

/** Goods value in rupees: whole number only; above the free cover you need Goods protection. */
export function validateGoodsValue(raw: string, protection: boolean): string {
  const t = (raw ?? '').trim();
  if (!t) return 'Enter the approximate value of the goods';
  if (!/^\d+$/.test(t)) return 'Value must be a whole number in rupees (digits only)';
  const n = Number(t);
  if (n < 1) return 'Value must be at least ₹1';
  if (n > PARCEL_RULES.PROTECTION_COVER_RUPEES) return `We carry goods worth up to ₹${PARCEL_RULES.PROTECTION_COVER_RUPEES.toLocaleString('en-IN')}`;
  if (n > PARCEL_RULES.BASE_COVER_RUPEES && !protection) return `Goods above ₹${PARCEL_RULES.BASE_COVER_RUPEES.toLocaleString('en-IN')} need Goods protection (covers up to ₹${PARCEL_RULES.PROTECTION_COVER_RUPEES.toLocaleString('en-IN')})`;
  return '';
}

export function validatePayment(method: PayMethod | '', upiId: string, walletPaise: number, totalPaise: number): { method?: string; upi?: string } {
  const e: { method?: string; upi?: string } = {};
  if (!method) e.method = 'Select a payment method';
  if (method === 'UPI') { const u = validateUpi(upiId); if (u) e.upi = u; }
  if (method === 'WALLET' && walletPaise < totalPaise) e.method = `Wallet balance is low. Add ₹${Math.ceil((totalPaise - walletPaise) / 100)} more or pick another method`;
  return e;
}

export const validateTip = (paise: number) => (paise === 0 || PARCEL_RULES.DRIVER_TIPS_PAISE.includes(paise) ? '' : 'Choose a tip from the list');
export const validateRating = (n: number) => (Number.isInteger(n) && n >= 0 && n <= 5 ? '' : 'Rating must be between 1 and 5');
