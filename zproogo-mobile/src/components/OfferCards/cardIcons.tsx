import React from 'react';
import { Animated, StyleSheet } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { EASE, stepBlink, useLoop } from './useLoop';

/** Animated card icons (52x52, drawn on a 24-unit grid like the HTML). `press` = 0..1 while the card is pressed. */
export const ICON = 38;
const K = ICON / 24;
type P = { press: Animated.Value };

function Box({ press, hover, children }: { press: Animated.Value; hover?: boolean; children: React.ReactNode }) {
  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, hover ? 1.15 : 1] });
  const rotate = press.interpolate({ inputRange: [0, 1], outputRange: ['0deg', hover ? '-4deg' : '0deg'] });
  return <Animated.View style={{ width: ICON, height: ICON, transform: [{ scale }, { rotate }] }}>{children}</Animated.View>;
}
const Layer = ({ children }: { children: React.ReactNode }) => (
  <Svg width={ICON} height={ICON} viewBox="0 0 24 24" style={StyleSheet.absoluteFill}>
    <G strokeLinecap="round" strokeLinejoin="round">{children}</G>
  </Svg>
);

/** bus / cab / bike body shake (CSS .a-drive) */
function Drive({ children }: { children: React.ReactNode }) {
  const v = useLoop({ duration: 1000, pingpong: true, easing: EASE });
  return <Animated.View style={{ width: ICON, height: ICON, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -1.5] }) }] }}>{children}</Animated.View>;
}

/** spinning wheel (CSS .wh) */
function Wheel({ cx, cy, r, fill, spoke, hub, hubR, half }: { cx: number; cy: number; r: number; fill: string; spoke: string; hub: string; hubR: number; half: number }) {
  const v = useLoop({ duration: 1100 });
  const d = 2 * r * K;
  const rotate = v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ position: 'absolute', left: (cx - r) * K, top: (cy - r) * K, width: d, height: d, transform: [{ rotate }] }}>
      <Svg width={d} height={d} viewBox={`${cx - r} ${cy - r} ${2 * r} ${2 * r}`}>
        <Circle cx={cx} cy={cy} r={r} fill={fill} />
        <Path d={`M${cx - half} ${cy}h${2 * half}M${cx} ${cy - half}v${2 * half}`} stroke={spoke} strokeWidth={1.1} />
        <Circle cx={cx} cy={cy} r={hubR} fill={hub} />
      </Svg>
    </Animated.View>
  );
}

/** blinking dot / lamp (CSS .lamp, .sign) */
function Blink({ x, y, w, h, color, radius, duration }: { x: number; y: number; w: number; h: number; color: string; radius: number; duration: number }) {
  const v = useLoop({ duration });
  return <Animated.View style={{ position: 'absolute', left: x * K, top: y * K, width: w * K, height: h * K, borderRadius: radius * K, backgroundColor: color, opacity: stepBlink(v) }} />;
}

/** twinkling hotel window (CSS .w) */
function Win({ x, y, delay }: { x: number; y: number; delay: number }) {
  const v = useLoop({ duration: 2400, pingpong: true, delay, easing: EASE });
  return <Animated.View style={{ position: 'absolute', left: x * K, top: y * K, width: 2.6 * K, height: 2.6 * K, borderRadius: 0.5 * K, backgroundColor: '#ffe066', opacity: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.15] }) }} />;
}

export function FlightIcon({ press }: P) {
  const v = useLoop({ duration: 3000, pingpong: true, easing: EASE });
  const tx = v.interpolate({ inputRange: [0, 1], outputRange: [-5 * K, 2 * K] });
  const ty = v.interpolate({ inputRange: [0, 1], outputRange: [5 * K, -2 * K] });
  const trail = v.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });
  return (
    <Box press={press} hover>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: trail }]}>
        <Layer>
          <Path d="M2 20l5-5" stroke="#ffd166" strokeWidth={2} fill="none" />
          <Path d="M1 15l3-3M6 22l3-3" stroke="#ff8fa3" strokeWidth={2} fill="none" />
        </Layer>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: tx }, { translateY: ty }] }]}>
        <Layer>
          <G transform="rotate(45 12 12)">
            <Path fill="#fff" d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
            <Path fill="#ff6b57" d="M10.5 19.5L8.5 21l0 1 3.5-1 3.5 1 0-1-2-1.5z" />
            <Path fill="#ffd166" d="M3 14.6l7-4.4v1.5l-7 4.3zM21 14.6l-7-4.4v1.5l7 4.3z" />
          </G>
        </Layer>
      </Animated.View>
    </Box>
  );
}

export function BusIcon({ press }: P) {
  return (
    <Box press={press}>
      <Drive>
        <Layer>
          <Rect x={2} y={4} width={20} height={13} rx={3} fill="#e63946" />
          <Rect x={4} y={6} width={4.5} height={4.5} rx={1} fill="#bfe9ff" />
          <Rect x={9.8} y={6} width={4.5} height={4.5} rx={1} fill="#bfe9ff" />
          <Rect x={15.6} y={6} width={4.5} height={4.5} rx={1} fill="#bfe9ff" />
          <Path d="M2 13.5h20" stroke="#fff" strokeWidth={1.6} />
          <Circle cx={20} cy={15} r={0.8} fill="#ffe066" />
        </Layer>
        <Wheel cx={7} cy={18} r={2.6} fill="#222" spoke="#fff" hub="#fff" hubR={0.91} half={1.8} />
        <Wheel cx={17} cy={18} r={2.6} fill="#222" spoke="#fff" hub="#fff" hubR={0.91} half={1.8} />
      </Drive>
    </Box>
  );
}

