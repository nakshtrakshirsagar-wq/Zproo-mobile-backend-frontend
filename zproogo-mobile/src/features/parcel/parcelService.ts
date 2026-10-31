import {
  Breakup, GoodsType, PARCEL_RULES, PayMethod, Place, VehicleId, WeightId, computeBreakup, isPrepaid, kmBetween, vehicleOf,
} from './parcelRules';

/**
 * Parcel "backend" - a local mock with the same shape a real API would have.
 * Everything here is pure (no React, no storage) so it is unit-tested; parcelStore.ts persists the orders.
 *
 * To connect the real backend later: keep the function names/types, replace the bodies with Api.* calls.
 *
 * Demo rules (so every screen can be seen):
 *  - pickup or drop in "Wakad" -> no driver accepts on the first try (screen P6b); adding the tip finds one
 *  - the ride then runs on its own: finding driver -> driver arriving -> at pickup -> in transit -> delivered
 */
export const PARCEL_TIMING = { SEARCH_MS: 6000, ARRIVE_MS: 20000, LOAD_MS: 10000, TRANSIT_MS: 30000, SCHEDULE_LEAD_MS: 30 * 60000 };

export type ParcelStatus = 'SCHEDULED' | 'SEARCHING' | 'NO_DRIVER' | 'ASSIGNED' | 'AT_PICKUP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
export type ParcelPoint = Place & { house: string; name: string; mobile: string };
export type ParcelDriver = { name: string; rating: number; vehicleModel: string; vehicleNo: string; trips: number };
export type ParcelGoods = { type: GoodsType; other?: string; weightId: WeightId; valueRupees: number; note?: string; helpers: number; protection: boolean };
export type ParcelFare = Breakup & { tipPaise: number; balanceDuePaise: number };

export type ParcelOrder = {
  id: string; createdAt: number; status: ParcelStatus; attempt: number;
  pickup: ParcelPoint; drop: ParcelPoint; distanceKm: number; vehicle: VehicleId; goods: ParcelGoods;
  scheduledFor?: number; fare: ParcelFare; payMethod: PayMethod; upiId?: string; paid: boolean;
  pickupOtp: string; dropOtp: string; driver?: ParcelDriver;
  t: { searchStartedAt?: number; assignedAt?: number; arrivedAt?: number; loadedAt?: number; deliveredAt?: number; cancelledAt?: number };
  refundPaise?: number; cancelFeePaise?: number; rating?: number; tipGivenPaise?: number; rated?: boolean;
};

export type NewOrderInput = Pick<ParcelOrder, 'pickup' | 'drop' | 'vehicle' | 'goods' | 'payMethod' | 'upiId'> & { coupon?: string; scheduledFor?: number };

// ------------------------------------------------------------------ helpers
const hash = (s: string) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
const DRIVERS = ['Ramesh Shinde', 'Sandeep Pawar', 'Imran Shaikh', 'Vijay Kale', 'Santosh Jadhav', 'Anil Gaikwad', 'Mahesh Bhosale', 'Dinesh Kamble'];
const pad = (n: number, w: number) => String(n).padStart(w, '0');

export function makeDriver(orderId: string, vehicle: VehicleId, attempt: number): ParcelDriver {
  const h = hash(orderId + attempt);
  return {
    name: DRIVERS[h % DRIVERS.length], rating: 4.3 + (h % 7) / 10, trips: 300 + (h % 2200),
    vehicleModel: vehicleOf(vehicle).driverVehicle,
    vehicleNo: `MH 12 ${String.fromCharCode(65 + (h % 26))}${String.fromCharCode(65 + ((h >> 3) % 26))} ${pad(1000 + (h % 9000), 4)}`,
  };
}
export const shouldFailSearch = (o: Pick<ParcelOrder, 'attempt' | 'pickup' | 'drop'>) =>
  o.attempt === 0 && (o.pickup.areaId === 'wakad' || o.drop.areaId === 'wakad');

/** Latency + failure like a real quote call. Throws when the route is outside the service area. */
export async function quoteRoute(pickup: Place, drop: Place, delayMs = 500): Promise<{ km: number; etaMin: number }> {
  await new Promise((r) => setTimeout(r, delayMs));
  const km = kmBetween(pickup, drop);
  if (km > PARCEL_RULES.MAX_KM) throw Object.assign(new Error(`We deliver within the city, up to ${PARCEL_RULES.MAX_KM} km`), { code: 'OUT_OF_AREA' });
  return { km, etaMin: Math.max(10, Math.round(km * 3.4)) };
}

