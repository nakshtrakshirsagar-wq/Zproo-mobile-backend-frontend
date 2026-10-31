import React from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Txt } from '../ui';
import { type } from '../../theme/typography';
import { GirlAvatar } from './GirlAvatar';

/**
 * "Booking for women" bar. Spans the full inner width of the search card (no more small pill
 * hugging the right edge): girl logo on the left, title + hint in the middle, switch on the right.
 */
export function WomenToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const { c } = useTheme();
  // same colour theme as before: surface/border when off, soft rose tint + rose border when on
  const bg = value ? c.dangerBg : c.surface;
  const border = value ? c.rose : c.border;
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel="Booking for women"
      style={[s.bar, { backgroundColor: bg, borderColor: border }]}
    >
      <View style={s.avatarWrap}><GirlAvatar size={46} /></View>
      <View style={{ flex: 1 }}>
        <Txt v="h3" style={{ ...type('emphasis', 15), color: c.text }} numberOfLines={1}>Booking for women</Txt>
        <Txt v="xs" muted numberOfLines={1}>Safer, women-friendly buses</Txt>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: c.brand, false: c.border }} thumbColor="#fff" />
    </Pressable>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap: 12, minHeight: 66, borderRadius: 33, borderWidth: 1.5, paddingVertical: 8, paddingLeft: 8, paddingRight: 12 },
  avatarWrap: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FDE8DE' },
});
