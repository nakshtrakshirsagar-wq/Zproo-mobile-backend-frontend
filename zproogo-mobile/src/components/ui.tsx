import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Dimensions, Image, Modal, Pressable, ScrollView, StatusBar, StyleProp, StyleSheet, Switch, Text, TextInput,
  TextInputProps, TextStyle, View, ViewStyle, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { gradients, radius } from '../theme/tokens';
import { FONT, FONTS_INSTALLED, ui } from '../theme/typography';
import { Icon, IconName } from './Icon';
import { rupees } from '../utils/format';
import { useKeyboardOverlap } from '../hooks/useKeyboardOverlap';

/** Lets a Field tell its Screen "I just got focus" so the Screen can keep it above the keyboard. */
const FocusCtx = React.createContext<(() => void) | null>(null);





// ---------------------------------------------------------------- text
type TxtProps = { children: React.ReactNode; v?: 'title' | 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'xs'; muted?: boolean; color?: string;
  bold?: boolean; center?: boolean; style?: StyleProp<TextStyle>; numberOfLines?: number; onPress?: () => void };
// redBus-style hierarchy (see theme/typography.ts):
//   title/h1  Header        Montserrat Bold 26 / 24
//   h2        Sub-header    Montserrat Medium 18
//   h3        List title    Inter Medium 14
//   body      Paragraph     Inter Regular 14
//   small     Plain text    Inter Regular 13
//   xs        Label         Inter Regular 12
const sizes = { title: 26, h1: 24, h2: 18, h3: 14, body: 14, small: 13, xs: 12 };
const family = { title: FONT.headBold, h1: FONT.headBold, h2: FONT.headMedium, h3: FONT.uiMedium, body: FONT.uiRegular, small: FONT.uiRegular, xs: FONT.uiRegular };
const weightOf = { title: '700', h1: '700', h2: '500', h3: '500', body: '400', small: '400', xs: '400' } as const;
export function Txt({ children, v = 'body', muted, color, bold, center, style, numberOfLines, onPress }: TxtProps) {
  const { c } = useTheme();
  // `bold` on UI text = Inter SemiBold; headers are already bold
  const fam = bold && !['title', 'h1', 'h2'].includes(v) ? FONT.uiSemi : family[v];
  const weight = bold && !['title', 'h1', 'h2'].includes(v) ? '600' : weightOf[v];
  return (
    <Text onPress={onPress} numberOfLines={numberOfLines} style={[{ fontSize: sizes[v], color: color ?? (muted ? c.muted : c.text),
      ...(FONTS_INSTALLED ? { fontFamily: fam } : { fontWeight: weight }), textAlign: center ? 'center' : undefined,
      lineHeight: sizes[v] * 1.4 }, style]}>{children}</Text>
  );
}

// ---------------------------------------------------------------- layout
export function Screen({ title, back = true, right, children, footer, scroll = true, padded = true, onBack }: {
  title?: string; back?: boolean; right?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; scroll?: boolean; padded?: boolean; onBack?: () => void;
}) {
  const { c, isDark } = useTheme();
  const nav = useNavigation<any>();
  const wrapRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const [footerH, setFooterH] = useState(0);
  const { overlap, ensureVisible } = useKeyboardOverlap(wrapRef);
  const keepVisible = () => ensureVisible(scrollY.current, (y) => scrollRef.current?.scrollTo({ y, animated: true }), footer ? footerH : 0);
  // keyboard opened: the extra bottom space (below) is added first, then the focused field is scrolled into view if needed
  useEffect(() => { if (overlap > 0) keepVisible(); }, [overlap]); // eslint-disable-line react-hooks/exhaustive-deps
  const body = <View style={{ padding: padded ? 16 : 0, paddingBottom: (footer ? 110 : 24) + overlap }}>{children}</View>;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={c.bg} />
      {(title !== undefined || back) && (
        <View style={s.header}>
          {back ? <IconButton name="back" onPress={onBack ?? (() => nav.goBack())} label="Back" /> : <View style={{ width: 36 }} />}
          <Txt v="h3" style={{ flex: 1, textAlign: 'center', fontSize: 15 }} numberOfLines={1}>{title ?? ''}</Txt>
          {right ?? <View style={{ width: 36 }} />}
        </View>
      )}
      <FocusCtx.Provider value={keepVisible}>
        {/* plain View (not KeyboardAvoidingView) carries the ref: only real Views can be measured */}
        <View ref={wrapRef} collapsable={false} style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {scroll ? (
            <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} scrollEventThrottle={16}
              onScroll={(e) => { scrollY.current = e.nativeEvent.contentOffset.y; }}>{body}</ScrollView>
          ) : <View style={{ flex: 1 }}>{body}</View>}
          {footer && <View onLayout={(e) => setFooterH(e.nativeEvent.layout.height)} style={[s.footer, { backgroundColor: c.bg, borderTopColor: c.border, bottom: overlap }]}>{footer}</View>}
        </KeyboardAvoidingView>
        </View>
      </FocusCtx.Provider>
    </SafeAreaView>
  );
}

