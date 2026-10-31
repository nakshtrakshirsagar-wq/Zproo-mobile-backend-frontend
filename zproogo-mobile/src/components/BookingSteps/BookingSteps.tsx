import React from 'react';
import { Text, View } from 'react-native';
import { useBusUi } from '../BusResult/busResultTheme';
import { ui as uiFont } from '../../theme/typography';

const PRIMARY = '#E11D2E';
export const BUS_STEPS = ['Select seats', 'Board/Drop point', 'Passenger Info'];

/** Progress tabs under the header ("Select seats / Board/Drop point / Passenger Info"). `current` is the 0-based active step; earlier steps look "done". */
export function BookingSteps({ current, labels = BUS_STEPS }: { current: number; labels?: string[] }) {
  const ui = useBusUi();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', justifyContent: 'center', backgroundColor: ui.surface, borderBottomWidth: 1, borderBottomColor: ui.line }}>
      {labels.map((l, i) => (
        <View key={l} accessibilityRole="tab" accessibilityState={{ selected: i === current }}
          style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 4, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: i === current ? PRIMARY : 'transparent' }}>
          <Text numberOfLines={1} style={{ ...uiFont('medium'), fontSize: 13, color: i === current ? PRIMARY : i < current ? ui.ink : ui.muted }}>{l}</Text>
        </View>
      ))}
    </View>
  );
}
