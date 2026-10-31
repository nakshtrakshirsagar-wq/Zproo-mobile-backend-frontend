import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { Button, Txt, Box } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { usePrefs } from '../../store/prefs';
import { allowAndEnableLocation } from '../../utils/deviceLocation';

// NOTE: the first-launch slider + login now lives in components/onboarding (see OnboardingScreen.tsx).
// This file only keeps the one-time "Allow location" screen that follows it.


export function LocationScreen({ navigation }: any) {
  const { c } = useTheme();
  const go = () => { usePrefs.getState().set({ locationAsked: true }); navigation.replace('Main'); };
  const allow = async () => {
    await allowAndEnableLocation(); // app permission + turns the phone's Location setting ON
    go();
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg, padding: 24 }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: c.chip, alignItems: 'center', justifyContent: 'center' }}><Icon name="pin" size={54} color={c.brand} /></View>
        <Txt v="h1" center style={{ marginTop: 20 }}>Find trips near you</Txt>
        <Txt muted center style={{ marginTop: 8 }}>Allow location to fill your From city and show nearby boarding points. You can skip this.</Txt>
        <Box text="Optional. We never track you in the background." />
      </View>
      <Button title="Allow location" icon="navi" onPress={allow} />
      <Button title="Not now" variant="outline" onPress={go} style={{ marginTop: 8 }} />
    </SafeAreaView>
  );
}
