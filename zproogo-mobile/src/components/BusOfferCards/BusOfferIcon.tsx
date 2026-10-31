import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { EASE, useLoop } from '../OfferCards/useLoop';

/** Little bus (52x52, 24-unit grid like the HTML): body shakes, wheels spin, grows a little while the card is pressed. */
export const BUS_ICON = 38;
const K = BUS_ICON / 24;

function Wheel({ cx }: { cx: number }) {
  const v = useLoop({ duration: 1100 });
  const r = 2.6;
  const d = 2 * r * K;
  const rotate = v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ position: 'absolute', left: (cx - r) * K, top: (18 - r) * K, width: d, height: d, transform: [{ rotate }] }}>
      <Svg width={d} height={d} viewBox={`${cx - r} ${18 - r} ${2 * r} ${2 * r}`}>
        <Circle cx={cx} cy={18} r={r} fill="#222" />
        <Path d={`M${cx - 1.8} 18h3.6M${cx} 16.2v3.6`} stroke="#fff" strokeWidth={1.1} strokeLinecap="round" />
        <Circle cx={cx} cy={18} r={0.91} fill="#fff" />
      </Svg>
    </Animated.View>
  );
}

export function BusOfferIcon({ color, press }: { color: string; press: Animated.Value }) {
  const drive = useLoop({ duration: 1000, pingpong: true, easing: EASE });
  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const rotate = press.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-4deg'] });
  const bump = drive.interpolate({ inputRange: [0, 1], outputRange: [0, -1.5] });
  return (
    <Animated.View style={{ width: BUS_ICON, height: BUS_ICON, transform: [{ scale }, { rotate }] }}>
      <Animated.View style={{ width: BUS_ICON, height: BUS_ICON, transform: [{ translateY: bump }] }}>
        <Svg width={BUS_ICON} height={BUS_ICON} viewBox="0 0 24 24" style={StyleSheet.absoluteFill}>
          <G strokeLinecap="round" strokeLinejoin="round">
            <Rect x={2} y={4} width={20} height={13} rx={3} fill={color} />
            <Rect x={4} y={6} width={4.5} height={4.5} rx={1} fill="#9cc4ea" />
            <Rect x={9.8} y={6} width={4.5} height={4.5} rx={1} fill="#9cc4ea" />
            <Rect x={15.6} y={6} width={4.5} height={4.5} rx={1} fill="#9cc4ea" />
            <Path d="M2 13.5h20" stroke="#fff" strokeWidth={1.6} />
            <Circle cx={20} cy={15} r={0.8} fill="#f0dca0" />
          </G>
        </Svg>
        <View style={StyleSheet.absoluteFill}>
          <Wheel cx={7} />
          <Wheel cx={17} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}
