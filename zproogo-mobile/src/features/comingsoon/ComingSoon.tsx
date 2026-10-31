import React from 'react';
import { View } from 'react-native';
import { Screen, Txt } from '../../components/ui';
import { Icon, IconName } from '../../components/Icon';
import { useTheme } from '../../theme/ThemeProvider';

/** Only Bus is live for now. Train, Flight, Hotel, Cab, Parcel and Bike all open this screen. */
const ICONS: Record<string, IconName> = { TRAIN: 'train', FLIGHT: 'plane', HOTEL: 'hotel', CAB: 'car', PARCEL: 'box', BIKE: 'bike' };
const LABELS: Record<string, string> = { TRAIN: 'Train', FLIGHT: 'Flight', HOTEL: 'Hotel', CAB: 'Cab', PARCEL: 'Parcel', BIKE: 'Bike' };

export function ComingSoonScreen({ route }: any) {
  const { c } = useTheme();
  const key: string = route?.params?.service ?? '';
  const label = LABELS[key];
  return (
    <Screen title={label} scroll={false}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 }}>
        <View style={{ width: 110, height: 110, borderRadius: 55, backgroundColor: c.chip, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={ICONS[key] ?? 'clock'} size={44} color={c.brand} />
        </View>
        <View style={{ marginTop: 24, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999, backgroundColor: c.chip, borderWidth: 1, borderColor: c.border }}>
          <Txt v="body" bold color={c.brand} center style={{ letterSpacing: 1.2, textTransform: 'uppercase' }}>Coming Soon</Txt>
        </View>
        <Txt v="body" muted center style={{ marginTop: 14, paddingHorizontal: 40 }}>
          {label ? `${label} booking` : 'This service'} is on its way. Stay tuned!
        </Txt>
      </View>
    </Screen>
  );
}
