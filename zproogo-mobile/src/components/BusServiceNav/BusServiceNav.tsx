import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../theme/ThemeProvider';
import { VoyageIcon } from '../ServiceNav/VoyageIcon';
import { SERVICES, ServiceKey } from '../ServiceNav/services';
import type { ServiceNavItem } from '../ServiceNav/ServiceNav';
import { type } from '../../theme/typography';

type Props<K extends string> = {
  /** Currently selected service: its dot turns red. Omit for none. */
  value?: K;
  onChange: (key: K) => void;
  /** Defaults to the 7 services in components/ServiceNav/services.ts */
  items?: readonly ServiceNavItem<K>[];
  /** Width of one icon cell. Default 84, so ~4 show and the rest scroll in (peeking edge = "swipe me"). */
  cellWidth?: number;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
};

const DOT = 14;
const transparent = (hex: string) => (/^#[0-9a-f]{6}$/i.test(hex) ? `${hex}00` : 'rgba(0,0,0,0)');

/**
 * Bus-page service navbar (port of Voyage_Icons.html): ONE row of icon cells that scrolls sideways and snaps cell by cell,
 * thin dividers between cells, a ring under every label that fills red for the selected service,
 * and soft edge fades that appear only on the side that still has more icons.
 * The Home page keeps its own 4 + 3 grid `ServiceNav`; this one is separate.
 *
 *   <BusServiceNav value="BUS" onChange={(k) => go(k)} />
 */
export function BusServiceNav<K extends string = ServiceKey>({
  value, onChange, items = SERVICES as unknown as readonly ServiceNavItem<K>[], cellWidth = 84, iconSize = 44, style,
}: Props<K>) {
  const { c } = useTheme();
  const ref = useRef<ScrollView>(null);
  const [box, setBox] = useState(0);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);
  const contentW = items.length * cellWidth;

  const update = useCallback((x: number, viewW: number) => {
    setCanLeft(x > 2);
    setCanRight(x < contentW - viewW - 2);
  }, [contentW]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => update(e.nativeEvent.contentOffset.x, e.nativeEvent.layoutMeasurement.width);

  // start with the selected service in view
  useEffect(() => {
    if (!box) return;
    const idx = items.findIndex((i) => i.key === value);
    const x = Math.max(0, Math.min(idx * cellWidth - (box - cellWidth) / 2, contentW - box));
    if (idx > 0) ref.current?.scrollTo({ x: Math.round(x / cellWidth) * cellWidth, animated: false });
    update(idx > 0 ? Math.round(x / cellWidth) * cellWidth : 0, box);
  }, [box]); // eslint-disable-line react-hooks/exhaustive-deps

  const edge = 36;
  return (
    <View style={[{ backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, paddingVertical: 10, marginTop: 12, overflow: 'hidden' }, style]}
      onLayout={(e) => setBox(e.nativeEvent.layout.width - 2)}>
      <ScrollView
        ref={ref} horizontal showsHorizontalScrollIndicator={false}
        snapToInterval={cellWidth} decelerationRate="fast" disableIntervalMomentum
        scrollEventThrottle={16} onScroll={onScroll}
        accessibilityLabel="Services, scroll sideways to see all"
      >
        {items.map((i, idx) => {
          const on = i.key === value;
          return (
            <Pressable key={i.key} onPress={() => onChange(i.key)} accessibilityRole="button" accessibilityLabel={i.label} accessibilityState={{ selected: on }}
              style={{ width: cellWidth, alignItems: 'center', paddingTop: 6, paddingBottom: 4 }}>
              {idx > 0 && <View style={{ position: 'absolute', left: 0, top: '6%', bottom: '6%', width: StyleSheet.hairlineWidth, backgroundColor: c.border }} />}
              <VoyageIcon name={i.icon} size={iconSize} />
              <Text numberOfLines={1} style={{ color: c.text, ...type('label', 12), marginTop: 6 }}>{i.label}</Text>
              <View style={{ width: DOT, height: DOT, borderRadius: DOT / 2, marginTop: 8, borderWidth: 2.5, borderColor: on ? c.brand : c.text, backgroundColor: on ? c.brand : 'transparent' }} />
            </Pressable>
          );
        })}
      </ScrollView>
      {canLeft && <LinearGradient pointerEvents="none" colors={[c.surface, transparent(c.surface)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: edge }} />}
      {canRight && <LinearGradient pointerEvents="none" colors={[transparent(c.surface), c.surface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: edge }} />}
    </View>
  );
}
