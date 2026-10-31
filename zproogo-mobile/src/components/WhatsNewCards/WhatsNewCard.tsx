import React, { useContext, useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { MotionContext } from '../OfferCards/useLoop';
import { WhatsNewItem } from './whatsNew';
import { head, ui } from '../../theme/typography';

export const CARD_W = 200;
export const CARD_H = 128;

type Props = { item: WhatsNewItem; onPress?: (item: WhatsNewItem) => void };

/**
 * One card (CSS .card). Same look as the HTML:
 * gradient, two decorative bubbles, a shine that sweeps across (4.5s loop: rests 60%, sweeps 40%),
 * a white emoji tile tilted 8deg, a white tag pill, title, text and a round arrow button.
 * Press: lifts 4px and grows to 1.02 (CSS :hover, .25s).
 */
export function WhatsNewCard({ item, onPress }: Props) {
  const motion = useContext(MotionContext);

  // hover / press lift
  const press = useRef(new Animated.Value(0)).current;
  const go = (to: number) => Animated.timing(press, { toValue: to, duration: 250, useNativeDriver: true }).start();
  const lift = press.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });
  const grow = press.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] });

  // moving shine: translateX -120% -> 120% (ease-in-out) in the last 40% of a 4.5s cycle
  const shine = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!motion) { shine.setValue(0); return undefined; }
    const anim = Animated.loop(Animated.sequence([
      Animated.delay(2700),
      Animated.timing(shine, { toValue: 1, duration: 1800, easing: Easing.bezier(0.42, 0, 0.58, 1), useNativeDriver: true }),
      Animated.timing(shine, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    shine.setValue(0);
    anim.start();
    return () => anim.stop();
  }, [motion, shine]);
  const shineX = shine.interpolate({ inputRange: [0, 1], outputRange: [-CARD_W * 1.2, CARD_W * 1.2] });

  const shadow = item.shadow ?? item.accent;

  return (
    <Pressable
      onPress={() => onPress?.(item)}
      onPressIn={() => go(1)}
      onPressOut={() => go(0)}
      accessibilityRole="button"
      accessibilityLabel={`${item.tag}: ${item.title}. ${item.text}`}
    >
      {/* outer view carries the soft coloured shadow (the clipped inner view can't) */}
      <Animated.View style={[s.shadow, { shadowColor: shadow, transform: [{ translateY: lift }, { scale: grow }] }]}>
        <View style={s.card}>
          <LinearGradient colors={[item.from, item.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

          {/* decorative bubbles (::before / ::after) */}
          <View pointerEvents="none" style={[s.bubble, { width: 100, height: 100, right: -30, top: -34, backgroundColor: 'rgba(255,255,255,0.16)' }]} />
          <View pointerEvents="none" style={[s.bubble, { width: 62, height: 62, right: 24, bottom: -30, backgroundColor: 'rgba(255,255,255,0.10)' }]} />

          {/* moving shine */}
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ translateX: shineX }] }]}>
            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']}
              locations={[0.35, 0.5, 0.65]}
              start={{ x: 0, y: 0.3 }}
              end={{ x: 1, y: 0.7 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {/* inset top highlight */}
          <View pointerEvents="none" style={s.highlight} />

          {/* emoji tile */}
          <View pointerEvents="none" style={s.icon}>
            <Text style={s.emoji} allowFontScaling={false}>{item.emoji}</Text>
          </View>

          <View style={s.top}>
            <View style={s.tag}><Text style={[s.tagText, { color: item.accent }]} maxFontSizeMultiplier={1.1}>{item.tag}</Text></View>
            <Text style={s.title} maxFontSizeMultiplier={1.1}>{item.title}</Text>
          </View>
          <View style={s.bottom}>
            <Text style={s.text} maxFontSizeMultiplier={1.1}>{item.text}</Text>
          </View>

          <View style={s.go}><Text style={[s.goText, { color: item.accent }]} allowFontScaling={false}>›</Text></View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  shadow: { width: CARD_W, height: CARD_H, borderRadius: 16, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  card: { flex: 1, borderRadius: 16, padding: 12, overflow: 'hidden', justifyContent: 'space-between' },
  bubble: { position: 'absolute', borderRadius: 999 },
  highlight: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.35)' },
  icon: {
    position: 'absolute', right: 10, top: 9, width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '8deg' }],
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  emoji: { fontSize: 21, lineHeight: 26, textAlign: 'center' },
  top: { zIndex: 1 },
  bottom: { zIndex: 1 },
  tag: { alignSelf: 'flex-start', backgroundColor: '#fff', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 99 },
  tagText: { fontSize: 10.5, ...ui('semi') },
  title: { marginTop: 6, marginBottom: 2, fontSize: 15, lineHeight: 18, ...head('medium'), color: '#fff', maxWidth: 130 },
  text: { fontSize: 11, lineHeight: 15, ...ui('regular'), color: '#fff', opacity: 0.95, maxWidth: 140 },
  go: { position: 'absolute', right: 10, bottom: 10, width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  goText: { fontSize: 13, lineHeight: 16, ...ui('semi'), textAlign: 'center' },
});
