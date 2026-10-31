import React, { useState } from 'react';
import { ScrollView, StyleProp, View, ViewStyle, useWindowDimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BusOfferCard, BUS_CARD_H } from './BusOfferCard';
import { DEFAULT_BUS_OFFERS, BusOfferItem } from './busOffers';
import { MotionContext, useReduceMotion } from '../OfferCards/useLoop';

type Props = {
  offers?: BusOfferItem[];
  onPressOffer?: (offer: BusOfferItem) => void;
  /** colour of the screen behind the cards: used for the edge fade */
  fadeColor?: string;
  /** kept so BusHome does not need to change; the row no longer auto-scrolls */
  paused?: boolean;
  style?: StyleProp<ViewStyle>;
};

const GAP = 14;
const PAD = 20;
const transparent = (hex: string) => (/^#[0-9a-f]{6}$/i.test(hex) ? `${hex}00` : 'rgba(0,0,0,0)');

/**
 * Bus offer cards (port of Bus_Offer_Cards_Option3.2.html) as a STILL row: it does not move on its own.
 * Swipe sideways with your finger to see all cards. Each card keeps its own small animations
 * (shaking bus, spinning wheels, speed lines, moving road, pulsing chip); tap a code chip to copy the code.
 * Phone "reduce motion": the small animations stop too.
 */
export function BusOfferCards({ offers = DEFAULT_BUS_OFFERS, onPressOffer, fadeColor, style }: Props) {
  const reduce = useReduceMotion();
  const { width: screenW } = useWindowDimensions();
  const cardW = screenW <= 520 ? 200 : 224;
  const [layoutW, setLayoutW] = useState(0);
  const edge = Math.max(8, layoutW * 0.04);

  return (
    <MotionContext.Provider value={!reduce}>
      <View style={[{ height: BUS_CARD_H + 24 }, style]} onLayout={(e) => setLayoutW(e.nativeEvent.layout.width)}
        accessibilityLabel="Bus offers. Swipe sideways to see more.">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: PAD, paddingRight: PAD - GAP, paddingTop: 6 }}>
          {offers.map((o, i) => (
            <View key={i} style={{ marginRight: GAP }}>
              <BusOfferCard offer={o} width={cardW} pulse={i % 2 === 1} onPress={onPressOffer} />
            </View>
          ))}
        </ScrollView>
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
