import { Linking, NativeModules, PermissionsAndroid, Platform } from 'react-native';

type Native = { isEnabled(): Promise<boolean>; enable(): Promise<boolean> };
const mod: Native | undefined = Platform.OS === 'android' ? NativeModules.ZproogoLocation : undefined;

/**
 * "Allow location": asks the app permission, then turns the phone's Location (GPS) setting ON.
 * Android shows Google's "turn on device location" dialog; tapping OK switches it on without leaving the app.
 * Falls back to opening the phone's Location settings if that dialog is not available.
 * Never throws - the caller just continues into the app.
 */
export async function allowAndEnableLocation(): Promise<{ permission: boolean; enabled: boolean }> {
  if (Platform.OS !== 'android') return { permission: true, enabled: true };
  let permission = false;
  try {
    // Android 12+ lets the user pick "Precise" or "Approximate": ask for both, accept either.
    const P = PermissionsAndroid.PERMISSIONS;
    const r = await PermissionsAndroid.requestMultiple([P.ACCESS_FINE_LOCATION, P.ACCESS_COARSE_LOCATION]);
    permission = r[P.ACCESS_FINE_LOCATION] === 'granted' || r[P.ACCESS_COARSE_LOCATION] === 'granted';
  } catch { /* ignore */ }
  if (!permission) return { permission: false, enabled: false };

  let enabled = false;
  try {
    if (mod) {
      await new Promise((ok) => setTimeout(ok, 350)); // let the permission dialog finish closing first
      enabled = await mod.enable();
    }
    else { await Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS'); }
  } catch {
    try { await Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS'); } catch { /* ignore */ }
  }
  return { permission, enabled };
}
