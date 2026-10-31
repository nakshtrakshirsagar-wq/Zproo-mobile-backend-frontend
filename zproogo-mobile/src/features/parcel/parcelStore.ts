import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../../security/secureStore';
import { GoodsType, PARCEL_RULES, PayMethod, Place, VehicleId, WeightId } from './parcelRules';
import {
  NewOrderInput, ParcelOrder, ParcelPoint, advanceOrder, buildOrder, cancelOrder, rateOrder, retryWithTip, scheduleLater, switchVehicle,
} from './parcelService';

// ------------------------------------------------------------------ the order being created (not persisted)
export type ContactDraft = { place: Place | null; house: string; name: string; mobile: string };
export type GoodsDraft = { type: GoodsType | ''; other: string; weightId: WeightId | ''; value: string; note: string; helpers: number; protection: boolean; rulesOk: boolean };
const emptyGoods: GoodsDraft = { type: '', other: '', weightId: '', value: '', note: '', helpers: 0, protection: false, rulesOk: false };
const emptyContact: ContactDraft = { place: null, house: '', name: '', mobile: '' };

type Draft = {
  pickup: ContactDraft; drop: ContactDraft; iAmReceiver: boolean;
  when: 'NOW' | 'LATER'; date: string; slot: string;
  vehicle: VehicleId | ''; goods: GoodsDraft; coupon: string; payMethod: PayMethod | ''; upiId: string;
  setPickup: (p: Partial<ContactDraft>) => void; setDrop: (p: Partial<ContactDraft>) => void; set: (p: Partial<Omit<Draft, 'set' | 'setPickup' | 'setDrop' | 'setGoods' | 'reset' | 'prefill'>>) => void;
  setGoods: (g: Partial<GoodsDraft>) => void; reset: (keepPickup?: boolean) => void; prefill: (o: ParcelOrder) => void;
};
const base = { pickup: emptyContact, drop: emptyContact, iAmReceiver: false, when: 'NOW' as const, date: '', slot: '', vehicle: '' as const, goods: emptyGoods, coupon: '', payMethod: '' as const, upiId: '' };
export const useParcelDraft = create<Draft>((set, get) => ({
  ...base,
  setPickup: (p) => set((s) => ({ pickup: { ...s.pickup, ...p } })),
  setDrop: (p) => set((s) => ({ drop: { ...s.drop, ...p } })),
  set: (p) => set(p as any),
  setGoods: (g) => set((s) => ({ goods: { ...s.goods, ...g } })),
  reset: (keepPickup = true) => set({ ...base, pickup: keepPickup ? get().pickup : emptyContact }),
  /** "Book again": same route, vehicle and goods. */
  prefill: (o) => set({ ...base, pickup: { place: o.pickup, house: o.pickup.house, name: o.pickup.name, mobile: o.pickup.mobile },
    drop: { place: o.drop, house: o.drop.house, name: o.drop.name, mobile: o.drop.mobile }, vehicle: o.vehicle,
    goods: { type: o.goods.type, other: o.goods.other ?? '', weightId: o.goods.weightId, value: String(o.goods.valueRupees), note: o.goods.note ?? '', helpers: o.goods.helpers, protection: o.goods.protection, rulesOk: false } }),
}));

// ------------------------------------------------------------------ saved addresses + orders (persisted, encrypted MMKV)
export type SavedAddress = { label: 'Home' | 'Office' | 'Other'; place: Place; house: string; name: string; mobile: string };
type Store = {
  orders: ParcelOrder[]; saved: SavedAddress[];
  create: (i: NewOrderInput & { coupon?: string }) => ParcelOrder;
  tick: (id: string) => void;
  retryTip: (id: string) => void; switchTo: (id: string, v: VehicleId) => void; later: (id: string, at: number) => void;
  cancel: (id: string) => void; rate: (id: string, rating: number, tipPaise: number) => void;
  save: (a: SavedAddress) => void; unsave: (label: SavedAddress['label']) => void;
};
const patch = (set: (f: (s: Store) => Partial<Store>) => void, id: string, fn: (o: ParcelOrder) => ParcelOrder) =>
  set((s) => ({ orders: s.orders.map((o) => (o.id === id ? fn(o) : o)) }));

export const useParcelStore = create<Store>()(persist((set) => ({
  orders: [], saved: [],
  create: (i) => { const o = buildOrder(i); set((s) => ({ orders: [o, ...s.orders].slice(0, 100) })); return o; },
  tick: (id) => set((s) => { let changed = false;
    const orders = s.orders.map((o) => { if (o.id !== id) return o; const n = advanceOrder(o); if (n !== o) changed = true; return n; });
    return changed ? { orders } : s; }),
  retryTip: (id) => patch(set, id, (o) => retryWithTip(o)),
  switchTo: (id, v) => patch(set, id, (o) => switchVehicle(o, v)),
  later: (id, at) => patch(set, id, (o) => scheduleLater(o, at)),
  cancel: (id) => patch(set, id, (o) => cancelOrder(o)),
  rate: (id, rating, tip) => patch(set, id, (o) => rateOrder(o, rating, tip)),
  save: (a) => set((s) => ({ saved: [a, ...s.saved.filter((x) => x.label !== a.label || a.label === 'Other')].slice(0, PARCEL_RULES.MAX_SAVED_ADDRESSES) })),
  unsave: (label) => set((s) => ({ saved: s.saved.filter((x) => x.label !== label) })),
}), { name: 'parcel', storage: createJSONStorage(() => mmkvStorage) }));

export const toPoint = (c: ContactDraft): ParcelPoint => ({ ...c.place!, house: c.house.trim().replace(/\s+/g, ' '), name: c.name.trim().replace(/\s+/g, ' '), mobile: c.mobile });
