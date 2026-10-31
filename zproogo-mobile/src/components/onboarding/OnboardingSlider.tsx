import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  FlatList,
  Image,
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import FadeOverlay from './FadeOverlay';
import { colors, fonts } from './theme';

type SlideData = { id: string; source: ImageSourcePropType; iw: number; ih: number; focusX: number; focusY: number; showText?: boolean };

// focusX / focusY work like CSS object-position (0 = left/top, 1 = right/bottom)
const SLIDES: SlideData[] = [
  { id: '1', source: require('../../assets/onboarding/slide1.jpg'), iw: 780, ih: 996, focusX: 0.5, focusY: 0.5, showText: true },
  { id: '2', source: require('../../assets/onboarding/slide2.jpg'), iw: 932, ih: 1656, focusX: 0.5, focusY: 0.81 },
  { id: '3', source: require('../../assets/onboarding/slide3.jpg'), iw: 941, ih: 1672, focusX: 0.5, focusY: 0.9 },
];
const N = SLIDES.length;
// A copy of slide 1 at the end gives a seamless "last -> first" slide.
const DATA = [...SLIDES, { ...SLIDES[0], id: 'loop' }];

const AUTO_MS = 2800;
const RESUME_MS = 4500;

function coverRect(slide: SlideData, W: number, H: number) {
  const s = Math.max(W / slide.iw, H / slide.ih);
  const w = slide.iw * s;
  const h = slide.ih * s;
  return { width: w, height: h, left: (W - w) * slide.focusX, top: (H - h) * slide.focusY };
}

const Slide = React.memo(function Slide({ item, width, height, bottomClearance }: { item: SlideData; width: number; height: number; bottomClearance: number }) {
  const rect = coverRect(item, width, height);
  return (
    <View style={{ width, height, overflow: 'hidden', backgroundColor: '#06080E' }}>
      <Image
        source={item.source}
        fadeDuration={0}
        style={{ position: 'absolute', ...rect }}
      />
      {item.showText ? (
        <>
          <FadeOverlay from="bottom" height={height * 0.62} maxOpacity={0.88} />
          <View style={[styles.textWrap, { bottom: bottomClearance }]}>
            <Text style={styles.headline}>
              Your Journey,{'\n'}
              <Text style={styles.headlineAccent}>Your Way.</Text>
            </Text>
            <Text style={styles.sub}>
              Search buses, trains, flights and hotels with ease. No sign-up needed until it's time.
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );
});

type SliderProps = {
  width: number;
  height: number;
  topInset?: number;
  bottomClearance?: number;
  paused?: boolean;
  onSkip: () => void;
};

export default function OnboardingSlider({
  width,
  height,
  topInset = 24,
  bottomClearance = 44,
  paused = false,
  onSkip,
}: SliderProps) {
  const listRef = useRef<FlatList<SlideData>>(null);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draggingRef = useRef(false);
  const pausedRef = useRef(false);
  const [index, setIndex] = useState(0);
  const [appActive, setAppActive] = useState(true);

  const scrollToPage = useCallback(
    (page: number, animated = true) => {
      listRef.current?.scrollToOffset({ offset: page * width, animated });
    },
    [width],
  );

  const stopAuto = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const startAuto = useCallback(() => {
    stopAuto();
    timerRef.current = setInterval(() => {
      if (!draggingRef.current) scrollToPage(indexRef.current + 1);
    }, AUTO_MS);
  }, [scrollToPage, stopAuto]);

  const pauseThenResume = useCallback(() => {
    stopAuto();
    if (resumeRef.current) clearTimeout(resumeRef.current);
    // never restart autoplay while the keyboard is open / the app is in the background
    resumeRef.current = setTimeout(() => { if (!pausedRef.current) startAuto(); }, RESUME_MS);
  }, [startAuto, stopAuto]);

  // autoplay lifecycle: stops while the keyboard is open or the app is in background
  useEffect(() => {
    pausedRef.current = paused || !appActive;
    if (paused || !appActive) {
      stopAuto();
      if (resumeRef.current) clearTimeout(resumeRef.current);
      return undefined;
    }
    startAuto();
    return () => {
      stopAuto();
      if (resumeRef.current) clearTimeout(resumeRef.current);
    };
  }, [paused, appActive, startAuto, stopAuto]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setAppActive(s === 'active'));
    return () => sub.remove();
  }, []);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      // reached the copy of slide 1 -> jump back to the real slide 1 (looks identical)
      if (x >= N * width - 0.5) {
        scrollToPage(0, false);
        indexRef.current = 0;
        setIndex(0);
        return;
      }
      const page = Math.round(x / width);
      if (page !== indexRef.current && page < N) {
        indexRef.current = page;
        setIndex(page);
      }
    },
    [scrollToPage, width],
  );

  const goTo = (page: number) => {
    scrollToPage(page);
    pauseThenResume();
  };

  const getItemLayout = useCallback(
    (_: unknown, i: number) => ({ length: width, offset: width * i, index: i }),
    [width],
  );

  const counter = useMemo(
    () =>
      SLIDES.map((s, k) =>
        k === index ? (
          <View key={s.id} style={styles.counterPill}>
            <Text style={styles.counterText}>{`${index + 1}/${N}`}</Text>
          </View>
        ) : (
          <Pressable key={s.id} hitSlop={10} onPress={() => goTo(k)} style={styles.counterDot} />
        ),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [index, width],
  );

  return (
    <View style={{ width, height, backgroundColor: '#06080E' }}>
      <FlatList
        ref={listRef}
        data={DATA}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Slide item={item} width={width} height={height} bottomClearance={bottomClearance} />
        )}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        bounces={false}
        overScrollMode="never"
        decelerationRate="fast"
        disableIntervalMomentum
        showsHorizontalScrollIndicator={false}
        getItemLayout={getItemLayout}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onScrollBeginDrag={() => {
          draggingRef.current = true;
          stopAuto();
        }}
        onScrollEndDrag={() => {
          draggingRef.current = false;
          pauseThenResume();
        }}
        windowSize={4}
        initialNumToRender={N + 1}
        removeClippedSubviews={false}
      />

      <FadeOverlay from="top" height={height * 0.35} rgb={[18, 32, 58]} maxOpacity={0.3} />

      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: Math.round(width * 0.17) }}>
        <Image
          source={require('../../assets/onboarding/wave.png')}
          resizeMode="stretch"
          style={{ width: '100%', height: '100%' }}
        />
      </View>

      <View style={[styles.counter, { top: topInset }]}>{counter}</View>

      <Pressable
        onPress={onSkip}
        style={({ pressed }) => [styles.skip, { top: topInset - 4 }, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityLabel="Skip"
      >
        <Text style={styles.skipText}>Skip</Text>
        <Text style={styles.skipArrow}>{'\u2192'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  textWrap: { position: 'absolute', left: 24, right: 24 },
  headline: {
    fontFamily: fonts.headerBold,
    fontSize: 28,
    lineHeight: 35,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  headlineAccent: { color: '#FF4D73' },
  sub: {
    marginTop: 8,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  counter: { position: 'absolute', left: 22, flexDirection: 'row', alignItems: 'center' },
  counterDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 7,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  counterPill: {
    marginRight: 7,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 13,
    backgroundColor: colors.skip,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  counterText: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 17, color: '#fff' },
  skip: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 16,
    backgroundColor: colors.skip,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 5,
  },
  skipText: { fontFamily: fonts.medium, fontSize: 14, color: '#fff' },
  skipArrow: { marginLeft: 8, fontSize: 16, color: '#fff' },
});
