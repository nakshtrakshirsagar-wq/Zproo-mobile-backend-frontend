import 'react-native-gesture-handler';
import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer, NavigationContainerRef, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initStorage, loadTokens } from './security/secureStore';
import { initPinning } from './security/pinning';
import { prepareIntegrity } from './security/integrity';
import { deviceRisk } from './security/deviceRisk';
import { ThemeProvider, useTheme } from './theme/ThemeProvider';
import { RootNavigator } from './navigation/RootNavigator';
import { ToastHost } from './components/ToastHost';
import { AppLoader } from './components/AppLoader';
import { Api } from './api/endpoints';
import { useAuth } from './store/auth';
import { Config } from './config';
import { setupPush } from './notifications';
import { toast } from './utils/toast';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: (n, e: any) => n < 2 && (e?.code === 'NETWORK' || e?.status >= 500), staleTime: 30_000 } },
});

const LOADER_MIN_MS = 3000; // minimum time the launch loader is shown

const versionLt = (a: string, b: string) => {
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) { if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) < (y[i] ?? 0); }
  return false;
};

function Shell() {
  const { c, isDark } = useTheme();
  const nav = useRef<NavigationContainerRef<any>>(null);
  const [forceUpdate, setForceUpdate] = useState(false);
  useEffect(() => {
    Api.appConfig().then((cfg) => setForceUpdate(versionLt(Config.VERSION, cfg.minVersion))).catch(() => undefined);
  }, []);
  return (
    <NavigationContainer ref={nav} onReady={() => setupPush(nav)}
      theme={{ ...(isDark ? DarkTheme : DefaultTheme), colors: { ...(isDark ? DarkTheme : DefaultTheme).colors, background: c.bg, card: c.surface, primary: c.brand, text: c.text, border: c.border } }}>
      <RootNavigator forceUpdate={forceUpdate} />
      <ToastHost />
    </NavigationContainer>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [minShown, setMinShown] = useState(false); // keep the loader on screen long enough to be seen
  useEffect(() => { const t = setTimeout(() => setMinShown(true), LOADER_MIN_MS); return () => clearTimeout(t); }, []);
  useEffect(() => {
    (async () => {
      await initStorage();          // encrypted storage (key in Android Keystore)
      await initPinning().catch(() => undefined); // certificate pinning (release builds)
      prepareIntegrity();            // warm up Play Integrity
      const risk = await deviceRisk().catch(() => null);
      if (risk?.risky) toast('This device looks rooted or modified. Some payment features may be limited.', 'error');
      const t = await loadTokens();
      if (t) {
        try { useAuth.getState().setUser(await Api.me()); } catch { useAuth.getState().setUser(null); }
      } else useAuth.getState().setUser(null);
      setReady(true);
    })();
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            {ready && minShown ? <Shell /> : <AppLoader />}
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
