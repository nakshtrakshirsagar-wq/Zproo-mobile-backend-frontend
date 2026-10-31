import JailMonkey from 'jail-monkey';
import DeviceInfo from 'react-native-device-info';

/**
 * Local tamper signals. These CAN be bypassed by a skilled attacker, so they never make security decisions alone:
 * the server decides using Play Integrity. We use them to warn the user and to switch off risky features
 * (wallet pay, saved travellers) on rooted / hooked devices.
 */
export async function deviceRisk() {
  const [debugged, emulator] = await Promise.all([JailMonkey.isDebuggedMode().catch(() => false), DeviceInfo.isEmulator().catch(() => false)]);
  const r = {
    rooted: JailMonkey.isJailBroken(),
    hooked: JailMonkey.hookDetected(),
    mockLocation: JailMonkey.canMockLocation(),
    debugged: !__DEV__ && debugged,
    emulator: !__DEV__ && emulator,
  };
  return { ...r, risky: r.rooted || r.hooked || r.debugged };
}
