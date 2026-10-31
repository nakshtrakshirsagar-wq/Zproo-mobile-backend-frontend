import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Polygon, Rect, Line } from 'react-native-svg';
import { EASE, useLoop } from './useLoop';

export const CARD_H = 128;

/** flight: drifting clouds */
export function Clouds() {
  const items = [
    { top: 20, w: 70, dur: 10000, phase: 0, op: 0.2 },
    { top: 66, w: 46, dur: 7000, phase: 3 / 7, op: 0.14 },
    { top: 100, w: 88, dur: 13000, phase: 6 / 13, op: 0.12 },
  ];
  return <>{items.map((c, i) => <Cloud key={i} {...c} />)}</>;
}
function Cloud({ top, w, dur, phase, op }: { top: number; w: number; dur: number; phase: number; op: number }) {
  const v = useLoop({ duration: dur, phase });
  return <Animated.View style={{ position: 'absolute', left: 0, top, width: w, height: 16, borderRadius: 99, backgroundColor: '#fff', opacity: op, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [330, -110] }) }] }} />;
}

/** train + bike: speed lines */
export function Streaks({ color }: { color: string }) {
  const items = [
    { top: 34, w: 48, dur: 1500, phase: 0 },
    { top: 66, w: 72, dur: 1100, phase: 0.5 / 1.1 },
    { top: 92, w: 40, dur: 1800, phase: 1 / 1.8 },
    { top: 112, w: 60, dur: 1300, phase: 0.2 / 1.3 },
  ];
  return <>{items.map((s, i) => <Streak key={i} color={color} {...s} />)}</>;
}
function Streak({ top, w, dur, phase, color }: { top: number; w: number; dur: number; phase: number; color: string }) {
  const v = useLoop({ duration: dur, phase });
  return <Animated.View style={{ position: 'absolute', left: 0, top, width: w, height: 2, borderRadius: 2, backgroundColor: color, opacity: 0.28, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [320, -140] }) }] }} />;
}

/** hotel: twinkling sparkles */
export function Sparkles() {
  const items = [
    { left: '40%', top: 22, s: 10, delay: 0 },
    { left: '64%', top: 78, s: 7, delay: 800 },
    { left: '18%', top: 96, s: 8, delay: 1600 },
    { left: '80%', top: 30, s: 12, delay: 2200 },
  ];
  return <>{items.map((p, i) => <Spark key={i} {...p} />)}</>;
}
function Spark({ left, top, s, delay }: { left: string; top: number; s: number; delay: number }) {
  const v = useLoop({ duration: 3000, pingpong: true, delay, easing: EASE });
  return (
    <Animated.View style={{ position: 'absolute', left: left as any, top, width: s, height: s, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0, 0.95] }),
      transform: [{ scale: v }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) }] }}>
      <Svg width={s} height={s} viewBox="0 0 100 100"><Polygon points="50,0 62,38 100,50 62,62 50,100 38,62 0,50 38,38" fill="#fff" /></Svg>
    </Animated.View>
  );
}

/** bus: moving road stripe along the bottom edge */
export function RoadStripe({ width }: { width: number }) {
  const v = useLoop({ duration: 900 });
  const n = Math.ceil(width / 40) + 3;
  return (
    <Animated.View style={{ position: 'absolute', left: 0, bottom: 0, height: 10, width: width + 120, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, -40] }) }] }}>
      <Svg width={width + 120} height={10}>
        {Array.from({ length: n }, (_, i) => <Rect key={i} x={i * 40} y={0} width={22} height={10} fill="#2b2100" />)}
      </Svg>
    </Animated.View>
  );
}

/** cab: scrolling yellow / black checker band along the top edge */
export function CheckerBand({ width }: { width: number }) {
  const v = useLoop({ duration: 800 });
  const cols = Math.ceil((width + 56) / 7) + 2;
  const cells: React.ReactNode[] = [];
  for (let j = 0; j < cols; j++) {
    // tile = 14px: top-left dark, top-right yellow, bottom-left yellow, bottom-right dark
    const yellowTop = j % 2 === 1;
    cells.push(<Rect key={j} x={j * 7} y={yellowTop ? 0 : 7} width={7} height={7} fill="#ffd400" />);
  }
  return (
    <Animated.View style={{ position: 'absolute', top: 0, left: -28, height: 14, width: width + 84, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, 28] }) }] }}>
      <Svg width={width + 84} height={14}>{cells}</Svg>
    </Animated.View>
  );
}

/** parcel: packing tape across the middle */
export function Tape({ width }: { width: number }) {
  const v = useLoop({ duration: 1200 });
  const n = Math.ceil(width / 14) + 4;
  return (
    <Animated.View style={{ position: 'absolute', left: 0, top: CARD_H / 2 - 11, height: 22, width: width + 56, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, -28] }) }] }}>
      <Svg width={width + 56} height={22}>
        {Array.from({ length: n }, (_, i) => <Rect key={i} x={i * 14} y={0} width={14} height={22} fill={i % 2 ? 'rgba(255,255,255,0.19)' : 'rgba(255,255,255,0.33)'} />)}
      </Svg>
    </Animated.View>
  );
}

/** train: dotted perforation line */
export function Perforation({ right }: { right: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, right, width: 2 }}>
      <Svg width={2} height={CARD_H}><Line x1={1} y1={0} x2={1} y2={CARD_H} stroke="#eafff6" strokeOpacity={0.6} strokeWidth={2} strokeDasharray="2,2" /></Svg>
    </View>
  );
}

export const fill = StyleSheet.absoluteFill;
