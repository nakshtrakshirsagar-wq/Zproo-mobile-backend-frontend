import { initializeSslPinning, isSslPinningAvailable } from 'react-native-ssl-public-key-pinning';
import { Config } from '../config';

/**
 * Certificate (public-key) pinning: the app only talks to a server presenting OUR key.
 * Blocks MITM tools (Burp / Charles / mitmproxy) even if the attacker installs their own CA.
 * Always ship TWO pins (current + backup key) so a certificate rotation never bricks the app.
 */
export async function initPinning() {
  if (__DEV__ || !isSslPinningAvailable()) return;
  if (Config.PIN_PRIMARY.startsWith('REPLACE')) {
    console.warn('SSL pinning NOT active: set PIN_PRIMARY / PIN_BACKUP in src/config.ts before release');
    return;
  }
  await initializeSslPinning({
    [Config.API_HOST]: { includeSubdomains: false, publicKeyHashes: [Config.PIN_PRIMARY, Config.PIN_BACKUP] },
  });
}
