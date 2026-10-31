import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';

const REVIEWS = [
  { stars: '★★★★★', text: 'Great ride!', delay: 0 },
  { stars: '★★★★★', text: 'Easy booking', delay: 700 },
  { stars: '★★★★★', text: 'Clean & on time', delay: 1400 },
];

function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let on = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => on && setReduce(!!v)).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduce(!!v));
    return () => { on = false; sub.remove(); };
  }, []);
  return reduce;
}

/**
 * One review bubble. Same keyframes as the HTML (`rv 6s ease-in-out infinite both`):
 * 0% hidden, slid 26px in from the right -> 10% visible -> 82% still visible -> 100% faded, slid 26px out to the left.
 * The delay only applies before the first round (CSS animation-delay).
 */
function Bubble({ stars, text, delay, animate }: { stars: string; text: string; delay: number; animate: boolean }) {
  const p = useRef(new Animated.Value(animate ? 0 : 1)).current;
  useEffect(() => {
    if (!animate) { p.setValue(1); return undefined; }
    p.setValue(0);
    const ease = Easing.bezier(0.42, 0, 0.58, 1);
    const round = Animated.sequence([
      Animated.timing(p, { toValue: 1, duration: 600, easing: ease, useNativeDriver: true }),     // 0% -> 10%
      Animated.delay(4320),                                                                        // 10% -> 82%
      Animated.timing(p, { toValue: 2, duration: 1080, easing: ease, useNativeDriver: true }),    // 82% -> 100%
      Animated.timing(p, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]);
    const anim = Animated.sequence([Animated.delay(delay), Animated.loop(round)]);
    anim.start();
    return () => anim.stop();
  }, [animate, delay, p]);

  const opacity = p.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] });
  const translateX = p.interpolate({ inputRange: [0, 1, 2], outputRange: [26, 0, -26] });
  return (
    <Animated.View style={[s.bubble, { opacity, transform: [{ translateX }] }]}>
      <Text style={s.stars}>{stars}</Text>
      <Text style={s.text} numberOfLines={1}>{text}</Text>
    </Animated.View>
  );
}

/** The red "phone" with the white screen, the gold star badge and the three sliding reviews. */
export function ReviewArt() {
  const reduce = useReduceMotion();
  return (
    <View style={s.art} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={s.screen} />
      <Text style={s.star}>★</Text>
      <View style={s.scr}>
        {REVIEWS.map((r) => <Bubble key={r.text} {...r} animate={!reduce} />)}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  art: { width: 120, height: 150, borderRadius: 14, backgroundColor: '#d94a52' },
  screen: { position: 'absolute', top: 8, left: 8, right: 8, bottom: 8, borderRadius: 8, backgroundColor: '#fff' },
  star: { position: 'absolute', right: -14, top: -12, fontSize: 44, lineHeight: 44, color: '#f6b73c', includeFontPadding: false },
  scr: { position: 'absolute', top: 8, left: 8, right: 8, bottom: 8, padding: 6, gap: 5, overflow: 'hidden' },
  bubble: { backgroundColor: '#e7edf9', borderRadius: 6, paddingVertical: 5, paddingHorizontal: 7 },
  stars: { color: '#f6b73c', fontSize: 8, lineHeight: 10, letterSpacing: 1, fontWeight: '700' },
  text: { color: '#2a2f45', fontSize: 9.5, lineHeight: 12, fontWeight: '600' },
});