export function TrainIcon({ press }: P) {
  const v = useLoop({ duration: 900, pingpong: true, easing: EASE });
  const tx = v.interpolate({ inputRange: [0, 1], outputRange: [-1.5, 1.5] });
  return (
    <Box press={press}>
      <Animated.View style={{ width: ICON, height: ICON, transform: [{ translateX: tx }] }}>
        <Layer>
          <Path d="M8 18l-2 4M16 18l2 4" stroke="#143d30" strokeWidth={2} fill="none" />
          <Rect x={5} y={2} width={14} height={16} rx={3.5} fill="#ff7a45" />
          <Rect x={7.5} y={5} width={9} height={6} rx={1.2} fill="#bfe9ff" />
          <Path d="M12 5v6" stroke="#ff7a45" strokeWidth={1} />
          <Rect x={5} y={12.5} width={14} height={1.5} fill="#fff" />
        </Layer>
        <Blink x={7.8} y={14.8} w={2.4} h={2.4} radius={1.2} color="#ffe066" duration={1200} />
        <Blink x={13.8} y={14.8} w={2.4} h={2.4} radius={1.2} color="#ffe066" duration={1200} />
      </Animated.View>
    </Box>
  );
}

export function CabIcon({ press }: P) {
  return (
    <Box press={press}>
      <Drive>
        <Layer>
          <Path d="M2.5 17v-3.5l2-5a2 2 0 0 1 1.9-1.3h11.2a2 2 0 0 1 1.9 1.3l2 5V17z" fill="#ffd400" />
          <Path d="M6.5 8.8h11l1.4 3.2H5.1z" fill="#bfe9ff" />
          <Rect x={2.5} y={13.5} width={19} height={1.6} fill="#16161d" opacity={0.25} />
        </Layer>
        <Blink x={9.5} y={2.5} w={5} h={3} radius={1} color="#ff4d4d" duration={1600} />
        <Wheel cx={7.5} cy={17.5} r={2.5} fill="#fff" spoke="#16161d" hub="#16161d" hubR={0.88} half={1.7} />
        <Wheel cx={16.5} cy={17.5} r={2.5} fill="#fff" spoke="#16161d" hub="#16161d" hubR={0.88} half={1.7} />
      </Drive>
    </Box>
  );
}

export function HotelIcon({ press }: P) {
  return (
    <Box press={press} hover>
      <Layer>
        <Rect x={5} y={2.5} width={14} height={19} rx={1.5} fill="#5b6ee1" />
        <Rect x={5} y={2.5} width={14} height={3} rx={1.5} fill="#3a46b5" />
        <Path d="M10 21.5v-4.2a2 2 0 0 1 4 0v4.2z" fill="#ef6f4a" />
      </Layer>
      <Win x={7.8} y={7} delay={0} />
      <Win x={13.6} y={7} delay={600} />
      <Win x={7.8} y={11.5} delay={1200} />
      <Win x={13.6} y={11.5} delay={1800} />
    </Box>
  );
}

export function BikeIcon({ press }: P) {
  return (
    <Box press={press}>
      <Drive>
        <Layer>
          <Path d="M5 17h5l4-7h3l2 7" stroke="#ff9f1c" strokeWidth={2.2} fill="none" />
          <Path d="M8.5 10h4.5" stroke="#fff" strokeWidth={2.2} />
          <Path d="M15 8h3.5" stroke="#ff3d71" strokeWidth={2.2} />
          <Circle cx={12} cy={14} r={1.6} fill="#ffe066" />
        </Layer>
        <Wheel cx={5} cy={17} r={3.2} fill="#fff" spoke="#ff3d71" hub="#ff3d71" hubR={1.12} half={2.4} />
        <Wheel cx={19} cy={17} r={3.2} fill="#fff" spoke="#ff3d71" hub="#ff3d71" hubR={1.12} half={2.4} />
      </Drive>
    </Box>
  );
}

export function ParcelIcon({ press }: P) {
  const v = useLoop({ duration: 2000, pingpong: true, easing: EASE });
  const ty = v.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });
  const rotate = v.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '6deg'] });
  return (
    <Box press={press}>
      <Animated.View style={{ width: ICON, height: ICON, transform: [{ translateY: ty }, { rotate }] }}>
        <Layer>
          <Path d="M12 2l9 5-9 5-9-5z" fill="#ffd166" />
          <Path d="M3 7l9 5v10l-9-5z" fill="#ef476f" />
          <Path d="M21 7l-9 5v10l9-5z" fill="#118ab2" />
          <Path d="M7.5 4.5l9 5" stroke="#fff" strokeWidth={1.8} fill="none" />
          <Path d="M12 12v10" stroke="#fff" strokeWidth={1.2} opacity={0.7} fill="none" />
        </Layer>
      </Animated.View>
    </Box>
  );
}
