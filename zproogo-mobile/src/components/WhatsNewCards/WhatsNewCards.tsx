import React, { useState } from 'react';
import { Animated, ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { CARD_H, CARD_W, WhatsNewCard } from './WhatsNewCard';
import { DEFAULT_WHATS_NEW, WhatsNewItem } from './whatsNew';
import { MotionContext, useReduceMotion } from '../OfferCards/useLoop';
import { useAutoScroll } from '../OfferCards/useAutoScroll';

type Props = {
  items?: WhatsNewItem[];
  onPressCard?: (item: WhatsNewItem) => void;
  /** colour of the screen behind the cards: used for the edge fade (CSS mask) */
  fadeColor?: string;
  /** stop the auto-scroll (e.g. when the screen is hidden) */
  paused?: boolean;
  /** seconds for one full loop of the card set (HTML: 30) */
  loopSeconds?: number;
  style?: StyleProp<ViewStyle>;
};

const GAP = 14;
const PAD = 20;
const transparent = (hex: string) => (/^#[0-9a-f]{6}$/i.test(hex) ? `${hex}00` : 'rgba(0,0,0,0)');

/**
 * Auto-scrolling "What's new" cards (port of What_s_New_Auto-scrolling_Cards.html).
 * - cards slide right-to-left in a seamless 30s linear loop
 * - touching / holding anywhere on the row pauses it (CSS :hover / :active), letting go resumes from the same spot
 * - 6% edge fade on both sides
 * - phone "reduce motion": no animation, plain swipeable row
 */
export function WhatsNewCards({ items = DEFAULT_WHATS_NEW, onPressCard, fadeColor, paused, loopSeconds = 30, style }: Props) {
  const reduce = useReduceMotion();
  const setW = items.length * (CARD_W + GAP);
  const speed = setW / loopSeconds; // px per second

  const [layoutW, setLayoutW] = useState(0);
  const { x, hold, release } = useAutoScroll({ setW, speed, disabled: reduce || paused || !items.length });

  const renderSet = (setIndex: number) => items.map((it, i) => (
    <View
      key={`${setIndex}-${i}`}
      style={{ marginRight: GAP }}
      accessibilityElementsHidden={setIndex === 1}
      importantForAccessibility={setIndex === 1 ? 'no-hide-descendants' : 'auto'}
    >
      <WhatsNewCard item={it} onPress={onPressCard} />
    </View>
  ));

  // CSS .track padding: 10px 20px 18px  -> room above for the lift, below for the shadow
  const boxH = CARD_H + 10 + 18;

  if (reduce) {
    return (
      <MotionContext.Provider value={false}>
        <View style={[{ height: boxH }, style]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: PAD, paddingRight: PAD - GAP, paddingTop: 10 }}>{renderSet(0)}</ScrollView>
        </View>
      </MotionContext.Provider>
    );
  }

  const edge = Math.max(8, layoutW * 0.06);
  return (
    <MotionContext.Provider value>
      <View
        style={[{ height: boxH, overflow: 'hidden' }, style]}
        onLayout={(e) => setLayoutW(e.nativeEvent.layout.width)}
        onTouchStart={hold}
        onTouchEnd={release}
        onTouchCancel={release}
        accessibilityLabel="What's new, scrolling automatically. Touch and hold to pause."
      >
        <Animated.View style={{ position: 'absolute', top: 10, left: 0, flexDirection: 'row', width: setW * 2 + PAD, paddingLeft: PAD, transform: [{ translateX: x }] }}>
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
