import React from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';
import { FONT } from '../../theme/typography';
import { toast } from '../../utils/toast';
import { useBusUi } from './busResultTheme';

type Props = {
  from: string;
  to: string;
  /** Used to open the real route in Google Maps (e.g. "Swargate Bus Stand, Pune"). Defaults to the city names. */
  fromQuery?: string;
  toQuery?: string;
};

/**
 * Route map from the HTML mock-up (water, roads, dashed red route, hollow pickup pin, filled drop pin, city labels).
 * It is drawn with SVG so it works offline in a list without a Google Maps key; tapping it opens the real route in Maps.
 */
export function RouteMap({ from, to, fromQuery, toQuery }: Props) {
  const ui = useBusUi();
  const open = () => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(fromQuery ?? from)}&destination=${encodeURIComponent(toQuery ?? to)}&travelmode=driving`;
    Linking.openURL(url).catch(() => toast('Could not open Maps', 'error'));
  };
  const land = ui.isDark ? '#1B2A3F' : '#EEF0F3', water = ui.isDark ? '#15405E' : '#D6E8F5', road = ui.isDark ? '#2A3D57' : '#FFFFFF';
  return (
    <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`Route map from ${from} to ${to}. Opens in Maps`}
      style={{ borderRadius: 12, overflow: 'hidden', backgroundColor: land }}>
      <View style={{ width: '100%', aspectRatio: 326 / 160 }}>
        <Svg width="100%" height="100%" viewBox="0 0 326 160" preserveAspectRatio="xMidYMid slice">
          <Rect x="0" y="0" width="326" height="160" fill={land} />
          <Path d="M200 160 C 215 120, 240 105, 262 82 C 285 60, 300 30, 326 20 L326 160 Z" fill={water} />
          <Path d="M-10 110 C 60 100, 120 130, 190 96 S 290 70, 340 60" fill="none" stroke={road} strokeWidth={7} />
          <Path d="M40 -10 C 60 40, 90 70, 100 170" fill="none" stroke={road} strokeWidth={6} />
          <Path d="M150 -10 C 160 40, 180 60, 230 90" fill="none" stroke={road} strokeWidth={5} />
          <Path d="M-10 50 C 50 45, 110 20, 170 30 S 260 20, 340 -5" fill="none" stroke={road} strokeWidth={4} />
          <Path d="M42 126 C 85 112, 118 128, 168 100 S 240 78, 276 54" fill="none" stroke={ui.red} strokeWidth={3} strokeDasharray="6 5" strokeLinecap="round" />
          <Circle cx="42" cy="126" r="7" fill="#FFFFFF" stroke={ui.red} strokeWidth={3} />
          <Circle cx="276" cy="54" r="7" fill={ui.red} />
          <Circle cx="276" cy="54" r="2.5" fill="#FFFFFF" />
          <SvgText x="42" y="148" textAnchor="middle" fontSize="11" fontFamily={FONT.uiSemi} fill={ui.ink}>{from}</SvgText>
          <SvgText x="276" y="39" textAnchor="middle" fontSize="11" fontFamily={FONT.uiSemi} fill={ui.ink}>{to}</SvgText>
        </Svg>
      </View>
      <View style={{ position: 'absolute', right: 8, bottom: 8, backgroundColor: ui.surface, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
        <Text style={{ fontFamily: FONT.uiMedium, fontSize: 11, color: ui.red }}>Open in Maps</Text>
      </View>
    </Pressable>
  );
}
