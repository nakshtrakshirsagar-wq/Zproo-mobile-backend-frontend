import 'react-native-get-random-values';
import * as Keychain from 'react-native-keychain';
import { MMKV } from 'react-native-mmkv';
import { v4 as uuid } from 'uuid';

/**
 * Tokens live ONLY in the Android Keystore (hardware-backed where available) via react-native-keychain.
 * Non-secret cached data (preferences, recent searches) lives in MMKV, encrypted with a key that is itself in the Keystore.
 * Never use AsyncStorage for anything sensitive.
 */
const TOKENS = 'com.zproogo.session';
const MMKV_KEY = 'com.zproogo.mmkv';

export type Tokens = { accessToken: string; refreshToken: string };
let cached: Tokens | null | undefined;

export async function saveTokens(t: Tokens) {
  cached = t;
  await Keychain.setGenericPassword('session', JSON.stringify(t), {
    service: TOKENS,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
  });
}
export async function loadTokens(): Promise<Tokens | null> {
  if (cached !== undefined) return cached;
  const c = await Keychain.getGenericPassword({ service: TOKENS });
  cached = c ? (JSON.parse(c.password) as Tokens) : null;
  return cached;
}
export async function clearTokens() {
  cached = null;
  await Keychain.resetGenericPassword({ service: TOKENS });
}

export let storage: MMKV;
export async function initStorage() {
  if (storage) return storage;
  const existing = await Keychain.getGenericPassword({ service: MMKV_KEY });
  let key = existing ? existing.password : undefined;
  if (!key) {
    key = uuid().replace(/-/g, '').slice(0, 16); // MMKV accepts up to 16 bytes
    await Keychain.setGenericPassword('mmkv', key, { service: MMKV_KEY, accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  }
  storage = new MMKV({ id: 'zproogo', encryptionKey: key });
  return storage;
}

/** Random id per install (NOT a hardware id - privacy). Sent as X-Install-Id; tokens are bound to it. */
export function installId() {
  let id = storage.getString('installId');
  if (!id) {
    id = uuid();
    storage.set('installId', id);
  }
  return id;
}

/** zustand persist adapter backed by encrypted MMKV */
export const mmkvStorage = {
  getItem: (k: string) => storage?.getString(k) ?? null,
  setItem: (k: string, v: string) => storage?.set(k, v),
  removeItem: (k: string) => storage?.delete(k),
};
