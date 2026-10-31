import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Geolocation from '@react-native-community/geolocation';
import { usePrefs } from '../store/prefs';
import { fetchCityName } from '../utils/liveCity';

export type LiveCityStatus = 'locating' | 'ok' | 'denied' | 'error';
const REFRESH_MS = 60_000; // do not hit GPS / geocoder more often than this

const askPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    return r === PermissionsAndroid.RESULTS.GRANTED;
  }
  return new Promise<boolean>((ok) => Geolocation.requestAuthorization(() => ok(true), () => ok(false)));
};

const getPosition = () => new Promise<{ lat: number; lng: number }>((ok, fail) =>
  Geolocation.getCurrentPosition((p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude }), fail,
    { enableHighAccuracy: false, timeout: 12000, maximumAge: 30000 }));

/**
 * Real-time city of the user. Asks for location permission, reads the GPS, reverse-geocodes it
 * and refreshes whenever the screen is focused or the app comes back to the foreground.
 * The last known city is kept in prefs so the header is never empty while locating.
 */
export function useLiveCity() {
  const lastCity = usePrefs((s) => s.liveCity);
  const [status, setStatus] = useState<LiveCityStatus>('locating');
  const focused = useIsFocused();
  const lastRun = useRef(0);
  const busy = useRef(false);

  const refresh = useCallback(async (force = false) => {
    if (busy.current || (!force && Date.now() - lastRun.current < REFRESH_MS)) return;
    busy.current = true;
    setStatus('locating');
    try {
      if (!(await askPermission())) { setStatus('denied'); return; }
      const { lat, lng } = await getPosition();
      const city = await fetchCityName(lat, lng);
      lastRun.current = Date.now();
      usePrefs.getState().set({ liveCity: city, city });
      setStatus('ok');
    } catch { setStatus('error'); } finally { busy.current = false; }
  }, []);

  useEffect(() => { if (focused) refresh(); }, [focused, refresh]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active' && focused) refresh(); });
    return () => sub.remove();
  }, [focused, refresh]);

  return { city: lastCity, status, retry: () => refresh(true) };
}
