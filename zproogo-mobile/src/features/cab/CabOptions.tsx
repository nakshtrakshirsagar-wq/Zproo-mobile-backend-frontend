import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import MapView, { Marker, Polyline } from 'react-native-maps';
import dayjs from 'dayjs';
import { useTheme } from '../../theme/ThemeProvider';
import { Badge, Box, Button, Card, EmptyState, Loading, Price, PriceRow, Row, Screen, Sheet, Txt } from '../../components/ui';
import { ConfirmDialog } from '../../components/widgets';
import { Icon } from '../../components/Icon';
import { Api, CabCategory, CabOption, CabTripReq } from '../../api/endpoints';
import { useAction } from '../../hooks/useApi';
import { useRequireLogin } from '../../hooks/useRequireLogin';
import { useBooking } from '../../store/booking';
import { duration, rupees } from '../../utils/format';
import { toast } from '../../utils/toast';

/** CAB·02 - route map, car types with live fare + ETA, fare details; "Book" locks the fare (guest allowed) then opens login if needed. */
export function CabOptionsScreen({ navigation, route }: any) {
  const { c } = useTheme();
  const req: CabTripReq = route.params.req;
  const q = useQuery({ queryKey: ['cabest', req], queryFn: () => Api.cabEstimate(req), retry: false, refetchInterval: req.when === 'NOW' ? 60_000 : false });
  const [sel, setSel] = useState<CabCategory | null>(null);
  const [fare, setFare] = useState<CabOption | null>(null);
  const [changed, setChanged] = useState<{ previousPaise: number; newPaise: number } | null>(null);
  const requireLogin = useRequireLogin();
  const map = useRef<MapView>(null);
  const data = q.data;

  useEffect(() => {
    if (!data) return;
    const cur = data.options.find((o) => o.category === sel);
    if (!cur?.available) setSel(data.options.find((o) => o.available)?.category ?? null);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const opt = data?.options.find((o) => o.category === sel);
  const hold = useAction((accepted: number) => Api.hold({ mode: 'CAB', ...req, category: sel, acceptedFarePaise: accepted }), {
    onSuccess: (h) => {
      useBooking.getState().setHold(h, !!req.women);
      requireLogin(() => navigation.navigate('CabRider'));
    },
    onError: (e) => {
      if (e.code === 'FARE_CHANGED') return setChanged(e.details);
      toast(e.message, 'error');
      if (e.code === 'CAB_UNAVAILABLE') q.refetch();
    },
  });

  const coords = useMemo(() => {
    if (!data) return [];
    const pts = [data.trip.pickup, ...(data.trip.drop ? [data.trip.drop] : [])].map((p) => ({ latitude: p.lat, longitude: p.lng }));
    return pts;
  }, [data]);
  const fit = () => coords.length > 1 && map.current?.fitToCoordinates(coords, { edgePadding: { top: 40, bottom: 40, left: 40, right: 40 }, animated: false });

  if (q.isLoading) return <Screen title="Choose a ride"><Loading text="Finding cars near you…" /></Screen>;
  if (q.error || !data) {
    const e: any = q.error;
    const suggest = e?.details?.suggest as 'OUTSTATION' | 'CITY' | undefined;
    return (
      <Screen title="Choose a ride">
        <EmptyState icon={e?.code === 'NETWORK' ? 'wifi' : 'car'} title={e?.code === 'NETWORK' ? 'No internet connection' : 'We can’t book this trip'} text={e?.message} />
        {suggest && <Button title={`Book as ${suggest === 'OUTSTATION' ? 'Outstation' : 'City ride'}`} icon="refresh"
          onPress={() => navigation.replace('CabOptions', { req: { ...req, tripType: suggest, when: suggest === 'OUTSTATION' && req.when === 'LATER' ? 'LATER' : req.when, roundTrip: false } })} />}
        <Button title="Change trip" variant="outline" style={{ marginTop: 8 }} onPress={() => navigation.goBack()} />
        {e?.code === 'NETWORK' && <Button title="Retry" variant="ghost" onPress={() => q.refetch()} />}
      </Screen>
    );
  }

  const t = data.trip;
  const when = t.now ? 'Ride now' : dayjs(t.pickupAt).format('ddd, D MMM · hh:mm A');
  return (
    <Screen title={t.tripLabel} padded={false} scroll={false} footer={
      <View>
        <Row>
          <View style={{ flex: 1 }}>
            <Txt v="small" muted>{opt ? `${opt.label} · ${opt.seats} seats · ${opt.bags} bags` : 'No car selected'}</Txt>
            {opt ? <Price paise={opt.farePaise} size={18} /> : <Txt v="h2">—</Txt>}
          </View>
          <Button style={{ flex: 1.2 }} title={opt ? `Book ${opt.label}` : 'Book'} icon="car" disabled={!opt?.available} loading={hold.isPending} onPress={() => opt && hold.mutate(opt.farePaise)} />
        </Row>
        <Txt v="xs" muted center style={{ marginTop: 4 }}>Fare is locked for {data.fareLockMin} minutes once you tap Book</Txt>
      </View>}>
      <MapView ref={map} style={{ height: 180 }} onMapReady={fit} onLayout={fit} toolbarEnabled={false}
        initialRegion={{ latitude: t.pickup.lat, longitude: t.pickup.lng, latitudeDelta: 0.12, longitudeDelta: 0.12 }}>
        <Marker coordinate={{ latitude: t.pickup.lat, longitude: t.pickup.lng }} title="Pickup" description={t.pickup.name} pinColor="green" />
        {t.drop && <Marker coordinate={{ latitude: t.drop.lat, longitude: t.drop.lng }} title="Drop" description={t.drop.name} />}
        {data.route && <Polyline coordinates={data.route.path.map((p) => ({ latitude: p.lat, longitude: p.lng }))} strokeColor={c.brand} strokeWidth={4} />}
      </MapView>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <Card>
          <Txt v="h3" numberOfLines={2}>{t.title}</Txt>
          <Row gap={6} style={{ flexWrap: 'wrap', marginTop: 4 }}>
            <Badge text={when} kind="info" />
            {data.route && <Badge text={`${data.route.distanceKm} km · ${duration(data.route.durationMin)}`} />}
            {t.roundTrip && t.returnAt && <Badge text={`Return ${dayjs(t.returnAt).format('D MMM, hh:mm A')}`} />}
            {t.women && <Badge kind="ladies" text="Women safety ride" />}
          </Row>
        </Card>
        {data.notices.map((n) => <Box key={n} kind="warn" text={n} />)}
        {data.options.map((o) => <OptionCard key={o.category} o={o} on={o.category === sel} now={t.now} women={t.women}
          onPress={() => (o.available ? setSel(o.category) : toast(o.unavailableReason ?? 'Not available', 'info'))} onFare={() => setFare(o)} />)}
        <Box icon="shield" text="Every driver is ID- and police-verified. Rides are GPS-tracked, with SOS and live trip sharing." />
      </ScrollView>

      <Sheet visible={!!fare} onClose={() => setFare(null)} title={fare ? `${fare.label} fare details` : ''}>
        {fare && <>
          <Card>
            {fare.lines.map((l) => <PriceRow key={l.code} label={l.label} paise={l.paise} />)}
            <PriceRow label="Estimated total" paise={fare.farePaise} total />
          </Card>
          <Txt v="small" muted>Zproogo convenience fee and offers are applied at checkout.</Txt>
          <Card>
            {fare.rules.includedKm != null && <Txt v="small">• Includes {fare.rules.includedKm} km and {fare.rules.includedHours} hr</Txt>}
            {fare.rules.chargeableKm != null && <Txt v="small">• Charged for {fare.rules.chargeableKm} km{fare.rules.days ? ` over ${fare.rules.days} day(s)` : ''}</Txt>}
            <Txt v="small">• Extra km: {rupees(fare.rules.extraKmPaise)}/km{fare.rules.extraMinPaise ? ` · extra time: ${rupees(fare.rules.extraMinPaise)}/min` : ''}</Txt>
            <Txt v="small">• Waiting: first {fare.rules.freeWaitMin} min free, then {rupees(fare.rules.waitPerMinPaise)}/min</Txt>
            <Txt v="small">• Parking and tolls not in the estimate are paid as actuals</Txt>
            <Txt v="small">• Free cancellation until a driver is assigned (+3 min). Outstation: free until 24 h before pickup.</Txt>
          </Card>
        </>}
      </Sheet>
      <ConfirmDialog visible={!!changed} icon="alert" title="Fare updated" text={changed ? `Demand changed. The fare is now ${rupees(changed.newPaise)} (was ${rupees(changed.previousPaise)}).` : ''}
        confirm={changed ? `Continue at ${rupees(changed.newPaise)}` : 'Continue'} cancel="See other cars" loading={hold.isPending}
        onConfirm={() => { const n = changed!.newPaise; setChanged(null); hold.mutate(n); }} onCancel={() => { setChanged(null); q.refetch(); }} />
    </Screen>
  );
}

function OptionCard({ o, on, now, women, onPress, onFare }: { o: CabOption; on: boolean; now: boolean; women: boolean; onPress: () => void; onFare: () => void }) {
  const { c } = useTheme();
  return (
    <Card onPress={onPress} highlight={on} style={[!o.available && { opacity: 0.5 }]}>
      <Row>
        <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: on ? c.dangerBg : c.chip, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="car" size={24} color={c.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Row gap={6}><Txt v="h3">{o.label}</Txt>
            <Row gap={2}><Icon name="user" size={11} color={c.muted} /><Txt v="xs" muted>{o.seats}</Txt></Row>
            <Row gap={2}><Icon name="luggage" size={11} color={c.muted} /><Txt v="xs" muted>{o.bags}</Txt></Row>
          </Row>
          <Txt v="xs" muted numberOfLines={1}>{o.examples}</Txt>
          {o.available ? (
            <Row gap={5} style={{ flexWrap: 'wrap', marginTop: 3 }}>
              {now && o.etaMin != null && <Txt v="xs" color={c.success} bold>{o.etaMin} min away</Txt>}
              {o.surge > 1 && <Badge kind="warn" text={`×${o.surge.toFixed(1)} demand`} />}
              {women && o.womenDriver && <Badge kind="ladies" text="Women drivers" />}
            </Row>
          ) : <Txt v="xs" color={c.danger}>{o.unavailableReason}</Txt>}
        </View>
        {o.available && <View style={{ alignItems: 'flex-end' }}>
          <Price paise={o.farePaise} size={16} />
          <Txt v="xs" color={c.brand} onPress={onFare}>Fare details</Txt>
        </View>}
      </Row>
    </Card>
  );
}
