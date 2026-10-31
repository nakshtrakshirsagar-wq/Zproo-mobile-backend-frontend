/**
 * AppLoader - the animated launch screen shown when the app opens (before the login / onboarding page).
 * Red gradient, logo card, icons moving in a sea wave, cycling captions and a progress bar.
 * Self-contained: only needs react-native-svg + react-native-linear-gradient. Use it anywhere:
 *
 *   {ready ? <Shell /> : <AppLoader />}
 */
import React, { useEffect, useMemo } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

const ICON_COLOR = '#D90404';
const GRADIENT = ['#D90404', '#9F1239'] as const;

const BASE_W = 270;

const CAPTIONS = [
  'Packing your journey…',
  'Choosing the best deals…',
  'Let’s go!',
];

const WAVE_HEIGHT = 12;
const WAVE_CYCLE_MS = 1400;
const CAPTION_CYCLE_MS = 6000;
const CAPTION_STAGGER_MS = 2000;
const BAR_MS = 4500;

const LOGO_RATIO = 900 / 236;
const logoSource = require('./zproo-logo.png');

type IconProps = { size: number };

const strokeProps = {
  fill: 'none' as const,
  stroke: ICON_COLOR,
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const ICONS: Array<(p: IconProps) => React.JSX.Element> = [
  // Bus
  ({ size }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...strokeProps}>
      <Rect x={4} y={3} width={16} height={14} rx={3} />
      <Path d="M4 11h16M8 17v3M16 17v3" />
      <Circle cx={8} cy={14} r={0.6} />
      <Circle cx={16} cy={14} r={0.6} />
    </Svg>
  ),

  // Plane
  ({ size }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...strokeProps}>
      <Path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.2.6-.7.5-1.2z" />
    </Svg>
  ),

  // Cab
  ({ size }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...strokeProps}>
      <Path d="M5 11l1.6-4.4A2 2 0 0 1 8.5 5h7a2 2 0 0 1 1.9 1.6L19 11" />
      <Rect x={3} y={11} width={18} height={6} rx={2} />
      <Circle cx={7.5} cy={17} r={1.8} />
      <Circle cx={16.5} cy={17} r={1.8} />
      <Path d="M10 5V3h4v2" />
    </Svg>
  ),

  // Hotel
  ({ size }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...strokeProps}>
      <Rect x={5} y={3} width={14} height={18} rx={1.5} />
      <Path d="M9 7h2M13 7h2M9 11h2M13 11h2M10 21v-4h4v4" />
    </Svg>
  ),

  // Parcel
  ({ size }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...strokeProps}>
      <Path d="M12 3l8 4v10l-8 4-8-4V7z" />
      <Path d="M4 7l8 4 8-4M12 11v10M8 5l8 4" />
    </Svg>
  ),

  // Holiday
  ({ size }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...strokeProps}>
      <Path d="M3 13c0-5 4-9 9-9s9 4 9 9z" />
      <Path d="M12 13v6.5a2 2 0 0 1-4 0" />
      <Path d="M12 4V2.5" />
    </Svg>
  ),

  // Train
  ({ size }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...strokeProps}>
      <Rect x={5} y={3} width={14} height={14} rx={3} />
      <Path d="M5 11h14M8 21l2-4M16 21l-2-4" />
      <Circle cx={9} cy={14} r={0.6} />
      <Circle cx={15} cy={14} r={0.6} />
    </Svg>
  ),
];

// Smooth sine-wave movement, with a phase offset for each icon.
const WAVE_STEPS = Array.from({ length: 65 }, (_, i) => i / 64);

function waveRange(index: number) {
  const phase = index / ICONS.length;

  return {
    inputRange: WAVE_STEPS,
    outputRange: WAVE_STEPS.map((t) =>
      Math.sin(2 * Math.PI * (t - phase))
    ),
  };
}

const WAVE_RANGES = ICONS.map((_, i) => waveRange(i));

function startLoop(
  build: () => Animated.CompositeAnimation,
  delay = 0
) {
  const loop = Animated.loop(build());
  const animation =
    delay > 0
      ? Animated.sequence([Animated.delay(delay), loop])
      : loop;

  animation.start();
  return animation;
}

