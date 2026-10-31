import type { BusTrip } from '../../api/endpoints';
import { amenityKey, amenityLabel, hourOf, makeOf, seatTypeOf, tripAmenityKeys } from '../../utils/busTrip';
import { AMENITY_OPTION_KEYS, BusFilters, ListField, makeEmptyFilters, SLOT_TILES, SortKey } from './filterConfig';

/** What the filter sheet can offer, derived from the buses that were actually found. */
export type FilterMeta = {
  fareMin: number; fareMax: number;           // rupees, rounded to 10
  durMin: number; durMax: number;             // minutes, rounded to 5
  operators: string[]; boarding: string[]; dropping: string[];
  amenities: { key: string; label: string }[];
};

const uniqSorted = (a: (string | undefined)[]) => [...new Set(a.filter(Boolean) as string[])].sort((x, y) => x.localeCompare(y));

export function buildFilterMeta(trips: BusTrip[]): FilterMeta {
  const fares = trips.map((t) => t.farePaise / 100), durs = trips.map((t) => t.durationMin);
  const fareMin = fares.length ? Math.floor(Math.min(...fares) / 10) * 10 : 0;
  const fareMax = fares.length ? Math.ceil(Math.max(...fares) / 10) * 10 : 0;
  const durMin = durs.length ? Math.floor(Math.min(...durs) / 5) * 5 : 0;
  const durMax = durs.length ? Math.ceil(Math.max(...durs) / 5) * 5 : 0;
  const extra = new Map<string, string>();
  trips.forEach((t) => (t.amenities ?? []).forEach((a) => { const k = amenityKey(a); if (!AMENITY_OPTION_KEYS.includes(k) && k !== 'tracking') extra.set(k, a); }));
  return {
    fareMin, fareMax, durMin, durMax,
    operators: uniqSorted(trips.map((t) => t.operator)),
    boarding: uniqSorted(trips.flatMap((t) => t.boardingPoints ?? [])),
    dropping: uniqSorted(trips.flatMap((t) => t.droppingPoints ?? [])),
    amenities: [...AMENITY_OPTION_KEYS.map((k) => ({ key: k, label: amenityLabel(k) })), ...[...extra].map(([k, raw]) => ({ key: k, label: amenityLabel(k, raw) }))]
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}

const inSlots = (iso: string, slots: string[]) => SLOT_TILES.some((s) => slots.includes(s.key) && s.test(hourOf(iso)));

/** Rules per group. Within a group the choices are OR (any of them); "popular" and "amenities" are AND (must have all). */
const RULES: Record<ListField, (t: BusTrip, sel: string[]) => boolean> = {
  popular: (t, sel) => sel.every((k) => ({
    ac: t.ac, sleeper: t.sleeper, track: t.liveTracking, cancel: !!t.freeCancellation, top: t.rating >= 4, deal: !!t.hasDeal,
  } as Record<string, boolean>)[k] ?? true),
  acTypes: (t, sel) => sel.includes(t.ac ? 'ac' : 'non'),
  seatTypes: (t, sel) => sel.includes(seatTypeOf(t)),
  depSlots: (t, sel) => inSlots(t.departAt, sel),
  arrSlots: (t, sel) => inSlots(t.arriveAt, sel),
  operators: (t, sel) => sel.includes(t.operator),
  ratings: (t, sel) => t.rating >= Math.min(...sel.map(Number)),
  makes: (t, sel) => { const m = makeOf(t); return !!m && sel.includes(m); },
  boarding: (t, sel) => (t.boardingPoints ?? []).some((p) => sel.includes(p)),
  dropping: (t, sel) => (t.droppingPoints ?? []).some((p) => sel.includes(p)),
  amenities: (t, sel) => { const have = tripAmenityKeys(t); return sel.every((k) => have.includes(k)); },
  seats: (t, sel) => sel.some((k) => (k === '15' ? t.seatsLeft >= 15 : k === '5' ? t.seatsLeft >= 5 && t.seatsLeft < 15 : t.seatsLeft < 5)),
};
const LIST_FIELDS = Object.keys(RULES) as ListField[];

export function applyFilters(trips: BusTrip[], f: BusFilters): BusTrip[] {
  return trips.filter((t) => {
    if (f.fareMax !== null && t.farePaise / 100 > f.fareMax) return false;
    if (f.durationMax !== null && t.durationMin > f.durationMax) return false;
    return LIST_FIELDS.every((k) => !f[k].length || RULES[k](t, f[k]));
  });
}

/** True when at least one bus matches this single option (used to dim options that would give 0 results). */
export function optionHasMatch(trips: BusTrip[], field: ListField, key: string): boolean {
  return trips.some((t) => RULES[field](t, [key]));
}

/** Number of filter groups that are switched on (badge on the Filters button). */
export function activeFilterCount(f: BusFilters, meta: FilterMeta): number {
  let n = LIST_FIELDS.filter((k) => f[k].length).length;
  if (f.fareMax !== null && f.fareMax < meta.fareMax) n++;
  if (f.durationMax !== null && f.durationMax < meta.durMax) n++;
  return n;
}

export const isFiltersEmpty = (f: BusFilters) => JSON.stringify(f) === JSON.stringify(makeEmptyFilters());

export function sortTrips(trips: BusTrip[], key: SortKey): BusTrip[] {
  if (key === 'recommended') return trips;
  const by: Record<Exclude<SortKey, 'recommended'>, (a: BusTrip, b: BusTrip) => number> = {
    price: (a, b) => a.farePaise - b.farePaise,
    rating: (a, b) => b.rating - a.rating,
    departure: (a, b) => +new Date(a.departAt) - +new Date(b.departAt),
    fastest: (a, b) => a.durationMin - b.durationMin,
    seats: (a, b) => b.seatsLeft - a.seatsLeft,
  };
  // buses the server marked as "demoted" (women-friendly mode) always stay at the bottom
  return [...trips].sort((a, b) => Number(!!a.demoted) - Number(!!b.demoted) || by[key](a, b));
}