// ------------------------------------------------------------------ create / lifecycle
export function buildOrder(i: NewOrderInput, now = Date.now(), rand = Math.random): ParcelOrder {
  const km = kmBetween(i.pickup, i.drop);
  const b = computeBreakup({ vehicle: i.vehicle, km, helpers: i.goods.helpers, protection: i.goods.protection, coupon: i.coupon });
  const prepaid = isPrepaid(i.payMethod);
  const later = !!i.scheduledFor;
  return {
    id: `ZPR-${pad(Math.floor(rand() * 90000) + 10000, 5)}`, createdAt: now, status: later ? 'SCHEDULED' : 'SEARCHING', attempt: 0,
    pickup: i.pickup, drop: i.drop, distanceKm: km, vehicle: i.vehicle, goods: i.goods, scheduledFor: i.scheduledFor,
    fare: { ...b, tipPaise: 0, balanceDuePaise: 0 }, payMethod: i.payMethod, upiId: i.payMethod === 'UPI' ? i.upiId?.trim() : undefined, paid: prepaid,
    pickupOtp: pad(Math.floor(rand() * 9000) + 1000, 4), dropOtp: pad(Math.floor(rand() * 9000) + 1000, 4),
    t: later ? {} : { searchStartedAt: now },
  };
}

/** Moves an order forward according to the clock. Returns the same object when nothing changed. */
export function advanceOrder(o: ParcelOrder, now = Date.now()): ParcelOrder {
  const T = PARCEL_TIMING;
  switch (o.status) {
    case 'SCHEDULED':
      if (o.scheduledFor && now >= o.scheduledFor - T.SCHEDULE_LEAD_MS) return { ...o, status: 'SEARCHING', t: { ...o.t, searchStartedAt: now } };
      return o;
    case 'SEARCHING':
      if (now - (o.t.searchStartedAt ?? now) < T.SEARCH_MS) return o;
      if (shouldFailSearch(o)) return { ...o, status: 'NO_DRIVER' };
      return { ...o, status: 'ASSIGNED', driver: makeDriver(o.id, o.vehicle, o.attempt), t: { ...o.t, assignedAt: now } };
    case 'ASSIGNED':
      return now - (o.t.assignedAt ?? now) >= T.ARRIVE_MS ? { ...o, status: 'AT_PICKUP', t: { ...o.t, arrivedAt: now } } : o;
    case 'AT_PICKUP':
      return now - (o.t.arrivedAt ?? now) >= T.LOAD_MS ? { ...o, status: 'IN_TRANSIT', t: { ...o.t, loadedAt: now } } : o;
    case 'IN_TRANSIT':
      return now - (o.t.loadedAt ?? now) >= T.TRANSIT_MS ? { ...o, status: 'DELIVERED', t: { ...o.t, deliveredAt: now } } : o;
    default:
      return o;
  }
}

/** 0..1 progress of the delivery leg (for the moving truck on the map and the ETA). */
export function transitProgress(o: ParcelOrder, now = Date.now()): number {
  if (o.status === 'DELIVERED') return 1;
  if (o.status !== 'IN_TRANSIT' || !o.t.loadedAt) return 0;
  return Math.min(1, (now - o.t.loadedAt) / PARCEL_TIMING.TRANSIT_MS);
}
/** Minutes left (display only; scaled so the demo looks like a real trip). */
export function etaMinutes(o: ParcelOrder, now = Date.now()): number {
  const real = Math.max(10, Math.round(o.distanceKm * 3.4));
  if (o.status === 'ASSIGNED') return Math.max(1, Math.ceil(vehicleOf(o.vehicle).etaMin * (1 - Math.min(1, (now - (o.t.assignedAt ?? now)) / PARCEL_TIMING.ARRIVE_MS))));
  if (o.status === 'IN_TRANSIT') return Math.max(1, Math.ceil(real * (1 - transitProgress(o, now))));
  return 0;
}

