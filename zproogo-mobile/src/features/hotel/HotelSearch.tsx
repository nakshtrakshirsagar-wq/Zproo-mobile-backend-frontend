import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTheme } from '../../theme/ThemeProvider';
import { Button, Card, Counter, Price, Row, Screen, Section, Sheet, Txt } from '../../components/ui';
import { CalendarSheet, PickerSheet, Scene, SearchCard } from '../../components/widgets';
import { Icon } from '../../components/Icon';
import { Api } from '../../api/endpoints';
import { HOTEL_CITIES } from '../../utils/places';
import { validateHotelSearch } from '../../utils/validation';
import { dateShort, ymd } from '../../utils/format';

/** Screen 67 - hotel search with header image, top hotels and recent searches (whiteboard 26). */
export function HotelSearchScreen({ navigation }: any) {
  const { c } = useTheme();
  const [city, setCity] = useState('Goa');
  const [checkIn, setIn] = useState(ymd(dayjs().add(7, 'day')));
  const [checkOut, setOut] = useState(ymd(dayjs().add(9, 'day')));
  const [rooms, setRooms] = useState(1);
  const [adults, setAdults] = useState(2);
  const [pick, setPick] = useState<'city' | 'in' | 'out' | 'guests' | null>(null);
  const top = useQuery({ queryKey: ['topHotels', city], queryFn: () => Api.hotelTop(city) });
  const recent = useQuery({ queryKey: ['recent'], queryFn: Api.recentSearches });
  const errs = validateHotelSearch({ city, checkIn, checkOut, rooms, adults });
  const firstErr = errs.city || errs.checkIn || errs.checkOut || errs.guests;
  const query = { city, checkIn, checkOut, rooms, adults };
  return (
    <Screen title="Hotels" padded={false}>
      <Scene kind="lake" height={130}><View style={{ padding: 16 }}><Txt v="h1" color="#0B1F3A">Find your <Txt v="h1" color="#D90404">perfect stay</Txt></Txt></View></Scene>
      <View style={{ padding: 16 }}>
        <SearchCard rows={[
          { icon: 'pin', label: 'City, area or hotel', value: city, onPress: () => setPick('city') },
          { icon: 'cal', label: 'Check-in', value: dateShort(checkIn), onPress: () => setPick('in'), chevron: true },
          { icon: 'cal', label: 'Check-out', value: `${dateShort(checkOut)} · ${dayjs(checkOut).diff(checkIn, 'day')} night(s)`, onPress: () => setPick('out'), chevron: true },
          { icon: 'users', label: 'Rooms & guests', value: `${rooms} room · ${adults} adults`, onPress: () => setPick('guests'), chevron: true },
        ]} />
        <Button title="Search hotels" icon="search" disabled={!!firstErr} onPress={() => navigation.navigate('HotelList', { query })} />
        {!!firstErr && <Txt v="small" color={c.danger} center>{firstErr}</Txt>}
        <Section title="Top hotels" action="View all" onAction={() => navigation.navigate('HotelList', { query: { ...query, sort: 'rating' } })} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {(top.data ?? []).map((h) => (
            <Card key={h.id} style={{ width: 170, padding: 0, overflow: 'hidden' }} onPress={() => navigation.navigate('HotelDetails', { id: h.id, query })}>
              <Scene kind={h.image === 'resort2' ? 'lake' : 'mountains'} height={80} />
              <View style={{ padding: 10 }}><Txt v="h3" numberOfLines={1}>{h.name}</Txt>
                <Row gap={4}><Icon name="star" size={11} color={c.warning} fill={c.warning} /><Txt v="xs">{h.rating}</Txt><Txt v="xs" muted>· {h.area}</Txt></Row>
                <Price paise={h.pricePaise} size={13} suffix="/night" /></View>
            </Card>
          ))}
        </ScrollView>
        {!!recent.data?.filter((r) => r.mode === 'HOTEL').length && <>
          <Section title="Recent searches" />
          {recent.data.filter((r) => r.mode === 'HOTEL').map((r) => (
            <Card key={r.label} onPress={() => navigation.navigate('HotelList', { query: { ...r.query, checkIn, checkOut } })}>
              <Row><Icon name="clock" color={c.muted} /><Txt>{r.label}</Txt></Row>
            </Card>))}
        </>}
      </View>
      <PickerSheet visible={pick === 'city'} onClose={() => setPick(null)} title="Where to?" items={HOTEL_CITIES} label={(x) => x} onPick={setCity} />
      <CalendarSheet visible={pick === 'in'} onClose={() => setPick(null)} value={checkIn} title="Check-in"
        onPick={(d) => { setIn(d); if (!dayjs(checkOut).isAfter(d)) setOut(ymd(dayjs(d).add(1, 'day'))); }} />
      <CalendarSheet visible={pick === 'out'} onClose={() => setPick(null)} value={checkOut} title="Check-out" minDate={ymd(dayjs(checkIn).add(1, 'day'))} onPick={setOut} />
      <Sheet visible={pick === 'guests'} onClose={() => setPick(null)} title="Rooms & guests">
        <Row style={{ justifyContent: 'space-between', paddingVertical: 10 }}><Txt v="h3">Rooms</Txt><Counter value={rooms} onChange={setRooms} min={1} max={5} /></Row>
        <Row style={{ justifyContent: 'space-between', paddingVertical: 10 }}><Txt v="h3">Adults</Txt><Counter value={adults} onChange={setAdults} min={1} max={10} /></Row>
        <Button title="Done" onPress={() => setPick(null)} />
      </Sheet>
    </Screen>
  );
}
