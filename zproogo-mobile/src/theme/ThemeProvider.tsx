import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { light, dark, Colors } from './tokens';
import { usePrefs } from '../store/prefs';

const Ctx = createContext<{ c: Colors; isDark: boolean }>({ c: light, isDark: false });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const mode = usePrefs((s) => s.theme);
  const isDark = mode === 'dark' || (mode === 'system' && system === 'dark');
  const value = useMemo(() => ({ c: isDark ? dark : light, isDark }), [isDark]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useTheme = () => useContext(Ctx);
