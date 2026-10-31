import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Avatar, IconButton, Row, Txt } from '../ui';
import { Icon } from '../Icon';
import { Logo } from '../widgets';

export type HomeHeaderProps = {
  name?: string | null;
  photoUrl?: string | null;
  /** real-time city of the user (empty until the first fix) */
  city?: string;
  /** 'locating' | 'ok' | 'denied' | 'error' - drives the text shown when there is no city yet */
  locationStatus?: 'locating' | 'ok' | 'denied' | 'error';
  /** tapping the location re-checks the GPS */
  onPressLocation?: () => void;
  onPressBell?: () => void;
  onPressAvatar?: () => void;
};

/** Top bar of Home / Bus: logo, the user's live city, offers bell and the profile avatar. */
export function HomeHeader({ name, photoUrl, city, locationStatus, onPressLocation, onPressBell, onPressAvatar }: HomeHeaderProps) {
  const { c } = useTheme();
  const label = city
    ? city
    : locationStatus === 'denied' ? 'Enable location'
    : locationStatus === 'error' ? 'Tap to retry'
    : 'Locating…';
  return (
    <Row style={{ height: 48 }}>
      <Logo height={30} />
      <View style={{ flex: 1, marginLeft: 6 }}>
        <Pressable onPress={onPressLocation} accessibilityRole="button" accessibilityLabel={`Current city ${label}. Tap to refresh`}
          hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', maxWidth: '100%' }}>
          <Icon name="pin" size={14} color={c.brand} />
          <Txt v="small" style={{ marginLeft: 4, flexShrink: 1 }} numberOfLines={1}>{label}</Txt>
        </Pressable>
      </View>
      <IconButton name="bell" label="Offers" badge onPress={onPressBell} />
      <Pressable onPress={onPressAvatar} accessibilityLabel="Account">
        <Avatar name={name ?? 'Guest'} url={photoUrl ?? undefined} size={36} />
      </Pressable>
    </Row>
  );
}
