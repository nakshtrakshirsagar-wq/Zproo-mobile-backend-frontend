import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { BottomNavItem } from './BottomNavItem';

/** Extra space under the pill so the bar floats higher above the phone's bottom edge. */
export const BOTTOM_NAV_LIFT = 16;

/** Bottom padding for tab screens' scroll content, so the last item can scroll up above the floating pill (68 pill + 6 + lift + phone inset + a little air). */
export const BOTTOM_NAV_SPACE = 68 + 6 + BOTTOM_NAV_LIFT + 34 + 12;

/**
 * Reusable bottom navigation bar (Home / My Trips / Offers / Help / Account).
 * A rounded floating pill with icon + label per tab, soft rounded highlight behind the active tab, red active icon, normal black labels.
 * Plug it into any tab navigator:  <Tab.Navigator tabBar={(p) => <BottomNav {...p} />}>
 * Icons come from each screen's `tabBarIcon`; it hides itself while the keyboard is open.
 */
export function BottomNav({ state, descriptors, navigation }: BottomTabBarProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [kb, setKb] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKb(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKb(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  if (kb) return null;

  return (
    <View pointerEvents="box-none" style={[s.wrap, { paddingBottom: Math.max(insets.bottom, 10) + BOTTOM_NAV_LIFT }]}>
      <View style={[s.bar, { backgroundColor: c.surface, borderColor: c.border, shadowColor: c.shadow }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : options.title ?? route.name;
          const onPress = () => {
            const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !e.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          return (
            <BottomNavItem
              key={route.key}
              label={label}
              focused={focused}
              renderIcon={(color, f) => options.tabBarIcon?.({ focused: f, color, size: 22 })}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            />
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // transparent + floating over the screen: no rectangle behind the pill, content scrolls underneath it
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingTop: 6, backgroundColor: 'transparent' },
  bar: {
    flexDirection: 'row', alignItems: 'center', height: 68, borderRadius: 34, padding: 5, borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 1, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 10,
  },
});
