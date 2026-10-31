import { create } from 'zustand';

export type Mode = 'BUS' | 'HOTEL' | 'FLIGHT' | 'TRAIN' | 'CAB';
export type HoldInfo = { holdId: string; mode: Mode; expiresAt: string; basePaise: number; taxPaise: number; summary: any; supplier?: string; needsBlock?: boolean };

/**
 * The booking in progress (one at a time). Holds the server hold + the passenger draft
 * collected on the details screen, used by Checkout to create the booking.
 */
type BookingDraft = {
  hold: HoldInfo | null;
  womenMode: boolean;
  pax: any[];
  contact: { mobile: string; email: string } | null;
  addOns: string[];
  extras: { flightSeatIds?: string[]; payOption?: 'PREPAID' | 'PAY_AT_HOTEL' | 'PAY_TO_DRIVER'; specialRequests?: string; gstin?: string;
    cab?: { passengers: number; luggage: number; pickupNote?: string };
    emergencyContact?: { name: string; mobile: string; relation: string }; declarationAccepted?: boolean; international?: boolean;
    fareKey?: string; paxCounts?: { adults: number; children: number; infants: number } };
  setHold: (h: HoldInfo | null, womenMode?: boolean) => void;
  /** After the supplier reserves the seats: new expiry and (possibly changed) price. */
  updateHold: (p: Partial<HoldInfo>) => void;
  setDetails: (d: Partial<Pick<BookingDraft, 'pax' | 'contact' | 'addOns' | 'extras'>>) => void;
  reset: () => void;
};

const empty = { hold: null, womenMode: false, pax: [], contact: null, addOns: [], extras: {} };
export const useBooking = create<BookingDraft>((set) => ({
  ...empty,
  setHold: (hold, womenMode = false) => set({ ...empty, hold, womenMode }),
  updateHold: (p) => set((s) => ({ hold: s.hold ? { ...s.hold, ...p } : s.hold })),
  setDetails: (d) => set((s) => ({ ...s, ...d, extras: { ...s.extras, ...(d.extras ?? {}) } })),
  reset: () => set(empty),
}));
