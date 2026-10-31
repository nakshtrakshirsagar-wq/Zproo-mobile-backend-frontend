import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { type } from '../../theme/typography';

export type BottomNavItemProps = {
  label: string;
  focused: boolean;
  /** render the icon in the given colour, e.g. (color) => <Icon name="home" color={color} /> */
  renderIcon: (color: string, focused: boolean) => React.ReactNode;
  onPress: () => void;
  onLongPress?: () => void;
};

/** One tab: icon on top, label below. Active tab: soft rounded highlight behind it and a red icon; the label stays normal black. */
export function BottomNavItem({ label, focused, renderIcon, onPress, onLongPress }: BottomNavItemProps) {
  const { c, isDark } = useTheme();
  const activeBg = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(11,31,58,0.09)';
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: focused }}
      style={[s.item, focused && { backgroundColor: activeBg }]}
    >
      {renderIcon(focused ? c.brand : c.muted, focused)}
      <Text numberOfLines={1} maxFontSizeMultiplier={1.1} style={[s.label, type('label', 12.5), { color: c.text }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  item: { flex: 1, height: '100%', borderRadius: 29, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { lineHeight: 16 }, // Plain text / UI label: Inter Regular (400), 12-13px
});
