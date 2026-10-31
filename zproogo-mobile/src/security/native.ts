import { NativeModules, Platform } from 'react-native';

/**
 * Bridge to our own Kotlin module (android/app/src/main/java/com/zproogo/app/security/ZproogoSecurityModule.kt):
 *  - Play Integrity (Standard API) tokens bound to a request hash
 *  - FLAG_SECURE to block screenshots / screen recording on sensitive screens
 *  - signing-certificate check (detects re-signed / repackaged APKs)
 */
type Native = {
  prepareIntegrity(cloudProjectNumber: number): Promise<boolean>;
  integrityToken(requestHash: string): Promise<string>;
  setSecure(on: boolean): void;
  signingCertSha256(): Promise<string>;
};
const mod: Native | undefined = Platform.OS === 'android' ? NativeModules.ZproogoSecurity : undefined;
export const SecurityNative = mod;
