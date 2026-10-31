import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, LayoutChangeEvent, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useReduceMotion } from '../OfferCards/useLoop';
import { head, ui } from '../../theme/typography';

const BUS_PHOTO = require('../../assets/banner-bus.jpg');
const PHOTO_RATIO = 788 / 1400; // image height / width
const CARD_RATIO = 240 / 656; // card height / width (same as the HTML banner)
const ACCENT = '#FFD166';

// CSS cubic-bezier curves from the HTML banner
const EASE_IN = Easing.bezier(0.2, 0.8, 0.2, 1);
const EASE_TRAVEL = Easing.bezier(0.2, 0.9, 0.2, 1);

type Props = {
  title1?: string;
  title2?: string;
  text?: string;
  /** change this number to replay the intro (e.g. on screen focus) */
  playKey?: number;
  /** tap the banner to replay the animation */
  replayOnPress?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Home header banner: bus photo under a brand gradient, with the
 * "Dream It, Travel It." intro animation (word 1 fades up, word 2 slides in
 * and settles, accent bar grows, paragraph fades up). All native-driver.
 */
export function TravelBanner({
  title1 = 'Dream It,',
  title2 = 'Travel It.',
  text = 'Turn your travel dreams into reality. Discover buses, explore new destinations, and make every journey unforgettable.',
  playKey = 0,
  replayOnPress = true,
  style,
}: Props) {
  const reduce = useReduceMotion();
  const [w, setW] = useState(0);
  const [replay, setReplay] = useState(0);
  const w1 = useRef(new Animated.Value(0)).current;
  const w2 = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;
  const para = useRef(new Animated.Value(0)).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const next = Math.round(e.nativeEvent.layout.width);
    if (next !== w) setW(next);
  };

  useEffect(() => {
    if (!w) return undefined;
    if (reduce) { [w1, w2, bar, para].forEach((v) => v.setValue(1)); return undefined; }
    [w1, w2, bar, para].forEach((v) => v.setValue(0));
    const run = (v: Animated.Value, delay: number, duration: number, easing: (t: number) => number) =>
      Animated.sequence([Animated.delay(delay), Animated.timing(v, { toValue: 1, duration, easing, useNativeDriver: true })]);
    const anim = Animated.parallel([
      run(w1, 500, 1300, EASE_IN),
      run(w2, 1800, 1000, EASE_TRAVEL),
      run(bar, 2900, 1000, Easing.out(Easing.quad)),
      run(para, 3200, 1200, Easing.out(Easing.quad)),
    ]);
    anim.start();
    return () => anim.stop();
  }, [w > 0, reduce, playKey, replay]); // eslint-disable-line react-hooks/exhaustive-deps

  const cqw = w / 100; // 1 CSS "cqw"
  const fadeUp = (v: Animated.Value, dist: number) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [dist, 0] }) }],
  });
  const press = useCallback(() => replayOnPress && setReplay((n) => n + 1), [replayOnPress]);

  return (
    <Pressable
      onPress={press}
      onLayout={onLayout}
      accessibilityRole="image"
      accessibilityLabel={`${title1} ${title2} ${text}`}
      style={[{ borderRadius: 24, overflow: 'hidden', aspectRatio: 1 / CARD_RATIO, backgroundColor: '#3A0F4A' }, style]}
    >
      {w > 0 && (
        <>
          {/* background-size: cover; background-position: center 60% */}
          <Image
            source={BUS_PHOTO}
            resizeMode="cover"
            style={{ position: 'absolute', width: w, height: w * PHOTO_RATIO, top: -(w * PHOTO_RATIO - w * CARD_RATIO) * 0.6 }}
          />
          <LinearGradient
            colors={['rgba(163,7,31,0.78)', 'rgba(90,15,74,0.68)', 'rgba(28,27,94,0.78)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={{ position: 'absolute', left: 0, right: 0, top: 6.5 * cqw, alignItems: 'center', paddingHorizontal: 6 * cqw }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Animated.Text
                numberOfLines={1}
                style={[titleStyle(cqw), {
                  opacity: w1,
                  transform: [
                    { translateY: w1.interpolate({ inputRange: [0, 1], outputRange: [4 * cqw, 0] }) },
                    { scale: w1.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
                  ],
                }]}
              >
                {title1}{' '}
              </Animated.Text>
              <Animated.Text
                numberOfLines={1}
                style={[titleStyle(cqw), {
                  color: ACCENT,
                  opacity: w2.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 1] }),
                  transform: [
                    // slide in from the right, overshoot 60% through, then settle (CSS keyframes)
                    { translateX: w2.interpolate({ inputRange: [0, 0.6, 1], outputRange: [14 * cqw, -1.4 * cqw, 0] }) },
                    { skewX: w2.interpolate({ inputRange: [0, 0.6, 1], outputRange: ['-14deg', '3deg', '0deg'] }) },
                  ],
                }]}
              >
                {title2}
              </Animated.Text>
            </View>

            <Animated.View
              style={{
                height: Math.max(3, 0.7 * cqw),
                width: 14 * cqw,
                marginVertical: 1.6 * cqw,
                borderRadius: 4,
                backgroundColor: ACCENT,
                transform: [{ scaleX: bar }],
              }}
            />

            <Animated.Text
              style={[{
                maxWidth: 84 * cqw,
                color: '#fff',
                textAlign: 'center',
                ...ui('medium'),
                fontSize: Math.max(12, 2.45 * cqw),
                lineHeight: Math.max(15, 2.45 * cqw * 1.5),
                textShadowColor: 'rgba(0,0,0,0.5)',
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 10,
              }, fadeUp(para, 2 * cqw)]}
            >
              {text}
            </Animated.Text>
          </View>
        </>
      )}
    </Pressable>
  );
}

const titleStyle = (cqw: number) => ({
  color: '#fff',
  ...head('bold'),
  fontSize: 7.6 * cqw,
  lineHeight: 7.6 * cqw * 1.15,
  letterSpacing: -0.02 * 7.6 * cqw,
  textShadowColor: 'rgba(0,0,0,0.45)',
  textShadowOffset: { width: 0, height: 4 },
  textShadowRadius: 18,
});
