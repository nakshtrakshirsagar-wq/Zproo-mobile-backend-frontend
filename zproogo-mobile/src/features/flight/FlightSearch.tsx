import React, { useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTheme } from '../../theme/ThemeProvider';
import { Button, Card, ChipGroup, Counter, Row, Screen, Section, Tabs, Txt } from '../../components/ui';
import { CalendarSheet, PickerSheet, Scene, SearchCard } from '../../components/widgets';
import { Icon } from '../../components/Icon';
import { Api } from '../../api/endpoints';
import { validateFlightSearch } from '../../utils/validation';
import { dateShort, ymd } from '../../utils/format';

/** Screen 50 - header image, one-way / round trip, city search, travellers, cabin ("flight type"), special fares, explore hotels (whiteboard 17, 25). */
export function FlightSearchScreen({ navigation }: any) {
  const { c } = useTheme();
  const airports = useQuery({ queryKey: ['airports'], queryFn: Api.airports, staleTime: 86400000 });
  const [trip, setTrip] = useState<'ONE_WAY' | 'ROUND_TRIP'>('ONE_WAY');
  const [from, setFrom] = useState('DEL');
  const [to, setTo] = useState('BLR');
  const [date, setDate] = useState(ymd(dayjs().add(3, 'day')));
  const [ret, setRet] = useState(ymd(dayjs().add(6, 'day')));
  const [pax, setPax] = useState({ adults: 1, children: 0, infants: 0 });
  const [cabin, setCabin] = useState('ECONOMY');
  const [special, setSpecial] = useState<string>('');
  const [pick, setPick] = useState<'from' | 'to' | 'date' | 'ret' | null>(null);
  const name = (code: string) => { const a = airports.data?.find((x) => x.code === code); return a ? `${a.city} (${code})` : code; };
  const errs = validateFlightSearch({ from, to, date, returnDate: ret, roundTrip: trip === 'ROUND_TRIP', ...pax });
  const firstErr = errs.from || errs.to || errs.date || errs.returnDate || errs.pax;
  const search = () => firstErr ? undefined : navigation.navigate('FlightList', { query: { from, to, date, returnDate: trip === 'ROUND_TRIP' ? ret : undefined, tripType: trip, ...pax, cabin, specialFare: special || undefined } });
  return (
    <Screen title="Flights" padded={false}>
      <Scene kind="plane" height={120}><View style={{ padding: 16 }}><Txt v="h1" color="#0B1F3A">Fly anywhere</Txt><Txt v="small" color="#1E3A5F">Best fares, re-checked live before you pay</Txt></View></Scene>
      <View style={{ padding: 16 }}>
        <Tabs value={trip} onChange={setTrip} items={[{ value: 'ONE_WAY', label: 'One way' }, { value: 'ROUND_TRIP', label: 'Round trip' }]} />
        <SearchCard onSwap={() => { setFrom(to); setTo(from); }} rows={[
          { icon: 'plane', label: 'From', value: name(from), onPress: () => setPick('from') },
          { icon: 'pin', label: 'To', value: name(to), onPress: () => setPick('to') },
          { icon: 'cal', label: 'Departure', value: dateShort(date), onPress: () => setPick('date'), chevron: true },
          ...(trip === 'ROUND_TRIP' ? [{ icon: 'cal' as const, label: 'Return', value: dateShort(ret), onPress: () => setPick('ret'), chevron: true }] : []),
        ]} />
        <Card>
          {([['adults', 'Adults', '12+ yrs', 1], ['children', 'Children', '2–11 yrs', 0], ['infants', 'Infants', 'under 2', 0]] as const).map(([k, l, s, min]) => (
            <Row key={k} style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
              <View><Txt v="h3">{l}</Txt><Txt v="xs" muted>{s}</Txt></View>
              <Counter value={pax[k]} min={min} max={k === 'infants' ? pax.adults : 9} onChange={(n) => setPax({ ...pax, [k]: n })} />
            </Row>
          ))}
        </Card>
        <Txt v="h3" style={{ marginTop: 8 }}>Flight type</Txt>
        <ChipGroup value={cabin} onChange={setCabin} options={[{ value: 'ECONOMY', label: 'Economy' }, { value: 'PREMIUM', label: 'Premium' }, { value: 'BUSINESS', label: 'Business' }]} />
        <ChipGroup value={special} onChange={(v) => setSpecial(v === special ? '' : v)} options={[{ value: 'STUDENT', label: 'Student' }, { value: 'SENIOR', label: 'Senior citizen' }, { value: 'ARMED_FORCES', label: 'Armed forces' }]} />
        <Button title="Search flights" icon="search" disabled={!!firstErr} onPress={search} />
        {!!firstErr && <Txt v="small" color={c.danger} center>{firstErr}</Txt>}
        <Section title="Explore" />
        <Card onPress={() => navigation.navigate('HotelSearch')}><Row><Icon name="hotel" color={c.brand} /><View style={{ flex: 1 }}><Txt v="h3">Explore hotels</Txt><Txt v="small" muted>Book a stay at your destination</Txt></View><Icon name="chev" color={c.muted} /></Row></Card>
        <Card onPress={() => { setFrom('BOM'); setTo('CDG'); }}><Row><Icon name="globe" color={c.brand} /><View style={{ flex: 1 }}><Txt v="h3">International: Mumbai → Paris</Txt><Txt v="small" muted>Visa, passport and insurance checks built in</Txt></View><Icon name="chev" color={c.muted} /></Row></Card>
      </View>
      <PickerSheet visible={pick === 'from' || pick === 'to'} onClose={() => setPick(null)} title="Select airport" items={airports.data ?? []}
        label={(a) => `${a.city} (${a.code})`} sub={(a) => a.country} onPick={(a) => (pick === 'from' ? setFrom(a.code) : setTo(a.code))} />
      <CalendarSheet visible={pick === 'date'} onClose={() => setPick(null)} value={date} onPick={(d) => { setDate(d); if (dayjs(ret).isBefore(d)) setRet(d); }} />
      <CalendarSheet visible={pick === 'ret'} onClose={() => setPick(null)} value={ret} minDate={date} onPick={setRet} title="Return date" />
    </Screen>
  );
}
