import React, { useEffect, useState } from 'react';
import { Linking, Pressable, Share, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { useTheme } from '../../theme/ThemeProvider';
import { Badge, Box, Button, Card, ErrorView, Loading, PriceRow, Row, Screen, Section, Txt } from '../../components/ui';
import { ConfirmDialog, QrBlock } from '../../components/widgets';
import { Icon, IconName } from '../../components/Icon';
import { Api, OperatorTicket } from '../../api/endpoints';
import { Config } from '../../config';
import { loadTokens, installId } from '../../security/secureStore';
import { useSecureScreen } from '../../security/useSecureScreen';
import { dateLong, rupees, time, time24 } from '../../utils/format';
import { toast } from '../../utils/toast';
import { STATUS_BADGE } from './MyTrips';

/** Booking details + ticket (screens 30, 48, 58, 76, 84). Ticket card has no cut-out lines/circles (whiteboard 15) and a QR scanner line. */
export function BookingDetailsScreen({ navigation, route }: any) {
  useSecureScreen();
  const { c } = useTheme();
  const q = useQuery({ queryKey: ['booking', route.params.id], queryFn: () => Api.booking(route.params.id) });
  const [choice, setChoice] = useState(false);
  const b = q.data;
  if (!b) return <Screen title="Booking">{q.error ? <ErrorView error={q.error} onRetry={q.refetch} /> : <Loading />}</Screen>;
  const d = b.details;
  const [label, kind] = STATUS_BADGE[b.status] ?? [b.status, 'neutral'];
  const active = ['CONFIRMED', 'PARTIALLY_CANCELLED'].includes(b.status);

  const download = async () => {
    try {
      const t = await loadTokens();
      const path = `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/zproogo-${b.code}.pdf`;
      await ReactNativeBlobUtil.config({ path, addAndroidDownloads: { useDownloadManager: false, notification: true, path, mime: 'application/pdf', title: `Zproogo ${b.code}` } })
        .fetch('GET', `${Config.API_URL}/bookings/${b.id}/ticket`, { Authorization: `Bearer ${t?.accessToken}`, 'X-Install-Id': installId() });
      await ReactNativeBlobUtil.android.actionViewIntent(path, 'application/pdf').catch(() => undefined);
      toast('Ticket saved to Downloads', 'success');
    } catch { toast('Could not download ticket', 'error'); }
  };

  const actions: { icon: IconName; label: string; on: () => void; show: boolean }[] = [
    { icon: 'download', label: 'Download', on: download, show: active || b.status === 'COMPLETED' },
    { icon: 'share', label: 'Share', on: () => Share.share({ message: `${d.title} · ${b.code} · PNR ${b.supplierPnr ?? '-'}` }), show: active },
    { icon: 'navi', label: 'Track bus', on: () => navigation.navigate('TrackBus', { id: b.id }), show: active && b.mode === 'BUS' },
    { icon: 'navi', label: b.status === 'CONFIRMED' ? 'Track ride' : 'Ride summary', on: () => navigation.navigate('CabRide', { id: b.id }), show: b.mode === 'CAB' && (active || b.status === 'COMPLETED' || !!d.rideStage) },
    { icon: 'plane', label: 'Flight status', on: () => navigation.navigate('FlightStatus', { id: b.id }), show: active && b.mode === 'FLIGHT' },
    { icon: 'train', label: 'PNR status', on: () => navigation.navigate('PnrStatus', { pnr: b.supplierPnr }), show: active && b.mode === 'TRAIN' },
    { icon: 'map', label: 'Directions', on: () => Linking.openURL(`https://maps.google.com/?q=${d.lat},${d.lng}`), show: active && b.mode === 'HOTEL' },
    { icon: 'shield', label: 'Safety kit', on: () => navigation.navigate('SafetyKit', { id: b.id }), show: active && (b.mode === 'BUS' || b.mode === 'CAB') },
    { icon: 'x', label: 'Cancel', on: () => navigation.navigate('CancelSelect', { id: b.id }), show: b.cancellable },
    { icon: 'star', label: 'Rate trip', on: () => navigation.navigate('RateTrip', { id: b.id }), show: b.status === 'COMPLETED' || (active && b.journeyStarted) },
    { icon: 'refresh', label: 'Refund', on: () => navigation.navigate('RefundTracker', { bookingId: b.id }), show: b.refunds.length > 0 },
    { icon: 'help', label: 'Help', on: () => navigation.navigate('Help', b.mode === 'CAB' ? { bookingId: b.id, category: 'RIDE' } : undefined), show: true },
  ];

  return (
    <Screen title="Booking details">
      {b.supplierAlert && !b.supplierAlert.resolved && (
        <Card highlight>
          <Row><Icon name="alert" color={c.danger} /><Txt v="h3" style={{ flex: 1 }}>{b.supplierAlert.message}</Txt></Row>
          <Txt v="small" muted style={{ marginTop: 4 }}>Choose within 24 hours, otherwise you get a full refund automatically.</Txt>
          <Button small title="Choose refund or travel credit" style={{ marginTop: 8 }} onPress={() => setChoice(true)} />
        </Card>
      )}
      <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, marginVertical: 6, borderWidth: 1, borderColor: c.border }}>
        <Row><Txt v="h3" color="#D90404" style={{ flex: 1 }}>{b.mode === 'BUS' ? d.operator : b.mode === 'FLIGHT' ? `${d.airline} ${d.flightNo}` : b.mode === 'TRAIN' ? d.train
          : b.mode === 'CAB' ? `${d.categoryLabel} · ${d.tripLabel}` : d.hotel}</Txt><Badge text={label} kind={kind} /></Row>
        {b.mode === 'CAB' ? (
          <View style={{ marginTop: 10, gap: 8 }}>
            {[['Pickup', d.pickup, d.now && !d.ride?.startedAt ? 'Ride now' : `${dateLong(d.ride?.startedAt ?? d.pickupAt)} · ${time(d.ride?.startedAt ?? d.pickupAt)}`],
              ...(d.drop ? [['Drop', d.drop, d.ride?.completedAt ? `${time(d.ride.completedAt)}${d.distanceKm ? ` · ${d.distanceKm} km` : ''}` : d.distanceKm ? `${d.distanceKm} km` : '']] : [])]
              .map(([k, p, sub]: any) => (
                <View key={k}><Txt v="xs" color="#64748B">{k}</Txt><Txt v="h3" color="#0B1F3A">{p.name}</Txt><Txt v="xs" color="#64748B">{p.area}, {p.city}{sub ? ` · ${sub}` : ''}</Txt></View>))}
            {d.rentalLabel && <Txt v="small" color="#0B1F3A">Package {d.rentalLabel}</Txt>}
            {d.returnAt && <Txt v="small" color="#0B1F3A">Return {dateLong(d.returnAt)} · {time(d.returnAt)}</Txt>}
          </View>
        ) : b.mode === 'HOTEL' ? (
          <View style={{ marginTop: 10 }}>
            <Txt v="h2" color="#0B1F3A">{d.hotel}</Txt><Txt v="small" color="#64748B">{d.area}</Txt>
            <Row style={{ marginTop: 10, justifyContent: 'space-between' }}>
              {[['Check-in', `${dateLong(d.checkIn)} · ${d.checkInTime}`], ['Check-out', `${dateLong(d.checkOut)} · ${d.checkOutTime}`]].map(([k, v]) => (
                <View key={k}><Txt v="xs" color="#64748B">{k}</Txt><Txt v="small" color="#0B1F3A" bold>{v}</Txt></View>))}
            </Row>
          </View>
        ) : (
          <Row style={{ marginTop: 12 }}>
            <View><Txt v="h1" color="#0B1F3A">{b.mode === 'FLIGHT' ? d.from : (d.fromCity ?? d.from ?? '').slice(0, 4).toUpperCase()}</Txt><Txt v="xs" color="#64748B">{b.mode === 'FLIGHT' ? time24(d.departAt) : time(d.departAt)}</Txt></View>
            <View style={{ flex: 1, alignItems: 'center' }}><Icon name={b.mode === 'BUS' ? 'bus' : b.mode === 'TRAIN' ? 'train' : 'plane'} color="#D90404" /></View>
            <View style={{ alignItems: 'flex-end' }}><Txt v="h1" color="#0B1F3A">{b.mode === 'FLIGHT' ? d.to : (d.toCity ?? d.to ?? '').slice(0, 4).toUpperCase()}</Txt><Txt v="xs" color="#64748B">{b.mode === 'FLIGHT' ? time24(d.arriveAt) : time(d.arriveAt)}</Txt></View>
          </Row>
        )}
        <Row style={{ marginTop: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          {[[b.mode === 'CAB' ? 'Ride ID' : 'PNR', b.supplierPnr ?? '—'], ['Booking', b.code],
            b.mode === 'CAB' ? ['Car', d.driver ? d.driver.vehicleNo : d.categoryLabel] : b.mode === 'BUS' ? ['Seats', (d.seats ?? []).join(', ')] : b.mode === 'TRAIN' ? ['Coach/Berth', `${d.coach ?? ''} ${(d.berths ?? []).join(',')}`] : b.mode === 'FLIGHT' ? ['Fare', d.fareName] : ['Rooms', `${d.qty} × ${d.room}`],
          ].map(([k, v]) => <View key={k}><Txt v="xs" color="#64748B">{k}</Txt><Txt v="small" color="#0B1F3A" bold>{v}</Txt></View>)}
        </Row>
        {active && b.mode !== 'CAB' && <View style={{ marginTop: 14 }}><QrBlock value={JSON.stringify({ c: b.code, p: b.supplierPnr })} size={120} /></View>}
        {b.mode === 'CAB' && d.driver && <Txt v="xs" color="#64748B" center style={{ marginTop: 10 }}>{d.driver.name} · {d.driver.vehicleColor} {d.driver.vehicleModel} {d.driver.vehicleNo}</Txt>}
        {b.mode === 'CAB' && active && <Txt v="xs" color="#64748B" center style={{ marginTop: 6 }}>Your start OTP is on the ride screen (Track ride).</Txt>}
        {b.mode === 'BUS' && d.conductorPhone && <Txt v="xs" color="#64748B" center style={{ marginTop: 8 }}>Bus {d.vehicleNo} · Conductor {d.conductorPhone}</Txt>}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 }}>
        {actions.filter((a) => a.show).map((a) => (
          <Pressable key={a.label} onPress={a.on} style={{ width: '31.5%', alignItems: 'center', gap: 4, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
            <Icon name={a.icon} color={a.icon === 'x' ? c.danger : c.text} /><Txt v="xs">{a.label}</Txt>
          </Pressable>
        ))}
      </View>

      {b.mode === 'BUS' && ['CONFIRMED', 'PARTIALLY_CANCELLED', 'COMPLETED', 'CANCELLATION_PENDING', 'CANCELLED', 'REFUND_INITIATED', 'REFUNDED'].includes(b.status) && <OperatorTicketCard bookingId={b.id} stored={d.supplierTicket} />}

      <Section title={b.mode === 'CAB' ? 'Rider' : 'Travellers'} />
      <Card>{b.items.filter((i) => i.kind !== 'ADDON').map((i) => (
        <Row key={i.id} style={{ paddingVertical: 4 }}><Txt style={{ flex: 1 }}>{i.paxName ?? i.label}{i.paxAge ? ` · ${i.paxAge}` : ''}</Txt>
          <Txt v="small" muted>{i.label}</Txt>{i.status === 'CANCELLED' && <Badge text="Cancelled" kind="danger" />}</Row>))}</Card>
      <Section title="Payment" />
      <Card>
        <PriceRow label="Base fare" paise={b.breakup.basePaise} />
        {b.breakup.discountPaise > 0 && <PriceRow label={`Offer ${b.breakup.coupon}`} paise={b.breakup.discountPaise} minus />}
        {b.breakup.walletPaise > 0 && <PriceRow label="Wallet" paise={b.breakup.walletPaise} minus />}
        <PriceRow label={b.payOption === 'PAY_AT_HOTEL' ? 'Pay at hotel' : b.payOption === 'PAY_TO_DRIVER' ? 'Pay driver (cash / UPI)' : 'Paid'}
          paise={b.payOption === 'PAY_AT_HOTEL' || b.payOption === 'PAY_TO_DRIVER' ? b.breakup.totalPaise : b.totalPaise} total />
      </Card>
      {b.womenMode && <Box kind="success" icon="shield" text={`Women helpline ${Config.WOMEN_HELPLINE} · SOS is available in the Safety kit during the trip.`} />}

      <ConfirmDialog visible={choice} icon="refresh" title="Trip cancelled by operator" text="Choose a 100% refund to your payment source, or travel credit with a 10% bonus in your Zproogo wallet."
        confirm="Travel credit +10%" cancel="Full refund" onConfirm={async () => { setChoice(false); await Api.supplierChoice(b.id, 'CREDIT').catch((e) => toast(e.message, 'error')); q.refetch(); }}
        onCancel={async () => { setChoice(false); await Api.supplierChoice(b.id, 'REFUND').catch((e) => toast(e.message, 'error')); q.refetch(); }} />
      <Txt v="xs" muted center style={{ marginTop: 8 }}>Total {rupees(b.totalPaise)} · booked {dateLong(b.travelDate)}</Txt>
    </Screen>
  );
}

const OP_BADGE: Record<OperatorTicket['status'], [string, 'success' | 'warn' | 'danger' | 'neutral']> = {
  BOOKED: ['Confirmed by operator', 'success'], BLOCKED: ['Seats reserved', 'warn'], CANCELLED: ['Cancelled', 'danger'], TRAVELLED: ['Journey completed', 'neutral'], UNKNOWN: ['Status unknown', 'neutral'],
};

/** Bus only: the ticket as the operator holds it (Get Ticket by Block Key), with a refresh button. */
function OperatorTicketCard({ bookingId, stored }: { bookingId: string; stored?: OperatorTicket }) {
  const { c } = useTheme();
  const [t, setT] = useState<OperatorTicket | undefined>(stored);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const load = async (refresh: boolean) => {
    setBusy(true); setErr(null);
    try { setT((await Api.operatorTicket(bookingId, refresh)).ticket); }
    catch (e: any) { setErr(e?.message ?? 'Could not read the ticket from the operator'); }
    finally { setBusy(false); }
  };
  // right after booking the operator already has the ticket: show it without an extra tap
  useEffect(() => { load(false); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const point = (p: OperatorTicket['boarding']) => [p.name, p.time, p.landmark].filter(Boolean).join(' · ');
  return (
    <>
      <Section title="Operator ticket" />
      <Card>
        {!t && busy && <Txt v="small" muted>Reading your ticket from the operator…</Txt>}
        {t && (
          <View style={{ gap: 6 }}>
            <Row><Badge text={OP_BADGE[t.status][0]} kind={OP_BADGE[t.status][1]} /></Row>
            {!!t.pnr && <Row><Txt v="small" muted style={{ flex: 1 }}>Operator PNR</Txt><Txt>{t.pnr}</Txt></Row>}
            {!!t.ticketNo && <Row><Txt v="small" muted style={{ flex: 1 }}>Ticket no.</Txt><Txt>{t.ticketNo}</Txt></Row>}
            {!!t.departureTime && <Row><Txt v="small" muted style={{ flex: 1 }}>Departure</Txt><Txt>{t.departureTime}</Txt></Row>}
            {!!t.vehicleNo && <Row><Txt v="small" muted style={{ flex: 1 }}>Bus no.</Txt><Txt>{t.vehicleNo}</Txt></Row>}
            {!!point(t.boarding) && <Row><Txt v="small" muted style={{ flex: 1 }}>Boarding</Txt><Txt style={{ flex: 2, textAlign: 'right' }}>{point(t.boarding)}</Txt></Row>}
            {!!t.boarding.phone && <Pressable onPress={() => Linking.openURL('tel:' + t.boarding.phone.replace(/[^\d+]/g, ''))}><Txt v="small" color="#D90404">Call boarding point {t.boarding.phone}</Txt></Pressable>}
            {!!point(t.dropping) && <Row><Txt v="small" muted style={{ flex: 1 }}>Dropping</Txt><Txt style={{ flex: 2, textAlign: 'right' }}>{point(t.dropping)}</Txt></Row>}
            {!!t.boarding.address && <Txt v="xs" color="#64748B">Boarding contact: {t.boarding.address}</Txt>}
            {!!t.conductorPhone && <Pressable onPress={() => Linking.openURL('tel:' + t.conductorPhone.replace(/[^\d+]/g, ''))}><Txt v="small" color="#D90404">Call conductor {t.conductorPhone}</Txt></Pressable>}
            {t.passengers.map((p, i) => <Row key={i}><Txt style={{ flex: 1 }}>{p.name || 'Passenger'}</Txt><Txt v="small" muted>Seat {p.seatNo}</Txt></Row>)}
            {t.totalFarePaise > 0 && <Row><Txt v="small" muted style={{ flex: 1 }}>Operator fare</Txt><Txt>{rupees(t.totalFarePaise)}</Txt></Row>}
            {t.paidPaise != null && t.paidPaise > 0 && <Row><Txt v="small" muted style={{ flex: 1 }}>Paid to operator</Txt><Txt>{rupees(t.paidPaise)}</Txt></Row>}
            {t.status === 'CANCELLED' && t.refundPaise != null && <Row><Txt v="small" muted style={{ flex: 1 }}>Operator refund</Txt><Txt>{rupees(t.refundPaise)}</Txt></Row>}
            {!!t.cancellationPolicy && <Txt v="xs" color="#64748B">{t.cancellationPolicy}</Txt>}
            <Txt v="xs" color="#64748B">Updated {time(t.fetchedAt)}</Txt>
          </View>
        )}
        {!!err && <Txt v="small" color={c.danger} style={{ marginTop: 6 }}>{err}</Txt>}
        {(t || !!err) && <View style={{ marginTop: 10 }}><Button title={t ? 'Refresh from operator' : 'Try again'} onPress={() => load(!!t)} loading={busy} variant="outline" /></View>}
      </Card>
    </>
  );
}