export default function AppLoader(): React.JSX.Element {
  const { width, height } = useWindowDimensions();

  const s = Math.min(Math.max(width / BASE_W, 1), 1.6);

  const v = useMemo(
    () => ({
      card: new Animated.Value(0),
      sun: new Animated.Value(0),
      bar: new Animated.Value(0),
      shine: new Animated.Value(0),
      wave: new Animated.Value(0),
      captions: CAPTIONS.map(() => new Animated.Value(0)),
    }),
    []
  );

  useEffect(() => {
    const running: Animated.CompositeAnimation[] = [];

    // Logo card entrance
    const cardIn = Animated.timing(v.card, {
      toValue: 1,
      duration: 900,
      easing: Easing.bezier(0.2, 0.9, 0.3, 1.2),
      useNativeDriver: true,
    });

    cardIn.start();
    running.push(cardIn);

    // Floating background circle
    running.push(
      startLoop(() =>
        Animated.sequence([
          Animated.timing(v.sun, {
            toValue: 1,
            duration: 3000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(v.sun, {
            toValue: 0,
            duration: 3000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      )
    );

    // Continuous sea-wave animation
    running.push(
      startLoop(() =>
        Animated.timing(v.wave, {
          toValue: 1,
          duration: WAVE_CYCLE_MS,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      )
    );

    // Caption animations
    v.captions.forEach((caption, i) => {
      running.push(
        startLoop(
          () =>
            Animated.timing(caption, {
              toValue: 1,
              duration: CAPTION_CYCLE_MS,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
          i * CAPTION_STAGGER_MS
        )
      );
    });

    // Progress bar
    running.push(
      startLoop(() =>
        Animated.timing(v.bar, {
          toValue: 1,
          duration: BAR_MS,
          easing: Easing.bezier(0.6, 0, 0.3, 1),
          useNativeDriver: true,
        })
      )
    );

    // Moving shine on the progress bar
    running.push(
      startLoop(() =>
        Animated.timing(v.shine, {
          toValue: 1,
          duration: 1300,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      )
    );

    return () => running.forEach((animation) => animation.stop());
  }, [v]);

  const cardW = Math.min(196 * s, width - 64);
  const padX = 18 * s;
  const padY = 16 * s;

  const logoW = cardW - padX * 2;
  const logoH = logoW / LOGO_RATIO;
  const cardH = logoH + padY * 2;

  const cardTop = height * 0.24;
  const rowTop = cardTop + cardH + 56 * s;
  const iconBox = 31 * s;
  const barW = width - 60 * s;
  const sunSize = 220 * s;

  return (
    <View
      style={styles.root}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
    >
      <LinearGradient
        colors={GRADIENT}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating background circle */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: -60 * s,
          top: -60 * s,
          width: sunSize,
          height: sunSize,
          borderRadius: sunSize / 2,
          backgroundColor: 'rgba(255,255,255,0.15)',
          transform: [
            {
              translateY: v.sun.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -10 * s],
              }),
            },
          ],
        }}
      />

      {/* Logo card */}
      <Animated.View
        style={[
          styles.card,
          {
            top: cardTop,
            width: cardW,
            height: cardH,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 20 * s,
            left: (width - cardW) / 2,
            opacity: v.card,
            transform: [
              {
                scale: v.card.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Image
          source={logoSource}
          style={{ width: logoW, height: logoH }}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Icons moving in a smooth sea wave */}
      <View
        style={[
          styles.row,
          { top: rowTop, left: 16 * s, right: 16 * s },
        ]}
      >
        {ICONS.map((Icon, i) => (
          <Animated.View
            key={i}
            style={[
              styles.tile,
              {
                width: iconBox,
                height: iconBox,
                borderRadius: 10 * s,
                transform: [
                  {
                    translateY: v.wave.interpolate({
                      inputRange: WAVE_RANGES[i].inputRange,
                      outputRange: WAVE_RANGES[i].outputRange.map(
                        (value) => -value * WAVE_HEIGHT * s
                      ),
                      extrapolate: 'extend',
                    }),
                  },
                ],
              },
            ]}
          >
            <Icon size={18 * s} />
          </Animated.View>
        ))}
      </View>

      {/* Cycling captions */}
      <View
        style={[
          styles.captionBox,
          { bottom: 58 * s, height: 22 * s },
        ]}
        pointerEvents="none"
      >
        {CAPTIONS.map((caption, i) => (
          <Animated.Text
            key={caption}
            style={[
              styles.caption,
              {
                fontSize: 11.5 * s,
                opacity: v.captions[i].interpolate({
                  inputRange: [0, 0.05, 0.28, 0.33, 1],
                  outputRange: [0, 1, 1, 0, 0],
                }),
                transform: [
                  {
                    translateY: v.captions[i].interpolate({
                      inputRange: [0, 0.05, 0.28, 0.33, 1],
                      outputRange: [7, 0, 0, -7, -7],
                    }),
                  },
                ],
              },
            ]}
          >
            {caption}
          </Animated.Text>
        ))}
      </View>

      {/* Progress bar */}
      <View
        style={[
          styles.bar,
          {
            left: 30 * s,
            right: 30 * s,
            bottom: 38 * s,
            height: 7 * s,
            borderRadius: 7 * s,
          },
        ]}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: 7 * s,
              backgroundColor: '#FFFFFF',
              transform: [
                {
                  translateX: v.bar.interpolate({
                    inputRange: [0, 0.85, 1],
                    outputRange: [-barW, 0, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Animated.View
            style={{
              ...StyleSheet.absoluteFill,
              transform: [
                {
                  translateX: v.shine.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-barW, barW],
                  }),
                },
              ],
            }}
          >
            <LinearGradient
              colors={[
                'rgba(255,255,255,0)',
                'rgba(255,255,255,0.55)',
                'rgba(255,255,255,0)',
              ]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#D90404',
  },

  card: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },

  row: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  tile: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  captionBox: {
    position: 'absolute',
    left: 0,
    right: 0,
  },

  caption: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.4,
  },

  bar: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
});