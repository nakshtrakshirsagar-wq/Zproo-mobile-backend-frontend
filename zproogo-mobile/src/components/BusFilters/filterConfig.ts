/** Filter model for the bus results page (mirrors bus-filters-only.html). */
export type SlotKey = 'early' | 'morning' | 'mid' | 'night';

export const SLOT_TILES: { key: SlotKey; title: string; sub: string; test: (h: number) => boolean }[] = [
  { key: 'early', title: 'Before 6 AM', sub: '12 AM – 6 AM', test: (h) => h < 6 },
  { key: 'morning', title: '6 AM to 12 PM', sub: 'Morning', test: (h) => h >= 6 && h < 12 },
  { key: 'mid', title: '12 PM to 6 PM', sub: 'Afternoon', test: (h) => h >= 12 && h < 18 },
  { key: 'night', title: 'After 6 PM', sub: 'Evening / Night', test: (h) => h >= 18 },
];

export const POPULAR_OPTIONS = [
  { key: 'ac', label: 'A/C buses' }, { key: 'sleeper', label: 'Sleeper buses' }, { key: 'track', label: 'Live tracking' },
  { key: 'cancel', label: 'Free cancellation' }, { key: 'top', label: 'Rated 4.0 and above' }, { key: 'deal', label: 'Hot deals' },
];
export const AC_OPTIONS = [{ key: 'ac', label: 'A/C' }, { key: 'non', label: 'Non A/C' }];
export const SEAT_TYPE_OPTIONS = ['Sleeper', 'Seater', 'Seater / Sleeper'].map((k) => ({ key: k, label: k }));
export const RATING_OPTIONS = [{ key: '4', label: '4.0 and above' }, { key: '3.5', label: '3.5 and above' }, { key: '3', label: '3.0 and above' }];
export const MAKE_OPTIONS = ['Volvo', 'Scania', 'Mercedes', 'Bharat Benz'].map((k) => ({ key: k, label: k }));
export const AMENITY_OPTION_KEYS = ['blanket', 'cctv', 'charging', 'movie', 'light', 'snacks', 'water', 'wifi'];
export const SEATS_OPTIONS = [{ key: '15', label: '15 or more seats' }, { key: '5', label: '5 – 14 seats' }, { key: 'few', label: 'Fewer than 5 seats' }];

export type ListField = 'popular' | 'acTypes' | 'seatTypes' | 'depSlots' | 'arrSlots' | 'operators' | 'ratings' | 'makes' | 'boarding' | 'dropping' | 'amenities' | 'seats';

export type BusFilters = Record<ListField, string[]> & {
  /** Max fare in rupees; null = no limit. */
  fareMax: number | null;
  /** Max journey duration in minutes; null = no limit. */
  durationMax: number | null;
};

export const makeEmptyFilters = (): BusFilters => ({
  popular: [], acTypes: [], seatTypes: [], depSlots: [], arrSlots: [], operators: [], ratings: [], makes: [],
  boarding: [], dropping: [], amenities: [], seats: [], fareMax: null, durationMax: null,
});

export type SortKey = 'recommended' | 'price' | 'rating' | 'departure' | 'fastest' | 'seats';
export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recommended', label: 'Recommended' }, { key: 'price', label: 'Price: low to high' }, { key: 'rating', label: 'Rating: high to low' },
  { key: 'departure', label: 'Departure: earliest' }, { key: 'fastest', label: 'Fastest first' }, { key: 'seats', label: 'Seats available: most' },
];