export function IconButton({ name, onPress, label, color, size = 18, badge }: { name: IconName; onPress?: () => void; label: string; color?: string; size?: number; badge?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} hitSlop={8}
      style={[s.iconBtn, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Icon name={name} size={size} color={color ?? c.text} />
      {badge && <View style={[s.dot, { backgroundColor: c.brand }]} />}
    </Pressable>
  );
}



export const Row = ({ children, style, gap = 10 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) =>
  <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
export const Spacer = ({ h = 12 }: { h?: number }) => <View style={{ height: h }} />;
export const Flex = () => <View style={{ flex: 1 }} />;

export function Card({ children, onPress, style, highlight }: { children: React.ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; highlight?: boolean }) {
  const { c } = useTheme();
  const st = [s.card, { backgroundColor: c.surface, borderColor: highlight ? c.brand : c.border, shadowColor: c.shadow }, style];
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => [st, pressed && { opacity: 0.85 }]}>{children}</Pressable> : <View style={st}>{children}</View>;
}

export function Section({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { c } = useTheme();
  return (
    <Row style={{ marginTop: 18, marginBottom: 8, justifyContent: 'space-between' }}>
      <Txt v="h3">{title}</Txt>
      {action && <Txt v="small" color={c.brand} onPress={onAction}>{action}</Txt>}
    </Row>
  );
}

// ---------------------------------------------------------------- buttons
export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, small, style }: {
  title: string; onPress?: () => void; variant?: 'primary' | 'outline' | 'ghost' | 'white' | 'success'; loading?: boolean; disabled?: boolean;
  icon?: IconName; small?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const h = small ? 34 : 48;
  const fg = variant === 'primary' || variant === 'success' ? '#fff' : variant === 'white' ? c.brand : c.brand;
  const inner = (
    <Row gap={8} style={{ justifyContent: 'center', height: h, paddingHorizontal: small ? 14 : 18 }}>
      {loading ? <ActivityIndicator color={fg} /> : <>
        {icon && <Icon name={icon} size={small ? 14 : 16} color={fg} />}
        <Text style={[ui('semi'), { color: fg, fontSize: small ? 13 : 14 }]}>{title}</Text>
      </>}
    </Row>
  );
  const press = disabled || loading ? undefined : onPress;
  const base: StyleProp<ViewStyle> = [{ borderRadius: small ? 10 : 14, overflow: 'hidden', opacity: disabled ? 0.5 : 1 }, style];
  if (variant === 'primary' || variant === 'success') {
    return (
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} onPress={press} style={({ pressed }) => [base, pressed && { transform: [{ scale: 0.98 }] }]}>
        <LinearGradient colors={variant === 'success' ? ['#2E9E6B', '#1F7A52'] : gradients.button} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>{inner}</LinearGradient>
      </Pressable>
    );
  }
  return (
    <Pressable accessibilityRole="button" onPress={press} style={[base, variant === 'outline' && { borderWidth: 1.5, borderColor: c.brand },
      variant === 'white' && { backgroundColor: '#fff' }]}>{inner}</Pressable>
  );
}

