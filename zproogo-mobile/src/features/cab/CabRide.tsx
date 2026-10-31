import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Linking, Pressable, Share, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import MapView, { Marker, Polyline } from 'react-native-maps';
import dayjs from 'dayjs';
import { useTheme } from '../../theme/ThemeProvider';
import { Avatar, Badge, Box, Button, Card, ErrorView, Loading, Row, Screen, Section, Stepper, Txt } from '../../components/ui';
import { Icon, IconName } from '../../components/Icon';
import { Api, CabRide } from '../../api/endpoints';
import { useSecureScreen } from '../../security/useSecureScreen';
import { rupees } from '../../utils/format';
import { toast } from '../../utils/toast';

const STEP: Record<string, number> = { PENDING: 0, SCHEDULED: 0, SEARCHING: 0, ASSIGNED: 1, ARRIVED: 2, IN_PROGRESS: 3, COMPLETED: 5 };
const ENDED = ['COMPLETED', 'CANCELLED', 'NO_DRIVER'];

/** CAB·05 - live ride: finding driver -> driver on the way (OTP) -> arrived (waiting) -> on trip -> completed. Polls every 4 s while active. */
export function CabRideScreen({ navigation, route }: any) {
  useSecureScreen();
  const { c } = useTheme();
  const qc = useQueryClient();
  const id: string = route.params.id;
  const q = useQuery({ queryKey: ['ride', id], queryFn: () => Api.cabRide(id),
    refetchInterval: (qq) => { const s = qq.state.data?.stage; return s && ENDED.includes(s) ? false : s === 'SCHEDULED' ? 30_000 : 4000; } });
  const r = q.data;
  const prev = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!r || r.stage === prev.current) return;
    if (prev.current) {
      if (r.stage === 'ASSIGNED') toast(`${r.driver?.name ?? 'Your driver'} is on the way`, 'success');
      if (r.stage === 'ARRIVED') toast('Your driver has arrived', 'success');
      if (r.stage === 'NO_DRIVER') toast('No driver found. Full refund started.', 'error');
    }
    if (ENDED.includes(r.stage)) { qc.invalidateQueries({ queryKey: ['trips'] }); qc.invalidateQueries({ queryKey: ['booking', id] }); }
    prev.current = r.stage;
  }, [r, qc, id]);

  if (!r) return <Screen title="Your ride">{q.error ? <ErrorView error={q.error} onRetry={q.refetch} /> : <Loading text="Loading your ride…" />}</Screen>;
  const t = r.trip;
  const target = r.stage === 'IN_PROGRESS' ? t.drop ?? t.pickup : t.pickup;
  const car = r.position;
  const region = car
    ? { latitude: (car.lat + target.lat) / 2, longitude: (car.lng + target.lng) / 2, latitudeDelta: Math.max(0.02, Math.abs(car.lat - target.lat) * 2.2), longitudeDelta: Math.max(0.02, Math.abs(car.lng - target.lng) * 2.2) }
    : { latitude: t.pickup.lat, longitude: t.pickup.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 };
  const live = ['ASSIGNED', 'ARRIVED', 'IN_PROGRESS'].includes(r.stage);

  const share = async () => {
    try {
      const s = await Api.share(id, car?.lat, car?.lng);
      Share.share({ message: `I'm on a Zproogo ride${r.driver ? ` in ${r.driver.vehicleModel} ${r.driver.vehicleNo}` : ''}. Track live: ${s.link}` });
    } catch (e: any) { toast(e.message, 'error'); }
  };
  const actions: { icon: IconName; label: string; on: () => void; show: boolean; danger?: boolean }[] = [
    { icon: 'phone', label: 'Call driver', on: () => Linking.openURL('tel:' + r.driver!.phone), show: !!r.driver && live },
    { icon: 'share', label: 'Share trip', on: share, show: live },
    { icon: 'shield', label: 'Safety / SOS', on: () => navigation.navigate('SafetyKit', { id }), show: live || r.stage === 'SEARCHING', danger: true },
    { icon: 'ticket', label: 'Receipt', on: () => navigation.navigate('BookingDetails', { id }), show: true },
    { icon: 'help', label: 'Help', on: () => navigation.navigate('Help', { bookingId: id, category: 'RIDE' }), show: true },
  ];

  return (
    <Screen title={r.stageLabel} padded={false} onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main', { screen: 'MyTrips' }))}>
      <MapView style={{ height: 260 }} region={region} toolbarEnabled={false}>
        <Marker coordinate={{ latitude: t.pickup.lat, longitude: t.pickup.lng }} title="Pickup" description={t.pickup.name} pinColor="green" />
        {t.drop && <Marker coordinate={{ latitude: t.drop.lat, longitude: t.drop.lng }} title="Drop" description={t.drop.name} />}
        {car && <Marker coordinate={{ latitude: car.lat, longitude: car.lng }} title={r.driver?.vehicleNo ?? 'Your cab'} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={{ backgroundColor: c.brand, borderRadius: 14, padding: 5, borderWidth: 2, borderColor: '#fff' }}><Icon name="car" size={16} color="#fff" /></View>
        </Marker>}
        {car && live && <Polyline coordinates={[{ latitude: car.lat, longitude: car.lng }, { latitude: target.lat, longitude: target.lng }]} strokeColor={c.brand} strokeWidth={3} lineDashPattern={[6, 6]} />}
      </MapView>

      <View style={{ padding: 16 }}>
        {!['CANCELLED', 'NO_DRIVER'].includes(r.stage) && <Stepper step={STEP[r.stage] ?? 0} labels={['Booked', 'Driver', 'Arrived', 'On trip', 'Done']} />}
        <StatusCard r={r} />

        {r.otp && (
          <Card highlight={r.stage === 'ARRIVED' || r.stage === 'ASSIGNED'}>
            <Row>
              <Icon name="lock" color={c.brand} />
              <View style={{ flex: 1 }}><Txt v="h3">Start OTP</Txt><Txt v="xs" muted>Share only after you are in the car and the number plate matches</Txt></View>
              <View accessible accessibilityLabel={`OTP ${r.otp.split('').join(' ')}`}><Txt v="title" color={c.brand} style={{ letterSpacing: 6 }}>{r.otp}</Txt></View>
            </Row>
          </Card>
        )}

        {r.driver && <DriverCard r={r} />}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 }}>
          {actions.filter((a) => a.show).map((a) => (
            <Pressable key={a.label} onPress={a.on} accessibilityRole="button"
              style={{ width: '31.5%', alignItems: 'center', gap: 4, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: a.danger ? c.rose : c.border, backgroundColor: a.danger ? c.dangerBg : c.surface }}>
              <Icon name={a.icon} color={a.danger ? c.danger : c.text} /><Txt v="xs">{a.label}</Txt>
            </Pressable>
          ))}
        </View>

        <Section title="Trip" />
        <Card>
          <Row style={{ alignItems: 'flex-start' }}>
            <View style={{ alignItems: 'center', paddingTop: 4 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.success }} />
              {t.drop && <><View style={{ width: 2, height: 30, backgroundColor: c.border }} /><View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: c.brand }} /></>}
            </View>
            <View style={{ flex: 1, gap: 14 }}>
              <View><Txt v="h3">{t.pickup.name}</Txt><Txt v="xs" muted>{t.pickup.area} · {t.now ? 'Ride now' : dayjs(t.pickupAt).format('ddd, D MMM · hh:mm A')}</Txt></View>
              {t.drop && <View><Txt v="h3">{t.drop.name}</Txt><Txt v="xs" muted>{t.drop.area}, {t.drop.city}{t.distanceKm ? ` · ${t.distanceKm} km` : ''}</Txt></View>}
            </View>
          </Row>
          <Row gap={6} style={{ flexWrap: 'wrap', marginTop: 10 }}>
            <Badge text={`${t.categoryLabel} · ${t.tripLabel}`} kind="info" />
            {t.rentalLabel && <Badge text={t.rentalLabel} />}
            {t.roundTrip && t.returnAt && <Badge text={`Return ${dayjs(t.returnAt).format('D MMM, hh:mm A')}`} />}
            {t.women && <Badge kind="ladies" text="Women safety ride" />}
          </Row>
        </Card>

        <Section title="Payment" />
        <Card>
          {r.payOption === 'PAY_TO_DRIVER'
            ? <Row><Icon name="wallet" color={c.brand} /><View style={{ flex: 1 }}><Txt v="h3">Pay driver {rupees(r.amountDuePaise)}</Txt><Txt v="xs" muted>Cash or UPI at the end of the ride</Txt></View></Row>
            : <Row><Icon name="check" color={c.success} /><View style={{ flex: 1 }}><Txt v="h3">Paid online {rupees(r.paidPaise)}</Txt>
              <Txt v="xs" muted>{r.amountDuePaise > 0 ? `Extras to pay driver: ${rupees(r.amountDuePaise)}` : 'Tolls/parking beyond the estimate are paid as actuals'}</Txt></View></Row>}
        </Card>

        {r.canCancel && (
          <Button variant="outline" icon="x" style={{ marginTop: 12 }}
            title={r.cancelFeePaise ? `Cancel ride · fee ${rupees(r.cancelFeePaise)}` : 'Cancel ride · free'}
            onPress={() => navigation.navigate('CancelConfirm', { id, itemIds: [] })} />
        )}
        {r.canCancel && r.cancelNote && <Txt v="xs" muted center style={{ marginTop: 4 }}>{r.cancelNote}</Txt>}
        {r.stage === 'COMPLETED' && !r.rated && <Button title="Rate your ride · earn 50 points" icon="star" style={{ marginTop: 12 }} onPress={() => navigation.navigate('RateTrip', { id })} />}
        {['CANCELLED', 'NO_DRIVER'].includes(r.stage) && <>
          <Button title="Track refund" icon="refresh" style={{ marginTop: 12 }} onPress={() => navigation.navigate('RefundTracker', { bookingId: id })} />
          <Button title="Book another cab" variant="outline" style={{ marginTop: 8 }} onPress={() => navigation.navigate('CabSearch')} />
        </>}
        <Txt v="xs" muted center style={{ marginTop: 10 }}>Ride {r.rideId ?? '—'} · Booking {r.code}</Txt>
      </View>
    </Screen>
  );
}

