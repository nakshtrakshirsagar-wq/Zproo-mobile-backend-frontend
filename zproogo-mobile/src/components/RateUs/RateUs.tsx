import React, { useState } from 'react';
import { Linking, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { ReviewArt } from './ReviewArt';
import { head, ui } from '../../theme/typography';

type Props = {
  /** Play Store listing. Default: the Zproogo app id. */
  storeUrl?: string;
  /** Replace the default "open the store" action. */
  onRate?: () => void;
  style?: StyleProp<ViewStyle>;
};

const PACKAGE = 'com.zproogo.app';

/**
 * "Enjoying our app?" card (port of Rate_Us.html): red phone art with reviews sliding in and out,
 * heading, text and a Rate Now button. Tapping the button shows "Thanks! Opening the store…" and opens the store.
 */
export function RateUs({ storeUrl, onRate, style }: Props) {
  const { c } = useTheme();
  const [msg, setMsg] = useState('');

  const rate = async () => {
    setMsg('Thanks! Opening the store…');
    if (onRate) return onRate();
    try {
      await Linking.openURL(storeUrl ?? `market://details?id=${PACKAGE}`);
    } catch {
      Linking.openURL(`https://play.google.com/store/apps/details?id=${PACKAGE}`).catch(() => {});
    }
  };

  return (
    <View style={[s.card, { backgroundColor: c.surface }, style]}>
      <View style={s.row}>
        <ReviewArt />
        <View style={{ flex: 1 }}>
          <Text style={[s.h2, { color: c.text }]}>Enjoying our app?</Text>
          <Text style={[s.p, { color: c.muted }]}>Share your experience with us and help spread the word!</Text>
        </View>
      </View>
      <Pressable onPress={rate} accessibilityRole="button" accessibilityLabel="Rate Now" style={({ pressed }) => [s.btn, pressed && { opacity: 0.85 }]}>
        <Text style={s.btnText}>Rate Now</Text>
      </Pressable>
      <Text style={[s.msg, { color: c.text }]} accessibilityLiveRegion="polite">{msg}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 24, padding: 22, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  h2: { fontSize: 20, lineHeight: 26, ...head('medium'), marginBottom: 6 },
  p: { fontSize: 14, lineHeight: 21, ...ui('regular') },
  btn: { width: '100%', borderRadius: 999, padding: 16, marginTop: 18, backgroundColor: '#d63a45', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, ...ui('semi') },
  msg: { minHeight: 20, marginTop: 12, fontSize: 14, ...ui('medium'), textAlign: 'center' },
});
