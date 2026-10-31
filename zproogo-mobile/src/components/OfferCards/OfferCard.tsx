import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BikeIcon, BusIcon, CabIcon, FlightIcon, HotelIcon, ICON, ParcelIcon, TrainIcon } from './cardIcons';
import { CARD_H, CheckerBand, Clouds, Perforation, RoadStripe, Sparkles, Streaks, Tape, fill } from './cardFx';
import { EASE, useLoop } from './useLoop';
import { OfferItem, OfferKind } from './offers';
import { head, ui } from '../../theme/typography';

type Theme = {
  color: string;
  radius: ViewStyle;
  bg?: string;
  gradient?: { colors: string[]; locations?: number[]; start: { x: number; y: number }; end: { x: number; y: number } };
  chipBorder?: string;
};
const r = (a: number, b: number, c: number, d: number): ViewStyle => ({ borderTopLeftRadius: a, borderTopRightRadius: b, borderBottomRightRadius: c, borderBottomLeftRadius: d });

const THEMES: Record<OfferKind, Theme> = {
  flight: { color: '#fff', radius: r(14, 14, 14, 14), chipBorder: '#ffffffaa', gradient: { colors: ['#1b2a6b', '#3a56d4', '#7aa2ff'], locations: [0, 0.7, 1], start: { x: 0.3, y: 0 }, end: { x: 0.7, y: 1 } } },
  bus: { color: '#2b2100', radius: r(26, 26, 8, 8), bg: '#ffc531' },
  train: { color: '#eafff6', radius: r(6, 24, 6, 24), bg: '#0f7a5a' },
  cab: { color: '#fff', radius: r(20, 20, 20, 20), bg: '#16161d' },
  hotel: { color: '#4a1f10', radius: r(20, 20, 20, 20), gradient: { colors: ['#f4d9c4', '#e9a98b'], start: { x: 0, y: 0 }, end: { x: 0, y: 1 } } },
  bike: { color: '#142200', radius: r(20, 20, 20, 20), bg: '#c8f169' },
  parcel: { color: '#33210f', radius: r(6, 6, 6, 6), bg: '#c89a64' },
};

const ICONS = { flight: FlightIcon, bus: BusIcon, train: TrainIcon, cab: CabIcon, hotel: HotelIcon, bike: BikeIcon, parcel: ParcelIcon };

type Props = {
  offer: OfferItem;
  width: number;
  /** colour of the screen behind the cards (flight ticket notches are cut out of it) */
  notchColor: string;
  /** even cards pulse their code chip */
  pulse?: boolean;
  onPress?: (offer: OfferItem) => void;
  onHold?: () => void;
  onRelease?: () => void;
};

