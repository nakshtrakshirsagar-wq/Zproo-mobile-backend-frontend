import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../theme/ThemeProvider';
import { Box, Button, Card, HoldTimer, Row, Screen, Txt } from '../../components/ui';
import { ConfirmDialog } from '../../components/widgets';
import { Icon } from '../../components/Icon';
import { Api } from '../../api/endpoints';
import { useBooking } from '../../store/booking';
import { startPayment } from './pay';
import { rupees } from '../../utils/format';
import dayjs from 'dayjs';

/** Screens 80-82: pending (poll the server every 3 s up to 20 min) -> confirmed / failed (retry, hold kept). */
export function PaymentStatusScreen({ navigation, route }: any) {
  const { c } = useTheme();
  const { bookingId } = route.params;
  const started = useRef(Date.now());
  const [mock, setMock] = useState(false);
  const q = useQuery({ queryKey: ['booking', bookingId], queryFn: () => Api.booking(bookingId),
    refetchInterval: (qq) => (['PENDING', 'PAID'].includes(qq.state.data?.status ?? 'PENDING') && Date.now() - started.current < 20 * 60_000 ? 3000 : false) });
  const b = q.data;
  const scale = useRef(new Animated.Value(0.3)).current;
  useEffect(() => { if (b?.status === 'CONFIRMED') { Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4 }).start(); useBooking.getState().reset(); } }, [b?.status, scale]);

  const failed = b && (b.status === 'FAILED' || b.status === 'EXPIRED' || (b.status === 'PENDING' && (b as any).payments?.some((p: any) => p.status === 'FAILED') && !(b as any).payments?.some((p: any) => p.status === 'CREATED')));
  const retry = async () => {
    const r = await startPayment(bookingId).catch(() => 'cancelled' as const);
    if (r === 'mock') setMock(true); else q.refetch();
  };

  if (!b) return <Screen back={false} title=""><ActivityIndicator color={c.brand} /></Screen>;
  if (b.status === 'CONFIRMED' && b.mode === 'CAB') {
    const d = b.details;
    return (
      <Screen back={false} title="" footer={<View style={{ gap: 8 }}>
        <Button title={d.now ? 'Track your ride' : 'View ride'} icon="navi" onPress={() => navigation.replace('CabRide', { id: b.id })} />
        <Button title="Go to My Trips" variant="outline" onPress={() => navigation.navigate('Main', { screen: 'MyTrips' })} /></View>}>
        <Animated.View style={{ alignSelf: 'center', marginTop: 30, transform: [{ scale }], width: 110, height: 110, borderRadius: 55, backgroundColor: c.successBg, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="car" size={52} color={c.success} />
        </Animated.View>
        <Txt v="h1" center style={{ marginTop: 16 }}>{d.now ? 'Ride booked!' : 'Ride scheduled!'}</Txt>
        <Txt muted center>{d.title}</Txt>
        <Card style={{ alignItems: 'center', marginTop: 16 }}>
          <Txt v="xs" muted>{d.now ? 'Finding a driver near you' : `Pickup ${dayjs(d.pickupAt).format('ddd, D MMM · hh:mm A')}`}</Txt>
          <Txt v="h1" color={c.brand} style={{ letterSpacing: 2 }}>{b.supplierPnr ?? b.code}</Txt>
          <Txt v="small" muted>{d.categoryLabel} · {d.tripLabel} · booking {b.code}</Txt>
        </Card>
        {b.payOption === 'PAY_TO_DRIVER'
          ? <Box text={`Pay ${rupees(b.breakup.totalPaise)} to the driver by cash or UPI after the ride.`} icon="wallet" />
          : <Box kind="success" text={`Paid ${rupees(b.totalPaise)} online.`} icon="check" />}
        <Box text={d.now ? 'Driver details and your start OTP appear on the ride screen in a moment.' : 'Driver details and your start OTP are shared 15 minutes before pickup.'} icon="info" />
      </Screen>
    );
  }
  if (b.status === 'CONFIRMED') {
    return (
      <Screen back={false} title="" footer={<View style={{ gap: 8 }}>
        <Button title="View ticket" icon="ticket" onPress={() => navigation.replace('BookingDetails', { id: b.id })} />
        <Button title="Go to My Trips" variant="outline" onPress={() => navigation.navigate('Main', { screen: 'MyTrips' })} /></View>}>
        <Animated.View style={{ alignSelf: 'center', marginTop: 30, transform: [{ scale }], width: 110, height: 110, borderRadius: 55, backgroundColor: c.successBg, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={56} color={c.success} strokeWidth={3} />
        </Animated.View>
        <Txt v="h1" center style={{ marginTop: 16 }}>Booking confirmed!</Txt>
        <Txt muted center>{b.details.title}</Txt>
        <Card style={{ alignItems: 'center', marginTop: 16 }}><Txt v="xs" muted>PNR</Txt><Txt v="h1" color={c.brand} style={{ letterSpacing: 2 }}>{b.supplierPnr ?? b.code}</Txt>
          <Txt v="small" muted>Booking {b.code} · paid {rupees(b.totalPaise)}</Txt></Card>
        <Row style={{ justifyContent: 'center', gap: 18, marginTop: 10 }}>
          {[['ticket', 'PDF'], ['phone', 'SMS'], ['mail', 'Email'], ['chat', 'WhatsApp'], ['bell', 'Push']].map(([i, t]) => (
            <View key={t} style={{ alignItems: 'center' }}><Icon name={i as any} color={c.success} /><Txt v="xs" muted>{t}</Txt></View>))}
        </Row>
        {b.payOption === 'PAY_AT_HOTEL' && <Box text="Pay at the hotel during check-in." />}
      </Screen>
    );
  }
  if (failed) {
    return (
      <Screen back={false} title="" footer={<View style={{ gap: 8 }}>
        {b.status === 'PENDING' && <Button title="Retry payment" icon="refresh" onPress={retry} />}
        <Button title="Back to home" variant="outline" onPress={() => navigation.popToTop()} /></View>}>
        <View style={{ alignSelf: 'center', marginTop: 30, width: 104, height: 104, borderRadius: 52, backgroundColor: c.dangerBg, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="x" size={50} color={c.danger} strokeWidth={3} />
        </View>
        <Txt v="h1" center style={{ marginTop: 16 }}>{b.status === 'PENDING' ? "Payment didn't go through" : 'Booking could not be completed'}</Txt>
        <Txt muted center>If money was debited, it is refunded automatically in 5–7 days.</Txt>
        {b.status === 'PENDING' && <HoldTimer expiresAt={b.breakup.holdExpiresAt} label={b.mode === 'CAB' ? 'Fare still locked' : 'Seats still held'} />}
        <ConfirmDialog visible={mock} title="Test payment" text="Simulate the gateway result" confirm="Success" cancel="Failure"
          onConfirm={async () => { setMock(false); await Api.payMock(bookingId, 'success'); q.refetch(); }}
          onCancel={async () => { setMock(false); await Api.payMock(bookingId, 'failure'); q.refetch(); }} />
      </Screen>
    );
  }
  return (
    <Screen back={false} title="">
      <ActivityIndicator size="large" color={c.brand} style={{ marginTop: 50 }} />
      <Txt v="h2" center style={{ marginTop: 20 }}>{b.status === 'PAID' ? (b.mode === 'CAB' ? 'Requesting your ride…' : 'Confirming with the operator…') : 'Approve the payment in your UPI app'}</Txt>
      <Txt muted center>Waiting for the payment gateway. Do not close the app.</Txt>
      <Card style={{ marginTop: 20 }}><Txt v="small" muted>Booking {b.code} · {rupees(b.totalPaise)} · status {b.status}</Txt></Card>
    </Screen>
  );
}
