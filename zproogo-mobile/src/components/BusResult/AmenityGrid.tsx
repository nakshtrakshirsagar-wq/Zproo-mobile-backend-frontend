import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { PATHS } from '../Icon';
import { FONT, type } from '../../theme/typography';
import { amenityLabel, tripAmenityKeys } from '../../utils/busTrip';
import type { BusTrip } from '../../api/endpoints';
import { useBusUi } from './busResultTheme';

/** Icon outlines taken from the HTML mock-up (24x24, stroke). */
const ICON: Record<string, string[]> = {
  wifi: ['M5 12.55a11 11 0 0 1 14.08 0', 'M1.42 9a16 16 0 0 1 21.16 0', 'M8.53 16.11a6 6 0 0 1 6.95 0', 'M12 20h.01'],
  charging: ['M13 2L3 14h9l-1 8 10-12h-9l1-8z'],
  water: ['M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z'],
  blanket: ['M2 18v-7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v7', 'M2 14h20', 'M6 9V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3'],
  light: ['M9 18h6', 'M10 22h4', 'M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z'],
  tracking: ['M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z', 'M12 7a3 3 0 1 0 0 6 3 3 0 1 0 0-6z'],
  cctv: [PATHS.cctv],
  snacks: [PATHS.coffee],
  movie: ['M2 5h20v14H2z', 'M10 9l5 3-5 3z'],
};
const FALLBACK = [PATHS.check];

export function AmenityIcon({ name, size = 16, color }: { name: string; size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {(ICON[name] ?? FALLBACK).map((d, i) => <Path key={i} d={d} />)}
    </Svg>
  );
}

/** The "Amenities" panel of a result card: 2-column grid of tinted tiles. */
export function AmenityGrid({ trip }: { trip: BusTrip }) {
  const ui = useBusUi();
  const raw = new Map((trip.amenities ?? []).map((a) => [a.toLowerCase().replace(/[^a-z]/g, ''), a]));
  const keys = tripAmenityKeys(trip);
  if (!keys.length) return <Text style={{ ...type('label', 13), color: ui.muted }}>No amenities listed for this bus.</Text>;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {keys.map((k) => (
        <View key={k} style={{ width: '48%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 12, backgroundColor: ui.redTint }}>
          <AmenityIcon name={k} color={ui.redDark} />
          <Text numberOfLines={1} style={{ flex: 1, fontFamily: FONT.uiMedium, fontSize: 13, color: ui.ink }}>{amenityLabel(k, raw.get(k))}</Text>
        </View>
      ))}
    </View>
  );
}
