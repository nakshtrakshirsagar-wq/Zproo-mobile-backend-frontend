import React, { useState } from 'react';
import { FlatList, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTheme } from '../../theme/ThemeProvider';
import { Badge, Card, Chip, ErrorView, Loading, Price, Row, Screen, Tabs, Txt } from '../../components/ui';
import { DateStrip } from '../../components/widgets';
import { Icon } from '../../components/Icon';
import { Api, Flight } from '../../api/endpoints';
import { duration, rupees, time24 } from '../../utils/format';

/** Screen 51 - flight list with fare strip, quick filters, airline image and "View more" (whiteboard 18). */
export function FlightListScreen({ navigation, route }: any) {
  const [query, setQuery] = useState(route.params.query);
  const [leg, setLeg] = useState<'OUT' | 'IN'>('OUT');
  const [f, setF] = useState({ nonstop: false, refundable: false, morning: false });
  const q = useQuery({ queryKey: ['flights', query], queryFn: () => Api.flightSearch(query) });
  const list = (leg === 'OUT' ? q.data?.outbound : q.data?.inbound) ?? [];
  const shown = list.filter((x) => (!f.nonstop || x.stops === 0) && (!f.refundable || x.fares.some((y) => y.cancelFeePaise < y.pricePaise))
    && (!f.morning || dayjs(x.departAt).hour() < 12));
  const legQuery = leg === 'OUT' ? query : { ...query, from: query.to, to: query.from, date: query.returnDate };
  return (
    <Screen scroll={false} padded={false} title={`${query.from} → ${query.to}`}>
      <View style={{ paddingHorizontal: 16 }}>
        {query.tripType === 'ROUND_TRIP' && <Tabs value={leg} onChange={setLeg} items={[{ value: 'OUT', label: `Onward ${dayjs(query.date).format('D MMM')}` }, { value: 'IN', label: `Return ${dayjs(query.returnDate).format('D MMM')}` }]} />}
        {leg === 'OUT' && q.data && <DateStrip dates={q.data.calendar.map((x) => x.date)} value={query.date}
          sub={(d) => { const m = q.data!.calendar.find((x) => x.date === d)?.minPaise; return m ? `₹${(m / 100000).toFixed(1)}k` : undefined; }}
          onPick={(d) => !dayjs(d).isBefore(dayjs(), 'day') && setQuery({ ...query, date: d })} />}
        <Row gap={6}>
          <Chip label="Non-stop" on={f.nonstop} onPress={() => setF({ ...f, nonstop: !f.nonstop })} />
          <Chip label="Refundable" on={f.refundable} onPress={() => setF({ ...f, refundable: !f.refundable })} />
          <Chip label="Morning" on={f.morning} onPress={() => setF({ ...f, morning: !f.morning })} />
        </Row>
      </View>
      {q.isLoading ? <Loading text="Searching airlines…" /> : q.error ? <ErrorView error={q.error} onRetry={q.refetch} /> : (
        <FlatList data={shown} keyExtractor={(x) => x.id} contentContainerStyle={{ padding: 16 }}
          ListHeaderComponent={query.tripType === 'ROUND_TRIP' ? <Txt v="xs" muted>Each direction is booked as a separate ticket.</Txt> : null}
          renderItem={({ item }) => <FlightCard f={item} onPress={() => navigation.navigate('FareOptions', { flight: item, query: legQuery })} />} />
      )}
    </Screen>
  );
}

const AIRLINE_COLORS: Record<string, string> = { EA: '#D90404', SW: '#1E3A5F', AV: '#0EA5E9', IF: '#2E9E6B' };
export function FlightCard({ f, onPress }: { f: Flight; onPress?: () => void }) {
  const { c } = useTheme();
  const [more, setMore] = useState(false);
  return (
    <Card onPress={onPress}>
      <Row>
        <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: AIRLINE_COLORS[f.airlineCode] ?? c.brand, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="plane" size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}><Txt v="h3">{f.airline}</Txt><Txt v="xs" muted>{f.flightNo} · {f.stops ? `${f.stops} stop via ${f.via}` : 'Non stop'}</Txt></View>
        <Price paise={f.fares[0].pricePaise} size={16} />
      </Row>
      <Row style={{ marginTop: 10 }}>
        <View><Txt v="h2">{time24(f.departAt)}</Txt><Txt v="xs" muted>{f.from} {f.terminalFrom}</Txt></View>
        <View style={{ flex: 1, alignItems: 'center' }}><Txt v="xs" muted>{duration(f.durationMin)}</Txt><View style={{ height: 2, backgroundColor: c.border, alignSelf: 'stretch', marginHorizontal: 10 }} /></View>
        <View style={{ alignItems: 'flex-end' }}><Txt v="h2">{time24(f.arriveAt)}</Txt><Txt v="xs" muted>{f.to} {f.terminalTo}</Txt></View>
      </Row>
      <Row style={{ marginTop: 8, justifyContent: 'space-between' }}>
        <Row gap={5}><Badge kind={f.stops ? 'warn' : 'success'} text={f.stops ? '1 stop' : 'Non stop'} />{f.international && <Badge kind="info" text="International" />}</Row>
        <Txt v="small" color={c.brand} onPress={() => setMore(!more)}>{more ? 'View less' : 'View more'}</Txt>
      </Row>
      {more && f.fares.map((x) => <Row key={x.key} style={{ justifyContent: 'space-between', marginTop: 4 }}><Txt v="xs" muted>{x.name} · {x.checkinBagKg} kg</Txt><Txt v="xs" color={c.success} bold>{rupees(x.pricePaise)}</Txt></Row>)}
    </Card>
  );
}
