import { PermissionsAndroid, Platform } from 'react-native';
import { getApp } from '@react-native-firebase/app';
import { getMessaging, getToken, onMessage, onNotificationOpenedApp, getInitialNotification, onTokenRefresh } from '@react-native-firebase/messaging';
import type { NavigationContainerRef } from '@react-navigation/native';
import { Api } from './api/endpoints';
import { toast } from './utils/toast';

/**
 * Push notifications (FCM). Requires android/app/google-services.json (see README).
 * Every step is wrapped so the app still runs if Firebase is not configured yet.
 */
export async function setupPush(nav: React.RefObject<NavigationContainerRef<any> | null>) {
  try {
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }
    const m = getMessaging(getApp());
    const token = await getToken(m);
    await Api.registerDevice(token).catch(() => undefined);
    onTokenRefresh(m, (t) => { Api.registerDevice(t).catch(() => undefined); });
    onMessage(m, (msg) => { if (msg.notification?.title) toast(`${msg.notification.title}: ${msg.notification.body ?? ''}`); });
    const open = (data?: Record<string, any>) => { if (data?.bookingId) nav.current?.navigate(data.screen === 'CabRide' ? 'CabRide' : 'BookingDetails', { id: data.bookingId }); };
    onNotificationOpenedApp(m, (msg) => open(msg.data));
    const initial = await getInitialNotification(m);
    if (initial) setTimeout(() => open(initial.data), 800);
  } catch {
    await Api.registerDevice().catch(() => undefined); // still register the device without push
  }
}
