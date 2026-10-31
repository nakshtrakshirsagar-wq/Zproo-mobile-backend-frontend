import React, { useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, TextInput, View } from 'react-native';
import dayjs from 'dayjs';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Path, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';
import { Icon, IconName } from './Icon';
import { Card, Row, Sheet, Txt, ScanLine, Button } from './ui';
import { ymd } from '../utils/format';

export const Logo = ({ height = 30 }: { height?: number }) => (
  <Image source={require('../assets/logo.png')} style={{ height, width: height * 3 }} resizeMode="contain" accessibilityLabel="Zproogo" />
);

/**
 * From/To/Date/Passengers card with swap button (Home, Bus, Train, Flight search).
 * Optional: `right` on a row (extra controls before the chevron, e.g. Today / Tomorrow buttons)
 * and `footer` (a line at the bottom of the card, right-aligned, e.g. the "Booking for women" switch).
 */
export function SearchCard({ rows, onSwap, footer }: {
  rows: { icon: IconName; label: string; value: string; onPress: () => void; chevron?: boolean; right?: React.ReactNode }[];
  onSwap?: () => void; footer?: React.ReactNode;
}) {
  const { c } = useTheme();
  // Swap animation: the swap button spins half a turn while the From value slides down and the To value
  // slides up into each other's place; the values are exchanged at the end and the motion resets.
  const anim = useRef(new Animated.Value(0)).current;
  const busy = useRef(false);
  const [rowH, setRowH] = useState(52);
  const spin = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const pop = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.18, 1] });
  const fade = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.35, 1] });
  const down = anim.interpolate({ inputRange: [0, 1], outputRange: [0, rowH] });
  const up = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -rowH] });
  const doSwap = () => {
    if (!onSwap || busy.current) return;
    busy.current = true;
    Animated.timing(anim, { toValue: 1, duration: 320, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(() => {
      onSwap();
      anim.setValue(0);
      busy.current = false;
    });
  };
  const slide = (i: number) => (onSwap && i === 0 ? { transform: [{ translateY: down }], opacity: fade } : onSwap && i === 1 ? { transform: [{ translateY: up }], opacity: fade } : undefined);
  return (
    <Card style={{ paddingVertical: 4 }}>
      {rows.map((r, i) => (
        <Pressable key={r.label} onPress={r.onPress} onLayout={i === 0 ? (e) => setRowH(e.nativeEvent.layout.height) : undefined}
          style={[st.fld, { borderBottomColor: c.border, borderBottomWidth: i < rows.length - 1 || footer ? 1 : 0 }]} accessibilityRole="button" accessibilityLabel={r.label}>
          <Animated.View style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }, slide(i)]}>
            <Icon name={r.icon} size={17} color={c.brand} />
            <View style={{ flex: 1 }}><Txt v="xs" muted>{r.label}</Txt><Txt v="h3">{r.value}</Txt></View>
          </Animated.View>
          {r.right}
          {r.chevron && <Icon name="chev" size={15} color={c.muted} />}
        </Pressable>
      ))}
      {!!footer && <View style={{ alignSelf: 'stretch', paddingTop: 10, paddingBottom: 6 }}>{footer}</View>}
      {onSwap && (
        <Animated.View style={[st.swap, { backgroundColor: c.brand, transform: [{ rotate: spin }, { scale: pop }] }]}>
          <Pressable onPress={doSwap} accessibilityLabel="Swap" accessibilityRole="button" hitSlop={8} style={st.swapHit}><Icon name="swap" size={14} color="#fff" /></Pressable>
        </Animated.View>
      )}
    </Card>
  );
}

/** Generic searchable list picker (cities, stations, airports). */
export function PickerSheet<T>({ visible, onClose, title, items, label, sub, onPick }: { visible: boolean; onClose: () => void; title: string; items: T[];
  label: (t: T) => string; sub?: (t: T) => string; onPick: (t: T) => void }) {
  const { c } = useTheme();
  const [q, setQ] = useState('');
  const list = useMemo(() => items.filter((i) => (label(i) + ' ' + (sub?.(i) ?? '')).toLowerCase().includes(q.toLowerCase())).slice(0, 40), [items, q, label, sub]);
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View style={[st.search, { borderColor: c.border, backgroundColor: c.surface }]}>
        <Icon name="search" size={15} color={c.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Search" placeholderTextColor={c.muted} style={{ flex: 1, color: c.text, padding: 0 }} autoFocus />
      </View>
      {list.map((i) => (
        <Pressable key={label(i) + (sub?.(i) ?? '')} onPress={() => { onPick(i); onClose(); setQ(''); }} style={[st.item, { borderBottomColor: c.border }]}>
          <Txt v="h3">{label(i)}</Txt>{sub && <Txt v="small" muted>{sub(i)}</Txt>}
        </Pressable>
      ))}
    </Sheet>
  );
}

