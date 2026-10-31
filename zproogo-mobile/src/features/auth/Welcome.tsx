import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { Avatar, Button, Card, Row, Txt, HoldTimer } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { useAuth } from '../../store/auth';
import { useBooking } from '../../store/booking';
import { usePrefs } from '../../store/prefs';

/** Screen 18 - "Welcome back" with the user's photo (whiteboard 6) and what was merged from the guest session. */
export function WelcomeScreen({ navigation, route }: any) {
  const { c } = useTheme();
  const user = useAuth((s) => s.user);
  const hold = useBooking((s) => s.hold);
  const m = route.params?.merged;
  const go = () => {
    const pending = useAuth.getState().pending;
    useAuth.getState().setPending(null);
    // first-launch login (from the onboarding screen): nothing to go back to -> continue into the app
    if (route.params?.fromOnboarding) { navigation.replace(usePrefs.getState().locationAsked ? 'Main' : 'Location'); return; }
    navigation.goBack();
    if (pending) setTimeout(pending, 50);
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg, padding: 20 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Avatar name={user?.name ?? user?.mobile} url={user?.photoUrl} size={96} />
        <Txt v="h1" center style={{ marginTop: 16 }}>Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!</Txt>
        <Txt muted center>You're logged in. We kept everything from your guest session.</Txt>
        <Card style={{ alignSelf: 'stretch', marginTop: 16 }}>
          {[
            ['search', `${m?.searchesMerged ?? 0} recent search(es) saved`],
            ['ticket', hold ? 'Your selection is still on hold' : 'Ready to book'],
            ['users', `${m?.savedTravellers ?? 0} saved traveller(s) ready to prefill`],
          ].map(([i, t]) => (
            <Row key={t} style={{ paddingVertical: 6 }}><Icon name="check" size={14} color={c.success} /><Icon name={i as any} size={14} color={c.brand} /><Txt v="small">{t}</Txt></Row>
          ))}
        </Card>
        {hold && <HoldTimer expiresAt={hold.expiresAt} label="Hold continues" />}
      </View>
      <Button title={useAuth.getState().pending ? 'Continue booking' : 'Continue'} onPress={go} />
    </SafeAreaView>
  );
}
