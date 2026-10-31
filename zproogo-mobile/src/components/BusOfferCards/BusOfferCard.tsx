import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';
import Clipboard from '@react-native-clipboard/clipboard';
import { BusOfferIcon } from './BusOfferIcon';
import { BusOfferItem, BusOfferTheme } from './busOffers';
import { EASE, useLoop } from '../OfferCards/useLoop';
import { type } from '../../theme/typography';
import { toast } from '../../utils/toast';

export const BUS_CARD_H = 128;

type Theme = { colors: [string, string]; radius: ViewStyle; big?: string };
const r = (a: number, b: number, c: number, d: number): ViewStyle => ({ borderTopLeftRadius: a, borderTopRightRadius: b, borderBottomRightRadius: c, borderBottomLeftRadius: d });
const STD = r(26, 26, 8, 8);
const THEMES: Record<BusOfferTheme, Theme> = {
  sand: { colors: ['#d9822b', '#a23c10'], radius: STD },
  plum: { colors: ['#7447cc', '#3a1f86'], radius: STD },
  navy: { colors: ['#2f6fd6', '#15387f'], radius: STD },
  green: { colors: ['#14a48a', '#0a5b58'], radius: r(6, 24, 6, 24) },
  stone: { colors: ['#dc4a74', '#8c1e4b'], radius: STD },
  dark: { colors: ['#323b52', '#10131d'], radius: STD, big: '#f0c978' },
};

const WHITE = '#fff';

/** speed lines behind the text (CSS .ln) */
function Streak({ top, w, dur, phase }: { top: number; w: number; dur: number; phase: number }) {
  const v = useLoop({ duration: dur, phase });
  return <Animated.View style={{ position: 'absolute', left: 0, top, width: w, height: 2, borderRadius: 2, backgroundColor: WHITE, opacity: 0.2, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [320, -140] }) }] }} />;
}

/** white dashed road along the bottom edge (CSS .card::after) */
function Road({ width }: { width: number }) {
  const v = useLoop({ duration: 900 });
  const n = Math.ceil(width / 40) + 3;
  return (
    <Animated.View style={{ position: 'absolute', left: 0, bottom: 0, height: 10, width: width + 120, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, -40] }) }] }}>
      <Svg width={width + 120} height={10}>
        {Array.from({ length: n }, (_, i) => <Rect key={i} x={i * 40} y={0} width={22} height={10} fill={WHITE} />)}
      </Svg>
    </Animated.View>
  );
}

const CopyIcon = ({ color }: { color: string }) => (
  <Svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <Rect x={9} y={9} width={11} height={11} rx={2} /><Path d="M5 15V6a2 2 0 0 1 2-2h9" />
  </Svg>
);
const CheckIcon = ({ color }: { color: string }) => (
  <Svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);

/** dashed promo chip: tap copies the code, shows "Copied!" for 1.6s */
function CodeChip({ code, pulse }: { code: string; pulse?: boolean }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const v = useLoop({ duration: 2400, pingpong: true, easing: EASE });
  const scale = pulse && !copied ? v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] }) : 1;
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const copy = () => {
    Clipboard.setString(code);
    toast(`Code ${code} copied`, 'success');
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  };
  const color = copied ? '#14182b' : WHITE;
  return (
    <Animated.View style={{ alignSelf: 'flex-start', marginTop: 6, transform: [{ scale: scale as any }] }}>
      <Pressable onPress={copy} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Copy code ${code}`}
        style={({ pressed }) => [s.chip, copied ? { backgroundColor: 'rgba(255,255,255,0.95)', borderStyle: 'solid', borderColor: color } : { borderColor: color }, pressed && { transform: [{ scale: 0.96 }] }]}>
        <Text style={[s.code, { color }]}>{copied ? 'Copied!' : code}</Text>
        {copied ? <CheckIcon color={color} /> : <CopyIcon color={color} />}
      </Pressable>
    </Animated.View>
  );
}

type Props = {
  offer: BusOfferItem;
  width: number;
  /** odd cards pulse their code chip */
  pulse?: boolean;
  onPress?: (offer: BusOfferItem) => void;
  onHold?: () => void;
  onRelease?: () => void;
};

export function BusOfferCard({ offer, width, pulse, onPress, onHold, onRelease }: Props) {
  const t = THEMES[offer.theme];
  const press = useRef(new Animated.Value(0)).current;
  const go = (to: number) => Animated.timing(press, { toValue: to, duration: 200, useNativeDriver: true }).start();
  const lift = press.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });
  return (
    <Pressable
      onPress={() => onPress?.(offer)}
      onPressIn={() => { go(1); onHold?.(); }}
      onPressOut={() => { go(0); onRelease?.(); }}
      accessibilityRole="button"
      accessibilityLabel={`${offer.tag}: ${offer.big} ${offer.small ?? ''}. ${offer.desc}${offer.code ? `. Code ${offer.code}` : ''}`}
    >
      <Animated.View style={[{ width, height: BUS_CARD_H, overflow: 'hidden', transform: [{ translateY: lift }] }, t.radius]}>
        <LinearGradient colors={t.colors} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} style={StyleSheet.absoluteFill} />
        {/* soft light from the top-right corner */}
        <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']} start={{ x: 1, y: 0 }} end={{ x: 0.35, y: 0.55 }} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Streak top={34} w={48} dur={1500} phase={0} />
          <Streak top={66} w={72} dur={1100} phase={0.5 / 1.1} />
          <Streak top={92} w={40} dur={1800} phase={1 / 1.8} />
          <Road width={width} />
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', right: 12, top: 10 }}>
          <BusOfferIcon color={offer.bus} press={press} />
        </View>
        <View style={s.content}>
          <Text style={[s.tag, { color: WHITE }]}>{offer.tag}</Text>
          <View>
            <Text style={[s.big, { color: t.big ?? WHITE }]}>
              {offer.big}{!!offer.small && <Text style={s.small}> {offer.small}</Text>}
            </Text>
            <Text style={[s.desc, { color: WHITE }]}>{offer.desc}</Text>
            {!!offer.code && <CodeChip code={offer.code} pulse={pulse} />}
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  content: { flex: 1, paddingTop: 12, paddingBottom: 16, paddingHorizontal: 14, justifyContent: 'space-between' },
  tag: { ...type('listTitle', 11), opacity: 0.85 },                    // List title: Inter Medium
  big: { ...type('header', 26), lineHeight: 28, letterSpacing: -0.6 },  // Header: Montserrat Bold (display size for the offer number)
  small: { ...type('listTitle', 10.5), letterSpacing: 0 },
  desc: { ...type('label', 11), marginTop: 4, opacity: 0.9 },          // Plain text / label: Inter Regular
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 7, borderWidth: 1.5, borderStyle: 'dashed' },
  code: { ...type('listTitle', 10.5) },
});
