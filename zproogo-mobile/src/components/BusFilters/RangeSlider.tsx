import React, { useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, View } from 'react-native';

type Props = { min: number; max: number; step: number; value: number; onChange: (v: number) => void; color: string; trackColor: string };

/** Single-thumb slider (no native dependency). Drag the thumb or tap anywhere on the track. */
export function RangeSlider({ min, max, step, value, onChange, color, trackColor }: Props) {
  const [w, setW] = useState(0);
  const live = useRef({ min, max, step, w, onChange, value });
  live.current = { min, max, step, w, onChange, value };
  const startX = useRef(0);

  const toValue = (x: number) => {
    const { min: lo, max: hi, step: st, w: width } = live.current;
    if (width <= 0 || hi <= lo) return lo;
    const raw = lo + (Math.max(0, Math.min(width, x)) / width) * (hi - lo);
    return Math.max(lo, Math.min(hi, Math.round(raw / st) * st));
  };
  const xOf = (v: number) => (live.current.max > live.current.min ? ((v - live.current.min) / (live.current.max - live.current.min)) * live.current.w : 0);

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => { startX.current = e.nativeEvent.locationX; live.current.onChange(toValue(startX.current)); },
    onPanResponderMove: (_e, g) => live.current.onChange(toValue(startX.current + g.dx)),
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const x = Math.max(0, Math.min(w, xOf(value)));
  return (
    <View style={{ height: 36, justifyContent: 'center' }} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} {...pan.panHandlers}>
      <View pointerEvents="none" style={{ height: 4, borderRadius: 2, backgroundColor: trackColor }}>
        <View style={{ width: x, height: 4, borderRadius: 2, backgroundColor: color }} />
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', left: x - 10, width: 20, height: 20, borderRadius: 10, backgroundColor: color, borderWidth: 3, borderColor: '#fff',
        shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3 }} />
    </View>
  );
}
