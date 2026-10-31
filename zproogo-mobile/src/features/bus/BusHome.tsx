import React, { useCallback, useState } from 'react';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTheme } from '../../theme/ThemeProvider';
import { Card } from '../../components/ui';
import { type } from '../../theme/typography';
import { HomeTop } from '../../components/HomeTop';
import { BusServiceNav } from '../../components/BusServiceNav';
import { BusOfferCards } from '../../components/BusOfferCards';
import { WhatsNewCards } from '../../components/WhatsNewCards';
import { BusSearchCard } from '../../components/BusSearchCard';
import { Api } from '../../api/endpoints';
import { useAuth } from '../../store/auth';
import { usePrefs } from '../../store/prefs';
import { useLiveCity } from '../../hooks/useLiveCity';

/** Section heading: Sub-Header = Montserrat Medium 18; action link = Inter Regular 13. */
function BusSection({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 8 }}>
      <Text style={[type('subHeader'), { color: c.text }]}>{title}</Text>
      {!!action && <Pressable onPress={onAction} hitSlop={8}><Text style={[type('label', 13), { color: c.brand }]}>{action}</Text></Pressable>}
    </View>
  );
}

/**
 * Bus page (opened from Bus in Home's service bar). Same content as Home, with three differences:
 * scrollable BusServiceNav, BusOfferCards, and no "Rate Us" section.
 */
export function BusHomeScreen({ navigation }: any) {
  const { c } = useTheme();
  const user = useAuth((s) => s.user);
  const live = useLiveCity();
  const focused = useIsFocused();
  const recent = useQuery({ queryKey: ['recent'], queryFn: Api.recentSearches });
  // only Bus is live, so only bus searches are listed
  const busRecent = (recent.data ?? []).filter((r) => r.mode === 'BUS');
  const [focusKey, setFocusKey] = useState(0);
  useFocusEffect(useCallback(() => { setFocusKey((n) => n + 1); }, []));

  const openRecent = (r: { mode: string; query: any }) => {
    const q = r.query;
    const date = dayjs(q.date ?? q.checkIn).isBefore(dayjs(), 'day') ? dayjs().format('YYYY-MM-DD') : (q.date ?? q.checkIn);
    if (r.mode === 'BUS') navigation.navigate('BusResults', { from: q.from, to: q.to, date, women: usePrefs.getState().womenMode });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <HomeTop
          name={user?.name} photoUrl={user?.photoUrl} city={live.city} locationStatus={live.status} onPressLocation={live.retry} playKey={focusKey}
          onPressBell={() => navigation.navigate('Offers')}
          onPressAvatar={() => navigation.navigate('Main', { screen: 'Account' })}
        />

        <BusServiceNav value="BUS" onChange={(key) => {
          if (key !== 'BUS') navigation.navigate('ComingSoon', { service: key });
        }} />

        <BusSearchCard onSearch={(q) => navigation.navigate('BusResults', q)} />

        <BusSection title="Bus offers" action="View all" onAction={() => navigation.navigate('Offers')} />
        <BusOfferCards fadeColor={c.bg} paused={!focused} onPressOffer={() => navigation.navigate('Offers')} style={{ marginHorizontal: -16 }} />

        <BusSection title="What’s new" />
        <WhatsNewCards fadeColor={c.bg} style={{ marginHorizontal: -16 }} />

        {!!busRecent.length && <>
          <BusSection title="Recent searches" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {busRecent.map((r) => (
              <Card key={r.mode + r.label} onPress={() => openRecent(r)} style={{ paddingVertical: 8, minWidth: 140 }}>
                <Text style={[type('listTitle'), { color: c.text }]}>{r.label}</Text>
                <Text style={[type('label'), { color: c.muted }]}>{r.mode.charAt(0) + r.mode.slice(1).toLowerCase()} · {r.mode === 'CAB' ? (r.query.when === 'NOW' ? 'Ride now' : dayjs(r.query.pickupAt).format('D MMM')) : dayjs(r.query.date ?? r.query.checkIn).format('D MMM')}</Text>
              </Card>
            ))}
          </ScrollView>
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}