// ---------------------------------------------------------------- inputs
export function Field({ label, error, right, ...p }: TextInputProps & { label: string; error?: string; right?: React.ReactNode }) {
  const { c } = useTheme();
  const [focus, setFocus] = useState(false);
  const keepVisible = React.useContext(FocusCtx);
  return (
    <View style={{ marginVertical: 6 }}>
      <View style={[s.field, { backgroundColor: c.surface, borderColor: error ? c.danger : focus ? c.brand : c.border }]}>
        <View style={{ flex: 1 }}>
          <Txt v="xs" muted>{label}</Txt>
          <TextInput placeholderTextColor={c.muted} {...p} onFocus={(e) => { setFocus(true); p.onFocus?.(e); keepVisible?.(); }} onBlur={(e) => { setFocus(false); p.onBlur?.(e); }}
            style={[{ color: c.text, fontSize: 14, ...ui('medium'), padding: 0, minHeight: p.multiline ? 60 : 22, textAlignVertical: p.multiline ? 'top' : 'center' }, p.style]} />
        </View>
        {right}
      </View>
      {!!error && <Txt v="xs" color={c.danger} style={{ marginTop: 3 }}>{error}</Txt>}
    </View>
  );
}

export function Chip({ label, on, onPress, icon }: { label: string; on?: boolean; onPress?: () => void; icon?: IconName }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityState={{ selected: !!on }}
      style={[s.chip, { backgroundColor: on ? c.brand : c.surface, borderColor: on ? c.brand : c.border }]}>
      {icon && <Icon name={icon} size={12} color={on ? '#fff' : c.text} />}
      <Text style={{ color: on ? '#fff' : c.text, fontSize: 13, ...ui(on ? 'semi' : 'regular') }}>{label}</Text>
    </Pressable>
  );
}

export function ChipGroup<T extends string>({ options, value, onChange, multi }: { options: { value: T; label: string }[]; value: T | T[]; onChange: (v: any) => void; multi?: boolean }) {
  const isOn = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 }}>
      {options.map((o) => <Chip key={o.value} label={o.label} on={isOn(o.value)} onPress={() => {
        if (!multi) return onChange(o.value);
        const arr = value as T[];
        onChange(arr.includes(o.value) ? arr.filter((x) => x !== o.value) : [...arr, o.value]);
      }} />)}
    </View>
  );
}