/** P6b action 1: add a tip and search again. */
export function retryWithTip(o: ParcelOrder, now = Date.now()): ParcelOrder {
  const tip = PARCEL_RULES.RETRY_TIP_PAISE;
  return { ...o, status: 'SEARCHING', attempt: o.attempt + 1, t: { ...o.t, searchStartedAt: now },
    fare: { ...o.fare, tipPaise: o.fare.tipPaise + tip, totalPaise: o.fare.totalPaise + tip, balanceDuePaise: o.fare.balanceDuePaise + (o.paid ? tip : 0) } };
}
/** P6b action 2: switch to another vehicle. The fare difference is paid to the driver at drop. */
export function switchVehicle(o: ParcelOrder, vehicle: VehicleId, now = Date.now()): ParcelOrder {
  const b = computeBreakup({ vehicle, km: o.distanceKm, helpers: o.goods.helpers, protection: o.goods.protection, coupon: o.fare.coupon });
  const helpers = vehicleOf(vehicle).helpersAllowed ? o.goods.helpers : 0;
  const total = b.totalPaise + o.fare.tipPaise;
  const diff = Math.max(0, total - o.fare.totalPaise);
  return { ...o, vehicle, status: 'SEARCHING', attempt: o.attempt + 1, goods: { ...o.goods, helpers }, t: { ...o.t, searchStartedAt: now },
    fare: { ...b, tipPaise: o.fare.tipPaise, totalPaise: total, balanceDuePaise: o.fare.balanceDuePaise + (o.paid ? diff : 0) } };
}
/** P6b action 3: park the order for a later slot. */
export const scheduleLater = (o: ParcelOrder, at: number): ParcelOrder => ({ ...o, status: 'SCHEDULED', scheduledFor: at, t: { ...o.t, searchStartedAt: undefined } });

// ------------------------------------------------------------------ cancel
export const canCancel = (o: ParcelOrder) => ['SCHEDULED', 'SEARCHING', 'NO_DRIVER', 'ASSIGNED', 'AT_PICKUP'].includes(o.status);
export function cancelQuote(o: ParcelOrder): { feePaise: number; refundPaise: number; note: string } {
  const fee = o.status === 'ASSIGNED' || o.status === 'AT_PICKUP' ? Math.min(PARCEL_RULES.CANCEL_FEE_AFTER_ASSIGN_PAISE, o.fare.totalPaise) : 0;
  const paidPaise = o.paid ? o.fare.totalPaise - o.fare.balanceDuePaise : 0;
  return { feePaise: fee, refundPaise: Math.max(0, paidPaise - fee),
    note: fee ? `A driver is already on the way, so ₹${fee / 100} is kept.` : 'No driver has been assigned, so you get a full refund.' };
}
export function cancelOrder(o: ParcelOrder, now = Date.now()): ParcelOrder {
  if (!canCancel(o)) return o;
  const q = cancelQuote(o);
  return { ...o, status: 'CANCELLED', cancelFeePaise: q.feePaise, refundPaise: q.refundPaise, t: { ...o.t, cancelledAt: now } };
}

// ------------------------------------------------------------------ after delivery
export function rateOrder(o: ParcelOrder, rating: number, tipPaise: number): ParcelOrder {
  return { ...o, rating, rated: true, tipGivenPaise: tipPaise };
}
export const orderTitle = (o: ParcelOrder) => `Parcel · ${vehicleOf(o.vehicle).short}`;
export const orderSubtitle = (o: ParcelOrder) => `${o.pickup.areaName} → ${o.drop.areaName} · ${o.distanceKm} km`;
export const isOngoing = (o: ParcelOrder) => !['DELIVERED', 'CANCELLED'].includes(o.status);

export function invoiceText(o: ParcelOrder): string {
  const r = (p: number) => '₹' + (p / 100).toLocaleString('en-IN');
  const f = o.fare;
  return [`Zproogo Parcel · Invoice ${o.id}`, `${o.pickup.areaName} → ${o.drop.areaName} · ${o.distanceKm} km`, `Vehicle: ${vehicleOf(o.vehicle).label}`,
    `Trip fare ${r(f.tripPaise)}`, f.helperPaise ? `Loading helpers ${r(f.helperPaise)}` : '', f.protectionPaise ? `Goods protection ${r(f.protectionPaise)}` : '',
    f.discountPaise ? `Coupon ${f.coupon} -${r(f.discountPaise)}` : '', f.tipPaise ? `Tip ${r(f.tipPaise)}` : '', `Total (incl. GST) ${r(f.totalPaise)}`,
  ].filter(Boolean).join('\n');
}
