/**
 * App configuration. Only NON-SECRET values belong here - everything in the APK can be read by anyone.
 * Secrets (supplier keys, Razorpay secret, JWT keys) live only on the server.
 */
const DEV_API = 'http://localhost:8080/v1'; // Android emulator -> your laptop (zproogo-api). Real phone: use your laptop's LAN IP (and add it to android/app/src/debug/res/xml/network_security_config.xml).

export const Config = {
  API_URL: __DEV__ ? DEV_API : 'https://api.zproogo.com/v1',
  /**
   * Where the BUS screens get their data.
   *   'mock'     - built-in sample buses / seats / stops (src/mock/busMock.ts). Works with no backend.
   *   'fallback' - call the real API first; use the sample data if it fails (no network) or returns no buses.
   *   'api'      - real API only.
   */
  BUS_DATA: 'mock' as 'mock' | 'fallback' | 'api',
  API_HOST: 'api.zproogo.com',
  // SPKI SHA-256 pins (base64) of api.zproogo.com: current key + backup key. See README "SSL pinning".
  PIN_PRIMARY: 'REPLACE_WITH_PRIMARY_SPKI_SHA256_BASE64=',
  PIN_BACKUP: 'REPLACE_WITH_BACKUP_SPKI_SHA256_BASE64=',
  // Google Sign-In: the WEB client id (same value as GOOGLE_WEB_CLIENT_ID on the server)
  GOOGLE_WEB_CLIENT_ID: 'REPLACE.apps.googleusercontent.com',
  // Play Integrity: Google Cloud project NUMBER linked in Play Console
  CLOUD_PROJECT_NUMBER: 0,
  VERSION: '1.0.0',
  SUPPORT_PHONE: '1800-000-0000',
  WOMEN_HELPLINE: '1091',
};