export function Tabs<T extends string>({ items, value, onChange }: { items: { value: T; label: string; icon?: IconName }[]; value: T; onChange: (v: T) => void }) {
  const { c } = useTheme();
  return (
    <View style={[s.tabs, { backgroundColor: c.chip }]}>
      {items.map((i) => {
        const on = i.value === value;
        return (
          <Pressable key={i.value} onPress={() => onChange(i.value)} style={{ flex: 1, borderRadius: 9, overflow: 'hidden' }} accessibilityState={{ selected: on }}>
            {on ? (
              <LinearGradient colors={gradients.button} style={s.tab}>
                {i.icon && <Icon name={i.icon} size={13} color="#fff" />}
                <Text style={{ color: '#fff', fontSize: 13, ...ui('semi') }}>{i.label}</Text>
              </LinearGradient>
            ) : (
              <View style={s.tab}>{i.icon && <Icon name={i.icon} size={13} color={c.muted} />}<Text style={{ color: c.muted, fontSize: 11.5 }}>{i.label}</Text></View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export function Toggle({ value, onChange, label, sub, icon, highlight }: { value: boolean; onChange: (v: boolean) => void; label: string; sub?: string; icon?: IconName; highlight?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={() => onChange(!value)} style={[s.srow, { backgroundColor: highlight ? c.dangerBg : c.surface, borderColor: highlight ? c.rose : c.border }]}>
      {icon && <Icon name={icon} size={18} color={c.brand} />}
      <View style={{ flex: 1 }}><Txt v="h3" style={{ fontSize: 12.5 }}>{label}</Txt>{sub && <Txt v="small" muted>{sub}</Txt>}</View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: c.brand, false: c.border }} thumbColor="#fff" />
    </Pressable>
  );
}

export function Counter({ value, onChange, min = 0, max = 9 }: { value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  const btn = (n: IconName, d: number) => (
    <Pressable accessibilityLabel={d > 0 ? 'Increase' : 'Decrease'} onPress={() => onChange(Math.min(max, Math.max(min, value + d)))}
      style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#0B1F3A', alignItems: 'center', justifyContent: 'center', opacity: (d < 0 ? value <= min : value >= max) ? 0.35 : 1 }}>
      <Icon name={n} size={14} color="#fff" />
    </Pressable>
  );
  return <Row gap={10}>{btn('minus', -1)}<Txt v="h3">{value}</Txt>{btn('plus', 1)}</Row>;
}

// ---------------------------------------------------------------- feedback
export function Box({ kind = 'info', text, icon }: { kind?: 'info' | 'warn' | 'error' | 'success'; text: string; icon?: IconName }) {
  const { c } = useTheme();
  const m = { info: [c.infoBg, c.info, 'info'], warn: [c.warningBg, '#92600E', 'alert'], error: [c.dangerBg, c.danger, 'alert'], success: [c.successBg, c.success, 'check'] }[kind];
  return (
    <View style={[s.box, { backgroundColor: m[0], borderColor: m[1] + '55' }]}>
      <Icon name={(icon ?? m[2]) as IconName} size={15} color={m[1]} />
      <Txt v="small" color={m[1]} style={{ flex: 1 }}>{text}</Txt>
    </View>
  );
}

export function Badge({ text, kind = 'neutral' }: { text: string; kind?: 'success' | 'danger' | 'warn' | 'info' | 'neutral' | 'ladies' }) {
  const { c } = useTheme();
  const m = { success: [c.successBg, c.success], danger: [c.dangerBg, c.danger], warn: [c.warningBg, '#B7791F'], info: [c.infoBg, c.blue], neutral: [c.chip, c.muted], ladies: ['#FFE4EA', '#BE123C'] }[kind];
  return <View style={{ backgroundColor: m[0], paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, alignSelf: 'flex-start' }}><Text style={{ color: m[1], fontSize: 12, ...ui('semi') }}>{text}</Text></View>;
}

/** Whiteboard: price values in GREEN everywhere. */
export function Price({ paise, size = 15, suffix, strike }: { paise: number; size?: number; suffix?: string; strike?: boolean }) {
  const { c } = useTheme();
  return (
    <Text style={{ color: strike ? c.muted : c.success, ...ui('semi'), fontSize: size, textDecorationLine: strike ? 'line-through' : 'none' }}>
      {rupees(paise)}{suffix && <Text style={{ color: c.muted, ...ui('regular'), fontSize: size * 0.7 }}>{suffix}</Text>}
    </Text>
  );
}

export function PriceRow({ label, paise, minus, total, green }: { label: string; paise: number; minus?: boolean; total?: boolean; green?: boolean }) {
  const { c } = useTheme();
  return (
    <Row style={[{ justifyContent: 'space-between', paddingVertical: 5 }, total && { borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: c.border, marginTop: 6, paddingTop: 10 }]}>
      <Txt v={total ? 'h3' : 'body'} muted={!total}>{label}</Txt>
      <Text style={{ ...ui(total ? 'semi' : 'medium'), fontSize: total ? 17 : 13, color: green || total || minus ? c.success : c.text }}>{minus ? '−' : ''}{rupees(paise)}</Text>
    </Row>
  );
}

export function SaveBadge({ paise }: { paise: number }) {
  const { c } = useTheme();
  if (paise <= 0) return null;
  return <View style={[s.box, { backgroundColor: c.successBg, borderColor: c.success + '55', justifyContent: 'center' }]}><Icon name="tag" size={14} color={c.success} /><Txt v="h3" color={c.success}>You save {rupees(paise)} on this booking</Txt></View>;
}

export function Loading({ text }: { text?: string }) {
  const { c } = useTheme();
  return <View style={{ padding: 40, alignItems: 'center', gap: 10 }}><ActivityIndicator color={c.brand} size="large" />{text && <Txt muted>{text}</Txt>}</View>;
}

export function EmptyState({ icon = 'search', title, text, action, onAction }: { icon?: IconName; title: string; text?: string; action?: string; onAction?: () => void }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 36, paddingHorizontal: 20 }}>
      <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: c.chip, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={40} color={c.brand} /></View>
      <Txt v="h2" center style={{ marginTop: 14 }}>{title}</Txt>
      {text && <Txt muted center style={{ marginTop: 6 }}>{text}</Txt>}
      {action && <Button title={action} onPress={onAction} style={{ marginTop: 18, alignSelf: 'stretch' }} />}
    </View>
  );
}

export function ErrorView({ error, onRetry }: { error: any; onRetry?: () => void }) {
  return <EmptyState icon={error?.code === 'NETWORK' ? 'wifi' : 'alert'} title={error?.code === 'NETWORK' ? 'No internet connection' : 'Something went wrong'}
    text={error?.message} action={onRetry ? 'Retry' : undefined} onAction={onRetry} />;
}

// ---------------------------------------------------------------- sheet
export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title?: string; children: React.ReactNode }) {
  const { c } = useTheme();
  const wrapRef = useRef<View>(null);
  const { overlap } = useKeyboardOverlap(wrapRef);
  const maxH = Math.max(220, Math.min(560, Dimensions.get('window').height - overlap - 140));
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View ref={wrapRef} collapsable={false} style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: c.overlay }} onPress={onClose} accessibilityLabel="Close" />
        {/* sheet sits above the keyboard only while the keyboard is open; otherwise it stays at the bottom */}
        <View style={[s.sheet, { backgroundColor: c.bg, marginBottom: overlap }]}>
          <View style={[s.grab, { backgroundColor: c.border }]} />
          {title && <Row style={{ marginBottom: 8 }}><Txt v="h2" style={{ flex: 1 }}>{title}</Txt><IconButton name="x" label="Close" onPress={onClose} size={14} /></Row>}
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: maxH }}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------- booking widgets
export function HoldTimer({ expiresAt, label = 'Seats held for you', onExpire }: { expiresAt?: string; label?: string; onExpire?: () => void }) {
  const { c } = useTheme();
  const [left, setLeft] = useState(() => (expiresAt ? new Date(expiresAt).getTime() - Date.now() : 0));
  const fired = useRef(false);
  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => {
      const l = new Date(expiresAt).getTime() - Date.now();
      setLeft(l);
      if (l <= 0 && !fired.current) { fired.current = true; onExpire?.(); }
    }, 1000);
    return () => clearInterval(t);
  }, [expiresAt, onExpire]);
  if (!expiresAt) return null;
  const sec = Math.max(0, Math.floor(left / 1000));
  return (
    <View style={[s.hold, { backgroundColor: c.dangerBg, borderColor: c.rose + '66' }]}>
      <Icon name="clock" size={14} color={c.brand} />
      <Txt v="small" color={c.brand} bold style={{ flex: 1 }}>{label}</Txt>
      <Txt v="h3" color={c.brand}>{String(Math.floor(sec / 60)).padStart(2, '0')}:{String(sec % 60).padStart(2, '0')}</Txt>
    </View>
  );
}

