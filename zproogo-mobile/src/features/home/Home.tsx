import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTheme } from '../../theme/ThemeProvider';
import { Button, Card, Chip, Row, Section, Txt } from '../../components/ui';
import { HomeTop } from '../../components/HomeTop';
import { BOTTOM_NAV_SPACE } from '../../components/BottomNav';
import { ServiceNav } from '../../components/ServiceNav';
import { OfferCards } from '../../components/OfferCards';
import { RateUs } from '../../components/RateUs';
import { WhatsNewCards } from '../../components/WhatsNewCards';
import { Api } from '../../api/endpoints';
import { useAuth } from '../../store/auth';
import { usePrefs } from '../../store/prefs';
import { useLiveCity } from '../../hooks/useLiveCity';
import { BusSearchCard } from '../../components/BusSearchCard';
import Clipboard from '@react-native-clipboard/clipboard';
import { toast } from '../../utils/toast';

/** Screen 04 - Home. Guests can use everything; login only at booking. */
export function HomeScreen({ navigation }: any) {
  const { c } = useTheme();
  const user = useAuth((s) => s.user);
  const live = useLiveCity();
  const recent = useQuery({ queryKey: ['recent'], queryFn: Api.recentSearches });
  // replay the banner intro each time Home comes back into focus
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
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: BOTTOM_NAV_SPACE }} showsVerticalScrollIndicator={false}>
        <HomeTop
          name={user?.name} photoUrl={user?.photoUrl} city={live.city} locationStatus={live.status} onPressLocation={live.retry} playKey={focusKey}
          onPressBell={() => navigation.navigate('Offers')}
          onPressAvatar={() => navigation.navigate('Main', { screen: 'Account' })}
        />

        <ServiceNav value="BUS" onChange={(key) => {
          if (key === 'BUS') return navigation.navigate('BusHome');
          navigation.navigate('ComingSoon', { service: key });
        }} />

        <BusSearchCard onSearch={(q) => navigation.navigate('BusResults', q)} />

        <Section title="Offers for you" action="View all" onAction={() => navigation.navigate('Offers')} />
        <OfferCards fadeColor={c.bg} onPressOffer={() => navigation.navigate('Offers')} style={{ marginHorizontal: -16 }} />

        <Section title="Rate Us" />
        <RateUs />

        <Section title="What’s new" />
        <WhatsNewCards fadeColor={c.bg} style={{ marginHorizontal: -16 }} />

        {!!busRecent.length && <>
          <Section title="Recent searches" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {busRecent.map((r) => (
              <Card key={r.mode + r.label} onPress={() => openRecent(r)} style={{ paddingVertical: 8, minWidth: 140 }}>
                <Txt v="h3" style={{ fontSize: 12 }}>{r.label}</Txt>
                <Txt v="xs" muted>{r.mode.charAt(0) + r.mode.slice(1).toLowerCase()} · {r.mode === 'CAB' ? (r.query.when === 'NOW' ? 'Ride now' : dayjs(r.query.pickupAt).format('D MMM')) : dayjs(r.query.date ?? r.query.checkIn).format('D MMM')}</Txt>
              </Card>
            ))}
          </ScrollView>
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Offers tab (screen 05) - copy code. */
export function OffersScreen() {
  const { c } = useTheme();
  const offers = useQuery({ queryKey: ['offers'], queryFn: Api.offers });
  const [mode, setMode] = useState('ALL');
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: BOTTOM_NAV_SPACE }}>
        <Txt v="h1">Offers</Txt>
        <Row gap={6} style={{ flexWrap: 'wrap', marginVertical: 8 }}>
          {['ALL', 'BUS', 'TRAIN', 'FLIGHT', 'HOTEL', 'CAB'].map((m) => <Chip key={m} label={m === 'ALL' ? 'All' : m.charAt(0) + m.slice(1).toLowerCase()} on={mode === m} onPress={() => setMode(m)} />)}
        </Row>
        {(offers.data ?? []).filter((o) => mode === 'ALL' || o.modes.includes(mode)).map((o, i) => (
          <LinearGradient key={o.code} colors={i % 2 ? ['#0EA5E9', '#1E3A5F'] : ['#1E3A5F', '#D90404']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ borderRadius: 16, padding: 14, marginVertical: 6 }}>
            <Txt v="h2" color="#fff">{o.title}</Txt>
            <Txt v="small" color="#fff">{o.description}</Txt>
            <Row style={{ marginTop: 10, justifyContent: 'space-between' }}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}><Txt v="small" color="#fff" bold>{o.code}</Txt></View>
              <Button small variant="white" title="Copy" icon="copy" onPress={() => { Clipboard.setString(o.code); toast(`Code ${o.code} copied`, 'success'); }} />
            </Row>
          </LinearGradient>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
