import dayjs from 'dayjs';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../../security/secureStore';
import { ADDONS, Bike, DeliveryMode, Fuel, LicenceClass, PlanId, bikeOf, cancelQuote, computeBreakup, endOf, extendOptions, finalBill, planOf, FinalBill } from './bikeRules';

// ------------------------------------------------------------------ the rental being created (not persisted)
type Draft = {
  plan: PlanId; units: number; hubId: string; delivery: DeliveryMode; date: string; time: string;
  bikeId: string; addons: string[]; agree: boolean; coupon: string;
  set: (p: Partial<Omit<Draft, 'set' | 'reset'>>) => void; reset: () => void;
};
const base = () => ({ plan: 'HOURLY' as PlanId, units: planOf('HOURLY').def, hubId: 'KOTHRUD', delivery: 'HUB' as DeliveryMode,
  date: dayjs().format('YYYY-MM-DD'), time: '', bikeId: '', addons: ADDONS.filter((a) => a.def).map((a) => a.id) as string[], agree: false, coupon: '' });
export const useBikeDraft = create<Draft>((set) => ({ ...base(), set: (p) => set(p as any), reset: () => set({ ...base() }) }));

// ------------------------------------------------------------------ KYC: one-time, saved on the device (encrypted MMKV)
export type Kyc = {
  dl: string; classes: LicenceClass[]; learner: boolean; dob: string; licenceVerifiedAt?: number; licenceValidTill?: string;
  idKind: 'AADHAAR' | 'PASSPORT'; idValue: string; idVia?: 'DIGILOCKER' | 'PHOTO'; idVerifiedAt?: number; selfieAt?: number;
};
export const emptyKyc: Kyc = { dl: '', classes: [], learner: false, dob: '', idKind: 'AADHAAR', idValue: '' };
export const kycDone = (k: Kyc) => !!k.licenceVerifiedAt && !!k.idVerifiedAt && !!k.selfieAt;
export const maskId = (k: Kyc) => (k.idValue ? (k.idKind === 'AADHAAR' ? 'XXXX XXXX ' + k.idValue.replace(/\s/g, '').slice(-4) : k.idValue.slice(0, 2) + 'XXXXX' + k.idValue.slice(-1)) : 'Verified');

// ------------------------------------------------------------------ rentals
export type RentalStatus = 'RESERVED' | 'PICKUP' | 'ACTIVE' | 'RETURNING' | 'CLOSED' | 'CANCELLED';
export type Rental = {
  id: string; createdAt: number; status: RentalStatus; bikeId: string; hubId: string; delivery: DeliveryMode; plan: PlanId; units: number;
  startAt: number; endAt: number; addons: string[]; rentPaise: number; addonsPaise: number; deliveryPaise: number; depositPaise: number; paidPaise: number; freeKm: number | null; couponPaise: number; coupon?: string;
  extendedPaise: number; extensions: { label: string; paise: number; at: number }[];
  photos: { front: boolean; back: boolean; left: boolean; right: boolean }; startKm?: number; startFuel?: Fuel; checks: { helmet: boolean; brakes: boolean; papers: boolean };
  startedAt?: number; returnedAt?: number; endKm?: number; endFuel?: Fuel; bill?: FinalBill; checkedBy?: string; newDamage?: boolean;
  cancelFeePaise?: number; cancelledAt?: number; refundPaise?: number;
  rating?: number; tags?: string[]; damageReports: { at: number; note: string }[];
};
export const COUPONS: Record<string, { percent: number; maxPaise: number; label: string }> = { RIDE10: { percent: 10, maxPaise: 15000, label: '10% off rent' }, FIRSTRIDE: { percent: 20, maxPaise: 20000, label: '20% off your first rental' } };

export type NewRental = { bikeId: string; hubId: string; delivery: DeliveryMode; plan: PlanId; units: number; startAt: number; addons: string[]; coupon?: string };
const rid = () => 'EMR-' + Math.floor(10000 + Math.random() * 89999);
export function buildRental(i: NewRental, firstRental: boolean): Rental {
  const b = bikeOf(i.bikeId);
  const br = computeBreakup(b, i.plan, i.units, i.addons, i.delivery);
  const cp = i.coupon ? COUPONS[i.coupon] : undefined;
  const okCoupon = cp && (i.coupon !== 'FIRSTRIDE' || firstRental);
  const couponPaise = okCoupon ? Math.min(cp!.maxPaise, Math.round((br.rentPaise * cp!.percent) / 100)) : 0;
  return { id: rid(), createdAt: Date.now(), status: 'RESERVED', bikeId: i.bikeId, hubId: i.hubId, delivery: i.delivery, plan: i.plan, units: i.units,
    startAt: i.startAt, endAt: endOf({ plan: i.plan, units: i.units, start: i.startAt }), addons: i.addons, rentPaise: br.rentPaise, addonsPaise: br.addonsPaise, deliveryPaise: br.deliveryPaise,
    depositPaise: br.depositPaise, paidPaise: br.payNowPaise - couponPaise, freeKm: br.freeKm, couponPaise, coupon: okCoupon ? i.coupon : undefined, extendedPaise: 0, extensions: [],
    photos: { front: false, back: false, left: false, right: false }, checks: { helmet: false, brakes: false, papers: false }, damageReports: [] };
}
/** extending adds time and free km, and is charged now */
export function extendRental(r: Rental, optId: string): Rental {
  const b = bikeOf(r.bikeId); const o = extendOptions(b).find((x) => x.id === optId);
  if (!o) return r;
  const addKm = b.freeKm10 === null ? 0 : Math.round((b.freeKm10 / 10) * o.hours);
  return { ...r, endAt: dayjs(r.endAt).add(o.hours, 'hour').valueOf(), freeKm: r.freeKm === null ? null : r.freeKm + addKm, extendedPaise: r.extendedPaise + o.paise,
    extensions: [...r.extensions, { label: o.label, paise: o.paise, at: Date.now() }] };
}
/** a ride in progress: km grows with elapsed time (simulated, ~22 km/h average) */
export const simulatedKm = (r: Rental, now = Date.now()) => (r.startedAt ? Math.max(0, Math.round(((now - r.startedAt) / 3600000) * 22)) : 0);