export function Stepper({ step, labels = ['Select', 'Details', 'Review', 'Pay'] }: { step: number; labels?: string[] }) {
  const { c } = useTheme();
  return (
    <Row gap={0} style={{ marginBottom: 12 }}>
      {labels.map((l, i) => (
        <React.Fragment key={l}>
          <View style={{ alignItems: 'center', gap: 3 }}>
            <View style={{ width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2,
              backgroundColor: i < step ? c.success : i === step ? c.brand : c.surface, borderColor: i < step ? c.success : i === step ? c.brand : c.border }}>
              {i < step ? <Icon name="check" size={11} color="#fff" strokeWidth={3} /> : <Text style={{ fontSize: 10, ...ui('semi'), color: i === step ? '#fff' : c.muted }}>{i + 1}</Text>}
            </View>
            <Text style={{ fontSize: 10, color: i === step ? c.brand : c.muted, ...ui(i === step ? 'semi' : 'regular') }}>{l}</Text>
          </View>
          {i < labels.length - 1 && <View style={{ flex: 1, height: 2, backgroundColor: i < step ? c.success : c.border, marginHorizontal: 4, marginBottom: 14 }} />}
        </React.Fragment>
      ))}
    </Row>
  );
}


/** Radio timeline (boarding/dropping points) - whiteboard: blue colour. */
export function Timeline({ items, value, onChange, color }: { items: { id: string; title: string; sub?: string; right?: string; badge?: string }[]; value?: string; onChange?: (id: string) => void; color?: string }) {
  const { c } = useTheme();
  const col = color ?? c.iceAccent;
  return (
    <View style={{ paddingLeft: 24 }}>
      <View style={{ position: 'absolute', left: 7, top: 14, bottom: 14, width: 2, backgroundColor: c.border }} />
      {items.map((i) => {
        const on = i.id === value;
        return (
          <Pressable key={i.id} onPress={() => onChange?.(i.id)} style={{ paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }} accessibilityState={{ selected: on }}>
            <View style={{ position: 'absolute', left: -23, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: on ? col : c.border, backgroundColor: on ? col : c.surface }} />
            <View style={{ flex: 1 }}>
              <Row gap={6}><Txt v="h3">{i.title}</Txt>{i.badge && <Badge text={i.badge} kind="success" />}</Row>
              {i.sub && <Txt v="small" muted>{i.sub}</Txt>}
            </View>
            {i.right && <Txt v="small" muted>{i.right}</Txt>}
          </Pressable>
        );
      })}
    </View>
  );
}



