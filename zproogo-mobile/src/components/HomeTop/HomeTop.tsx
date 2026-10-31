import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { TravelBanner } from '../TravelBanner';
import { HomeHeader, HomeHeaderProps } from './HomeHeader';

export type HomeTopProps = HomeHeaderProps & {
  /** change this number to replay the banner intro (e.g. each time Home gains focus) */
  playKey?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Everything at the very top of Home as one reusable block:
 * the header bar (logo, greeting, bell, avatar) and the "Dream It, Travel It." banner under it.
 *   <HomeTop name={user?.name} city={city} playKey={focusKey} onPressBell={...} onPressAvatar={...} />
 */
export function HomeTop({ playKey, style, ...header }: HomeTopProps) {
  return (
    <View style={style}>
      <HomeHeader {...header} />
      <TravelBanner playKey={playKey} style={{ marginTop: 8, alignSelf: 'center', width: '100%' }} />
    </View>
  );
}