type Store = {
  rentals: Rental[]; kyc: Kyc; firstDone: boolean;
  create: (i: NewRental) => Rental; patch: (id: string, p: Partial<Rental>) => void;
  saveKyc: (p: Partial<Kyc>) => void; resetKyc: () => void;
  extend: (id: string, optId: string) => void;
  cancel: (id: string) => void; startPickup: (id: string) => void; startRide: (id: string, km: number, fuel: Fuel) => void;
  requestReturn: (id: string) => void; closeReturn: (id: string, o: { km: number; fuel: Fuel; at?: number }) => void;
  rate: (id: string, rating: number, tags: string[]) => void; reportDamage: (id: string, note: string) => void;
};
const upd = (set: (f: (s: Store) => Partial<Store>) => void, id: string, fn: (r: Rental) => Rental) => set((s) => ({ rentals: s.rentals.map((r) => (r.id === id ? fn(r) : r)) }));

export const useBikeStore = create<Store>()(persist((set, get) => ({
  rentals: [], kyc: emptyKyc, firstDone: false,
  create: (i) => { const r = buildRental(i, !get().firstDone); set((s) => ({ rentals: [r, ...s.rentals].slice(0, 100), firstDone: true })); return r; },
  patch: (id, p) => upd(set, id, (r) => ({ ...r, ...p })),
  saveKyc: (p) => set((s) => ({ kyc: { ...s.kyc, ...p } })),
  resetKyc: () => set({ kyc: emptyKyc }),
  extend: (id, optId) => upd(set, id, (r) => extendRental(r, optId)),
  cancel: (id) => upd(set, id, (r) => {
    if (r.status !== 'RESERVED') return r;
    const q = cancelQuote(r.startAt, r.paidPaise, r.depositPaise);
    return { ...r, status: 'CANCELLED', cancelledAt: Date.now(), cancelFeePaise: q.feePaise, refundPaise: q.refundPaise };
  }),
  startPickup: (id) => upd(set, id, (r) => (r.status === 'RESERVED' ? { ...r, status: 'PICKUP' } : r)),
  startRide: (id, km, fuel) => upd(set, id, (r) => (r.status === 'PICKUP' ? { ...r, status: 'ACTIVE', startedAt: Date.now(), startKm: km, startFuel: fuel } : r)),
  requestReturn: (id) => upd(set, id, (r) => (r.status === 'ACTIVE' ? { ...r, status: 'RETURNING' } : r)),
  closeReturn: (id, o) => upd(set, id, (r) => {
    if (r.status !== 'RETURNING' && r.status !== 'ACTIVE') return r;
    const b: Bike = bikeOf(r.bikeId); const at = o.at ?? Date.now();
    const bill = finalBill(b, { depositPaise: r.depositPaise, freeKm: r.freeKm, endsAt: r.endAt, returnedAt: at, startFuel: r.startFuel ?? 4, endFuel: o.fuel, kmDriven: Math.max(0, o.km - (r.startKm ?? 0)) });
    return { ...r, status: 'CLOSED', returnedAt: at, endKm: o.km, endFuel: o.fuel, bill, checkedBy: 'Amit', newDamage: false, refundPaise: bill.refundPaise };
  }),
  rate: (id, rating, tags) => upd(set, id, (r) => ({ ...r, rating, tags })),
  reportDamage: (id, note) => upd(set, id, (r) => ({ ...r, damageReports: [...r.damageReports, { at: Date.now(), note }] })),
}), { name: 'bike', storage: createJSONStorage(() => mmkvStorage) }));

export const isLive = (r: Rental) => r.status === 'RESERVED' || r.status === 'PICKUP' || r.status === 'ACTIVE' || r.status === 'RETURNING';
export const rentalRoute = (r: Rental): { name: string; params: { id: string } } => ({
  name: r.status === 'RESERVED' ? 'BikeBooked' : r.status === 'PICKUP' ? 'BikePickup' : r.status === 'ACTIVE' ? 'BikeRide' : r.status === 'RETURNING' ? 'BikeReturn' : 'BikeClosed', params: { id: r.id } });