function StatusCard({ r }: { r: CabRide }) {
  const { c } = useTheme();
  const wait = r.waitingMin > r.freeWaitMin;
  const body = {
    PENDING: ['clock', 'Waiting for payment', 'Complete the payment to request your ride.'],
    SCHEDULED: ['cal', `Pickup ${dayjs(r.trip.pickupAt).format('ddd, D MMM · hh:mm A')}`, r.message ?? 'Driver details arrive 15 minutes before pickup.'],
    SEARCHING: ['search', 'Finding a driver near you…', 'Usually takes under a minute. You can cancel for free.'],
    ASSIGNED: ['navi', `Arriving in ${r.etaMin ?? '—'} min`, `${r.driver?.name ?? 'Your driver'} is on the way to ${r.trip.pickup.name}.`],
    ARRIVED: ['pin', 'Your driver is here', wait ? `Waiting ${r.waitingMin} min · charges apply after ${r.freeWaitMin} free minutes` : `Free waiting: ${Math.max(0, r.freeWaitMin - r.waitingMin)} min left`],
    IN_PROGRESS: ['navi', `Reaching in ${r.etaMin ?? '—'} min`, `${r.distanceKm ?? 0} km done · enjoy your ride`],
    COMPLETED: ['check', 'You have arrived', `${r.distanceKm ?? r.trip.distanceKm ?? ''} km · ${r.times.completedAt ? dayjs(r.times.completedAt).format('hh:mm A') : ''}`],
    CANCELLED: ['x', 'Ride cancelled', 'Any refund due is on its way. Track it below.'],
    NO_DRIVER: ['alert', 'No driver found', 'Sorry! No driver accepted this ride. Anything you paid is refunded in full.'],
  }[r.stage] ?? ['info', r.stageLabel, r.message ?? ''];
  const bad = ['CANCELLED', 'NO_DRIVER'].includes(r.stage);
  return (
    <Card>
      <Row>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: bad ? c.dangerBg : r.stage === 'COMPLETED' ? c.successBg : c.chip, alignItems: 'center', justifyContent: 'center' }}>
          {r.stage === 'SEARCHING' ? <ActivityIndicator color={c.brand} /> : <Icon name={body[0] as IconName} color={bad ? c.danger : r.stage === 'COMPLETED' ? c.success : c.brand} />}
        </View>
        <View style={{ flex: 1 }}><Txt v="h2">{body[1]}</Txt><Txt v="small" muted>{body[2]}</Txt></View>
      </Row>
      {wait && r.stage === 'ARRIVED' && <Box kind="warn" text="Please reach the pickup point. Waiting charges are added after the free minutes." />}
    </Card>
  );
}

function DriverCard({ r }: { r: CabRide }) {
  const { c } = useTheme();
  const d = r.driver!;
  return (
    <Card>
      <Row>
        <Avatar name={d.name} size={46} />
        <View style={{ flex: 1 }}>
          <Row gap={6}><Txt v="h3">{d.name}</Txt>{d.verified && <Badge kind="success" text="Verified" />}</Row>
          <Row gap={4}><Icon name="star" size={11} color={c.warning} fill={c.warning} /><Txt v="xs" muted>{d.rating.toFixed(2)} · {d.trips.toLocaleString('en-IN')} trips</Txt></Row>
          <Txt v="small" muted>{d.vehicleColor} {d.vehicleModel}</Txt>
        </View>
        <View style={{ borderWidth: 2, borderColor: '#0B1F3A', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#FFF8D6' }}>
          <Txt v="h3" color="#0B1F3A" style={{ letterSpacing: 1 }}>{d.vehicleNo}</Txt>
        </View>
      </Row>
      {r.trip.women && d.gender === 'F' && <Box kind="success" icon="shield" text="Women driver assigned for your safety ride" />}
    </Card>
  );
}