/** Month calendar (optionally with a price per day, like the fare calendar). */
export function CalendarSheet({ visible, onClose, value, onPick, minDate, prices, title = 'Select date' }: { visible: boolean; onClose: () => void; value: string;
  onPick: (d: string) => void; minDate?: string; prices?: Record<string, number>; title?: string }) {
  const { c } = useTheme();
  const [month, setMonth] = useState(dayjs(value).startOf('month'));
  const min = dayjs(minDate ?? ymd(new Date()));
  const days = Array.from({ length: month.daysInMonth() }, (_, i) => month.add(i, 'day'));
  const pad = month.day();
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <Pressable onPress={() => setMonth(month.subtract(1, 'month'))} disabled={!month.isAfter(min, 'month')}><Icon name="back" color={c.text} /></Pressable>
        <Txt v="h3">{month.format('MMMM YYYY')}</Txt>
        <Pressable onPress={() => setMonth(month.add(1, 'month'))}><Icon name="chev" color={c.text} /></Pressable>
      </Row>
      <View style={st.grid}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <Txt key={i} v="xs" muted center style={st.cell}>{d}</Txt>)}
        {Array.from({ length: pad }).map((_, i) => <View key={'p' + i} style={st.cell} />)}
        {days.map((d) => {
          const k = ymd(d); const past = d.isBefore(min, 'day'); const on = k === value;
          return (
            <Pressable key={k} disabled={past} onPress={() => { onPick(k); onClose(); }}
              style={[st.cell, st.day, on && { backgroundColor: c.brand }, past && { opacity: 0.3 }]}>
              <Txt v="h3" color={on ? '#fff' : c.text}>{d.date()}</Txt>
              {prices?.[k] != null && <Txt v="xs" color={on ? '#fff' : c.success} style={{ fontSize: 8 }}>₹{(prices[k] / 100000).toFixed(1)}k</Txt>}
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

/** Horizontal date strip (bus list, flight fare strip, nearby dates). */
export function DateStrip({ dates, value, onPick, sub }: { dates: string[]; value?: string; onPick: (d: string) => void; sub?: (d: string) => string | undefined }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 6, marginVertical: 6 }}>
      {dates.map((d) => {
        const on = d === value;
        return (
          <Pressable key={d} onPress={() => onPick(d)} style={[st.strip, { backgroundColor: on ? c.brand : c.surface, borderColor: on ? c.brand : c.border }]}>
            <Txt v="xs" color={on ? '#fff' : c.muted}>{dayjs(d).format('ddd')}</Txt>
            <Txt v="h3" color={on ? '#fff' : c.text}>{dayjs(d).format('D')}</Txt>
            {sub?.(d) && <Txt v="xs" color={on ? '#fff' : c.success} style={{ fontSize: 9 }}>{sub(d)}</Txt>}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Ticket / voucher QR with the animated scanner line (whiteboard). */
export function QrBlock({ value, size = 130 }: { value: string; size?: number }) {
  return (
    <View style={{ alignSelf: 'center', padding: 8, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#D9E8F3', overflow: 'hidden' }}>
      <QRCode value={value} size={size} color="#0B1F3A" backgroundColor="#fff" />
      <ScanLine height={size + 16} />
    </View>
  );
}

/** Lightweight SVG scenes (onboarding / headers / empty states) - no image files needed. */
export function Scene({ kind = 'mountains', height = 220, children }: { kind?: 'mountains' | 'plane' | 'lake' | 'night'; height?: number; children?: React.ReactNode }) {
  const night = kind === 'night';
  return (
    <View style={{ height, overflow: 'hidden' }}>
      <Svg width="100%" height="100%" viewBox="0 0 300 220" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <SvgGrad id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={night ? '#050D1C' : '#EAF6FD'} /><Stop offset="1" stopColor={night ? '#1E4E7A' : '#7DD3FC'} />
          </SvgGrad>
        </Defs>
        <Rect width="300" height="220" fill="url(#sky)" />
        <Circle cx="150" cy="80" r="34" fill="#fff" opacity={night ? 0.15 : 0.9} />
        <Path d="M0 150 L50 100 L90 125 L140 70 L190 120 L230 90 L300 135 V220 H0z" fill="#9CC3E0" opacity={0.65} />
        <Path d="M0 170 L40 140 L82 160 L132 118 L176 156 L222 128 L262 150 L300 140 V220H0z" fill="#3B6A99" />
        <Path d="M0 195 L60 165 L112 183 L162 160 L212 186 L260 168 L300 180 V220H0z" fill="#13294B" />
        {kind === 'plane' && <Path transform="translate(150 70) rotate(-10)" d="M-50 2 Q-40 -7 34 -8 Q55 -8 65 -2 Q55 3 34 3 L-40 6 Q-48 6 -50 2z M-5 -3 L-25 25 L-14 25 L18 -2z" fill="#881337" />}
        {kind === 'lake' && <Rect y="185" width="300" height="35" fill="#38A3B8" opacity={0.8} />}
      </Svg>
      {children && <View style={StyleSheet.absoluteFill}>{children}</View>}
    </View>
  );
}

export function ConfirmDialog({ visible, title, text, confirm, cancel = 'Cancel', onConfirm, onCancel, icon = 'alert', danger, children, loading }: {
  visible: boolean; title: string; text?: string; confirm: string; cancel?: string; onConfirm: () => void; onCancel: () => void; icon?: IconName; danger?: boolean; children?: React.ReactNode; loading?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Sheet visible={visible} onClose={onCancel}>
      <View style={{ alignItems: 'center', paddingVertical: 8 }}>
        <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: danger ? c.dangerBg : c.infoBg, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={26} color={danger ? c.danger : c.blue} />
        </View>
        <Txt v="h2" center style={{ marginTop: 10 }}>{title}</Txt>
        {text && <Txt muted center style={{ marginTop: 4 }}>{text}</Txt>}
      </View>
      {children}
      <Button title={confirm} onPress={onConfirm} loading={loading} style={{ marginTop: 10 }} />
      <Button title={cancel} onPress={onCancel} variant="outline" style={{ marginTop: 8 }} />
    </Sheet>
  );
}

const st = StyleSheet.create({
  fld: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 2 },
  swap: { position: 'absolute', right: 14, top: 36, width: 32, height: 32, borderRadius: 16, overflow: 'hidden' },
  swapHit: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 44, marginBottom: 6 },
  item: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4 },
  day: { borderRadius: 10, minHeight: 44, justifyContent: 'center' },
  strip: { width: 54, alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingVertical: 6 },
});
