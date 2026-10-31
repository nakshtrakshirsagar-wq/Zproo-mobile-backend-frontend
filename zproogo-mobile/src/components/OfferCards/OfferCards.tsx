import React, { useState } from 'react';
import { Animated, ScrollView, StyleProp, View, ViewStyle, useWindowDimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { OfferCard } from './OfferCard';
import { CARD_H } from './cardFx';
import { DEFAULT_OFFERS, OfferItem } from './offers';
import { MotionContext, useReduceMotion } from './useLoop';
import { useAutoScroll } from './useAutoScroll';

type Props = {
  offers?: OfferItem[];
  onPressOffer?: (offer: OfferItem) => void;
  /** colour of the screen behind the cards: used for the edge fade and the flight ticket notches */
  fadeColor?: string;
  /** stop the auto-scroll (e.g. when the screen is hidden) */
  paused?: boolean;
  /** auto-scroll speed in px per second (HTML: ~57) */
  speed?: number;
  style?: StyleProp<ViewStyle>;
};

const GAP = 14;
const PAD = 20;
const transparent = (hex: string) => (/^#[0-9a-f]{6}$/i.test(hex) ? `${hex}00` : 'rgba(0,0,0,0)');

/**
 * Auto-scrolling offer cards (port of Offer_Cards.html).
 * - cards slide right-to-left in a seamless loop; pressing a card pauses it and lifts the card
 * - each card keeps its own small animations (wheels, clouds, sparkles, road, tape...)
 * - "reduce motion" on the phone: no animation, plain swipeable row
 */
export function OfferCards({ offers = DEFAULT_OFFERS, onPressOffer, fadeColor, paused, speed = 56.7, style }: Props) {
  const reduce = useReduceMotion();
  const { width: screenW } = useWindowDimensions();
  const cardW = screenW <= 520 ? 200 : 224;
  const setW = offers.length * (cardW + GAP);
  const notch = fadeColor ?? '#ffffff';

  const [layoutW, setLayoutW] = useState(0);
  const { x, hold, release } = useAutoScroll({ setW, speed, disabled: reduce || paused || !offers.length });

  const renderSet = (setIndex: number) => offers.map((o, i) => (
    <View key={`${setIndex}-${i}`} style={{ marginRight: GAP }} accessibilityElementsHidden={setIndex === 1} importantForAccessibility={setIndex === 1 ? 'no-hide-descendants' : 'auto'}>
      <OfferCard offer={o} width={cardW} notchColor={notch} pulse={i % 2 === 1} onPress={onPressOffer} onHold={hold} onRelease={release} />
    </View>
  ));

  const box: ViewStyle = { height: CARD_H + 24, paddingTop: 6, overflow: 'hidden' };
  // identical copies + a transform-only track = nothing to re-layout while it moves

  if (reduce) {
    return (
      <MotionContext.Provider value={false}>
        <View style={[{ height: CARD_H + 24, paddingTop: 6 }, style]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: PAD }}>{renderSet(0)}</ScrollView>
        </View>
      </MotionContext.Provider>
    );
  }

  const edge = Math.max(8, layoutW * 0.04);
  return (
    <MotionContext.Provider value>
      <View style={[box, style]} onLayout={(e) => setLayoutW(e.nativeEvent.layout.width)} accessibilityLabel="Offers, scrolling automatically. Press and hold to pause.">
        <Animated.View style={{ position: 'absolute', top: 6, left: 0, flexDirection: 'row', width: setW * 2 + PAD, paddingLeft: PAD, transform: [{ translateX: x }] }}>
          {renderSet(0)}
          {renderSet(1)}
        </Animated.View>
        {!!fadeColor && (
          <>
            <LinearGradient pointerEvents="none" colors={[fadeColor, transparent(fadeColor)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: edge }} />
            <LinearGradient pointerEvents="none" colors={[transparent(fadeColor), fadeColor]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: edge }} />
          </>
        )}
      </View>
    </MotionContext.Provider>
  );
}
