import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { VoyageIcon, VoyageName } from './VoyageIcon';
import { SERVICES, ServiceKey } from './services';
import { ui } from '../../theme/typography';

export type ServiceNavItem<K extends string = ServiceKey> = { key: K; label: string; icon: VoyageName };

type Props<K extends string> = {
  /** Currently active service . Omit for none. */
  value?: K;
  /** Called with the tapped service key, e.g. 'TRAIN'. */
  onChange: (key: K) => void;
  /** Defaults to all 7 services from components/ServiceNav/services.ts. Pass a subset or your own list to customise. */
  items?: readonly ServiceNavItem<K>[];
  /** Icons per row; remaining icons are centred on the next row. Default 4 (so 4 + 3). */
  perRow?: number;
  /** Icon size in px. Default 44. */
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Reusable service navigation bar (Bus, Train, Flight, Hotel, Cab, Parcel, Bike) with Voyage icons.
 * Theme aware (light / dark). Use it on Home, a landing screen, a bottom sheet, anywhere:
 *
 *   <ServiceNav value="BUS" onChange={(k) => go(k)} />
 *   <ServiceNav items={SERVICES.filter(s => s.key !== 'BIKE')} perRow={3} iconSize={36} onChange={...} />
 */
export function ServiceNav<K extends string = ServiceKey>({
  value, onChange, items = SERVICES as unknown as readonly ServiceNavItem<K>[], perRow = 4, iconSize = 44, style,
}: Props<K>) {
  const { c } = useTheme();
  const rows: ServiceNavItem<K>[][] = [];
  for (let i = 0; i < items.length; i += perRow) rows.push(items.slice(i, i + perRow));
  return (
    <View style={[{ backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, paddingVertical: 10, marginTop: 12 }, style]}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', justifyContent: 'center', marginTop: r ? 6 : 0 }}>
          {row.map((i, idx) => {
            const on = i.key === value;
            return (
              <Pressable key={i.key} onPress={() => onChange(i.key)} accessibilityRole="button" accessibilityLabel={i.label} accessibilityState={{ selected: on }}
                style={{ width: `${100 / perRow}%`, alignItems: 'center', paddingVertical: 6, borderLeftWidth: idx ? StyleSheet.hairlineWidth : 0, borderLeftColor: c.border }}>
                <VoyageIcon name={i.icon} size={iconSize} />
                <Text numberOfLines={1} style={{ color: c.text, fontSize: 12, ...ui('medium'), marginTop: 6 }}>{i.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
