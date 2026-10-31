import type { BusTrip } from '../api/endpoints';

/** Small helpers that read a BusTrip the same way for the result card and for the filters. */
export type SeatType = 'Sleeper' | 'Seater' | 'Seater / Sleeper';

const ALIAS: Record<string, string> = {
  wifi: 'wifi', freewifi: 'wifi', wireless: 'wifi',
  charging: 'charging', chargingpoint: 'charging', usb: 'charging', usbcharging: 'charging',
  water: 'water', waterbottle: 'water', blanket: 'blanket',
  readinglight: 'light', light: 'light',
  livetracking: 'tracking', gps: 'tracking', tracking: 'tracking',
  cctv: 'cctv', snacks: 'snacks', snack: 'snacks', movie: 'movie', movies: 'movie', entertainment: 'movie',
};
export const AMENITY_LABEL: Record<string, string> = {
  wifi: 'WiFi', charging: 'Charging point', water: 'Water bottle', blanket: 'Blanket', light: 'Reading light',
  tracking: 'Live tracking', cctv: 'CCTV', snacks: 'Snacks', movie: 'Movie',
};

/** "Wi-Fi", "WiFi", "Free WiFi" -> "wifi"; unknown names are just lower-cased letters. */
export function amenityKey(raw: string): string {
  const n = raw.toLowerCase().replace(/[^a-z]/g, '');
  return ALIAS[n] ?? n;
}
export const amenityLabel = (key: string, raw?: string) => AMENITY_LABEL[key] ?? raw ?? key;

/** All amenities of a trip as canonical keys (liveTracking / cctv flags count too). */
export function tripAmenityKeys(t: BusTrip): string[] {
  const s = new Set<string>((t.amenities ?? []).map(amenityKey));
  if (t.liveTracking) s.add('tracking');
  if (t.cctv) s.add('cctv');
  return [...s];
}

export function seatTypeOf(t: BusTrip): SeatType {
  if (/seater\s*[/&+-]\s*sleeper|sleeper\s*[/&+-]\s*seater/i.test(t.busType)) return 'Seater / Sleeper';
  return t.sleeper ? 'Sleeper' : 'Seater';
}

const MAKES = [['Volvo', /volvo/i], ['Scania', /scania/i], ['Mercedes', /mercedes/i], ['Bharat Benz', /bharat\s*benz/i]] as const;
export function makeOf(t: BusTrip): string | undefined {
  if (t.busMake) return t.busMake;
  const hay = `${t.busType} ${t.operator}`;
  if (/bharat\s*benz/i.test(hay)) return 'Bharat Benz';
  return MAKES.find(([, re]) => re.test(hay))?.[0];
}

export const hourOf = (iso: string) => new Date(iso).getHours();
