/** Turns GPS coordinates into a city name (used by the Home / Bus header). */

type Reverse = Record<string, any> | null | undefined;

/** Picks the best city-like name out of a BigDataCloud or Nominatim reverse-geocode response. */
export function cityFromGeocode(r: Reverse): string | null {
  if (!r) return null;
  const a = r.address ?? {};
  const pick = r.city || r.locality || a.city || a.town || a.village || a.suburb || a.county || r.principalSubdivision || a.state_district || a.state;
  const name = typeof pick === 'string' ? pick.trim() : '';
  return name ? name.replace(/\s+(Municipal Corporation|City)$/i, '') : null;
}

async function getJson(url: string, ms = 8000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`geocode ${res.status}`);
    return await res.json();
  } finally { clearTimeout(t); }
}

/** Reverse geocodes lat/lng to a city name. Tries BigDataCloud first, then OpenStreetMap Nominatim. */
export async function fetchCityName(lat: number, lng: number): Promise<string> {
  try {
    const n = cityFromGeocode(await getJson(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`));
    if (n) return n;
  } catch { /* fall through to the next provider */ }
  const n = cityFromGeocode(await getJson(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&lat=${lat}&lon=${lng}&accept-language=en`));
  if (!n) throw new Error('Could not work out your city');
  return n;
}