export function Stars({ value, onChange, size = 28 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  const { c } = useTheme();
  return (
    <Row gap={6} style={{ justifyContent: 'center' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange?.(n)} accessibilityLabel={`${n} star`}>
          <Icon name="star" size={size} color={n <= value ? c.warning : c.border} fill={n <= value ? c.warning : 'none'} />
        </Pressable>
      ))}
    </Row>
  );
}

/** Whiteboard "scanner line": animated scan line over ticket QR codes. */
export function ScanLine({ height }: { height: number }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(y, { toValue: height - 4, duration: 1200, useNativeDriver: true }),
      Animated.timing(y, { toValue: 0, duration: 1200, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [height, y]);
  return <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: '#D90404', transform: [{ translateY: y }], shadowColor: '#D90404', shadowOpacity: 0.8, shadowRadius: 6 }} />;
}

export function Avatar({ name, url, size = 40 }: { name?: string | null; url?: string | null; size?: number }) {
  if (url) return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <LinearGradient colors={gradients.banner} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', ...ui('semi'), fontSize: size * 0.36 }}>{(name ?? 'G').split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase()}</Text>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', height: 52, paddingHorizontal: 16, gap: 8 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 22, borderTopWidth: StyleSheet.hairlineWidth },
  iconBtn: { width: 36, height: 36, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 7, right: 8, width: 7, height: 7, borderRadius: 4 },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: 12, marginVertical: 6, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 1 },
  field: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  tabs: { flexDirection: 'row', borderRadius: 12, padding: 3, gap: 3, marginVertical: 8 },
  tab: { flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  srow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, marginVertical: 6 },
  box: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', borderWidth: 1, borderRadius: 12, padding: 10, marginVertical: 6 },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: 28 },
  grab: { width: 42, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  hold: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderStyle: 'dashed', borderRadius: 11, padding: 9, marginVertical: 8 },
});