export function OfferCard({ offer, width, notchColor, pulse, onPress, onHold, onRelease }: Props) {
  const t = THEMES[offer.kind];
  const Icon = ICONS[offer.kind];
  const press = useRef(new Animated.Value(0)).current;
  const go = (to: number) => Animated.timing(press, { toValue: to, duration: 200, useNativeDriver: true }).start();
  const lift = press.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });

  const kind = offer.kind;
  const bigSize = kind === 'train' ? 22 : 26;
  const iconPos: ViewStyle =
    kind === 'train' ? { right: 16, bottom: 10 } : kind === 'bike' ? { right: 16, top: 42 } : { right: 12, top: 10 };
  const chipStyle: ViewStyle = kind === 'parcel'
    ? { backgroundColor: '#fff6e6', borderColor: t.color, borderWidth: 2 }
    : { borderColor: t.chipBorder ?? t.color, borderWidth: 1.5 };

  return (
    <Pressable
      onPress={() => onPress?.(offer)}
      onPressIn={() => { go(1); onHold?.(); }}
      onPressOut={() => { go(0); onRelease?.(); }}
      accessibilityRole="button"
      accessibilityLabel={`${offer.tag}: ${offer.big} ${offer.small ?? ''}. ${offer.desc}${offer.code ? `. Code ${offer.code}` : ''}`}
    >
      <Animated.View style={[{ width, height: CARD_H, overflow: 'hidden', backgroundColor: t.bg, transform: [{ translateY: lift }] }, t.radius]}>
        {t.gradient && <LinearGradient colors={t.gradient.colors} locations={t.gradient.locations} start={t.gradient.start} end={t.gradient.end} style={fill} />}

        {/* ambient effects, behind the text */}
        <View pointerEvents="none" style={fill}>
          {kind === 'flight' && <Clouds />}
          {kind === 'train' && <><Streaks color="#eafff6" /><Perforation right={58} /></>}
          {kind === 'bike' && (
            <>
              <View style={{ position: 'absolute', right: -30, top: -20, width: 100, height: 190, backgroundColor: '#142200', transform: [{ rotate: '18deg' }] }} />
              <Streaks color="#142200" />
            </>
          )}
          {kind === 'hotel' && (
            <>
              <View style={{ position: 'absolute', right: -26, bottom: -40, width: 130, height: 170, borderTopLeftRadius: 70, borderTopRightRadius: 70, backgroundColor: '#4a1f10', opacity: 0.12 }} />
              <Sparkles />
            </>
          )}
          {kind === 'bus' && <RoadStripe width={width} />}
          {kind === 'cab' && <CheckerBand width={width} />}
          {kind === 'parcel' && <Tape width={width} />}
        </View>

        {/* flight ticket notches */}
        {kind === 'flight' && (
          <>
            <View pointerEvents="none" style={{ position: 'absolute', top: CARD_H / 2 - 11, left: -11, width: 22, height: 22, borderRadius: 11, backgroundColor: notchColor }} />
            <View pointerEvents="none" style={{ position: 'absolute', top: CARD_H / 2 - 11, right: -11, width: 22, height: 22, borderRadius: 11, backgroundColor: notchColor }} />
          </>
        )}

        {/* icon */}
        <View pointerEvents="none" style={[{ position: 'absolute', width: ICON, height: ICON }, iconPos]}>
          <Icon press={press} />
        </View>

        {/* text */}
        <View style={s.content}>
          <Text style={[s.tag, { color: t.color }, kind === 'cab' && { marginTop: 8 }]}>{offer.tag}</Text>
          <View>
            <Text style={[s.big, { color: kind === 'cab' ? '#ffd400' : t.color, fontSize: bigSize, lineHeight: bigSize }]}>
              {offer.big}
              {!!offer.small && <Text style={s.small}>{offer.newline ? '\n' : ' '}{offer.small}</Text>}
            </Text>
            <Text style={[s.desc, { color: t.color }]}>{offer.desc}</Text>
            {!!offer.code && (pulse
              ? <PulsingChip code={offer.code} color={t.color} style={chipStyle} />
              : <View style={[s.chip, chipStyle]}><Text style={[s.code, { color: t.color }]}>{offer.code}</Text></View>)}
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

/** promo code chip that gently pulses (CSS .code pulse) */
function PulsingChip({ code, color, style }: { code: string; color: string; style: ViewStyle }) {
  const v = useLoop({ duration: 2400, pingpong: true, easing: EASE });
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });
  return (
    <Animated.View style={[s.chip, style, { transform: [{ scale }] }]}>
      <Text style={[s.code, { color }]}>{code}</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  content: { flex: 1, paddingVertical: 12, paddingHorizontal: 14, justifyContent: 'space-between' },
  tag: { fontSize: 11, ...ui('semi'), opacity: 0.85 },
  big: { ...head('bold'), letterSpacing: -0.6 },
  small: { fontSize: 12, ...ui('semi'), letterSpacing: 0 },
  desc: { fontSize: 11, marginTop: 4, opacity: 0.9, ...ui('regular') },
  chip: { alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 7, borderStyle: 'dashed', marginTop: 6 },
  code: { fontSize: 10.5, ...ui('semi') },
});
