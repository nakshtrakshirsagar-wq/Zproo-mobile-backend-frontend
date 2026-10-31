import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Share, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import Svg, { Path, Rect } from 'react-native-svg';
import dayjs from 'dayjs';
import { useTheme } from '../../theme/ThemeProvider';
import { Avatar, Badge, Box, Button, Card, Chip, EmptyState, PriceRow, Row, Screen, Sheet, Stars, Tabs, Txt } from '../../components/ui';
import { ConfirmDialog } from '../../components/widgets';
import { Icon } from '../../components/Icon';
import { toast } from '../../utils/toast';
import { PARCEL_RULES, VEHICLES, scheduleSlots, validateRating, validateSchedule, validateTip, vehicleOf, weightOf } from './parcelRules';
import { ParcelOrder, ParcelStatus, canCancel, cancelQuote, etaMinutes, invoiceText, isOngoing, orderSubtitle, orderTitle, transitProgress, PARCEL_TIMING } from './parcelService';
import { useParcelDraft, useParcelStore } from './parcelStore';

const rs = (paise: number) => '₹' + Math.round(paise / 100).toLocaleString('en-IN');
export const PARCEL_STATUS: Record<ParcelStatus, [string, 'success' | 'danger' | 'warn' | 'info' | 'neutral']> = {
  SCHEDULED: ['Scheduled', 'info'], SEARCHING: ['Finding driver', 'warn'], NO_DRIVER: ['No driver yet', 'danger'], ASSIGNED: ['Driver assigned', 'info'],
  AT_PICKUP: ['At pickup', 'info'], IN_TRANSIT: ['In transit', 'warn'], DELIVERED: ['Delivered', 'success'], CANCELLED: ['Cancelled', 'danger'],
};
const payLabel = (o: ParcelOrder) => (o.payMethod === 'UPI' ? 'UPI paid' : o.payMethod === 'WALLET' ? 'Wallet paid' : o.payMethod === 'CASH_PICKUP' ? 'Cash at pickup' : 'Cash at drop');

function useNow(ms = 1000) {
  const [n, setN] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setN(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return n;
}

// ------------------------------------------------------------------ map
function ParcelMap({ o, now }: { o: ParcelOrder; now: number }) {
  const { c } = useTheme();
  const a = o.pickup, b = o.drop;
  const p = transitProgress(o, now);
  const truck = { latitude: a.lat + (b.lat - a.lat) * p, longitude: a.lng + (b.lng - a.lng) * p };
  const region = { latitude: (a.lat + b.lat) / 2, longitude: (a.lng + b.lng) / 2, latitudeDelta: Math.max(0.03, Math.abs(a.lat - b.lat) * 1.8), longitudeDelta: Math.max(0.03, Math.abs(a.lng - b.lng) * 1.8) };
  return (
    <View style={{ height: 230, borderRadius: 16, overflow: 'hidden' }}>
      <MapView style={{ flex: 1 }} region={region} scrollEnabled={false} zoomEnabled={false}>
        <Marker coordinate={{ latitude: a.lat, longitude: a.lng }} pinColor="#2E9E6B" title="Pickup" />
        <Marker coordinate={{ latitude: b.lat, longitude: b.lng }} pinColor="#D90404" title="Drop" />
        {(o.status === 'IN_TRANSIT' || o.status === 'ASSIGNED' || o.status === 'AT_PICKUP') && <Polyline coordinates={[{ latitude: a.lat, longitude: a.lng }, { latitude: b.lat, longitude: b.lng }]} strokeColor={c.brand} strokeWidth={4} />}
        {o.status === 'IN_TRANSIT' && <Marker coordinate={truck} title={o.driver?.name}><View style={{ backgroundColor: '#0B1F3A', borderRadius: 8, padding: 5 }}><Icon name="truck" size={14} color="#fff" /></View></Marker>}
      </MapView>
    </View>
  );
}

/** Pulsing radar while we look for a driver. */
function Radar() {
  const { c } = useTheme();
  const s = useRef(new Animated.Value(0)).current;
  useEffect(() => { const a = Animated.loop(Animated.timing(s, { toValue: 1, duration: 1600, useNativeDriver: true })); a.start(); return () => a.stop(); }, [s]);
  return (
    <View style={{ height: 230, borderRadius: 16, backgroundColor: c.chip, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <Animated.View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: c.brand, opacity: s.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0] }), transform: [{ scale: s.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.2] }) }] }} />
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: c.success, borderWidth: 3, borderColor: '#fff' }} />
    </View>
  );
}

function Steps({ status }: { status: ParcelStatus }) {
  const { c } = useTheme();
  const labels = ['Assigned', 'At pickup', 'Loaded', 'In transit', 'Delivered'];
  const at = { ASSIGNED: 0, AT_PICKUP: 1, IN_TRANSIT: 3, DELIVERED: 4 }[status as 'ASSIGNED'] ?? 0;
  return (
    <Row gap={4} style={{ marginTop: 10 }}>
      {labels.map((l, i) => <View key={l} style={{ flex: 1 }}><View style={{ height: 3, borderRadius: 2, backgroundColor: i <= at ? c.brand : c.border }} /><Txt v="xs" muted={i > at} color={i <= at ? c.brand : undefined} style={{ fontSize: 8.5, marginTop: 3 }}>{l}</Txt></View>)}
    </Row>
  );
}

function DriverCard({ o }: { o: ParcelOrder }) {
  const { c } = useTheme();
  const dr = o.driver!;
  const mock = (what: string) => () => toast(`${what} is simulated in this build. It connects to masked calling when the backend is live`, 'info');
  return (
    <Row>
      <Avatar name={dr.name} size={46} />
      <View style={{ flex: 1 }}>
        <Txt v="h3">{dr.name} <Txt v="small" color={c.warning}>★ {dr.rating.toFixed(1)}</Txt></Txt>
        <Txt v="xs" muted>{dr.vehicleModel}</Txt>
        <View style={{ alignSelf: 'flex-start', borderWidth: 1, borderColor: c.text, borderRadius: 6, paddingHorizontal: 6, marginTop: 3 }}><Txt v="xs" bold>{dr.vehicleNo}</Txt></View>
      </View>
      <Pressable onPress={mock('Calling')} accessibilityLabel="Call driver" style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.dangerBg, alignItems: 'center', justifyContent: 'center' }}><Icon name="phone" color={c.brand} size={17} /></Pressable>
      <Pressable onPress={mock('Chat')} accessibilityLabel="Chat with driver" style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.dangerBg, alignItems: 'center', justifyContent: 'center' }}><Icon name="chat" color={c.brand} size={17} /></Pressable>
    </Row>
  );
}

function DetailsSheet({ o, visible, onClose }: { o: ParcelOrder; visible: boolean; onClose: () => void }) {
  const f = o.fare, g = o.goods;
  return (
    <Sheet visible={visible} onClose={onClose} title={`Order ${o.id}`}>
      <Txt v="small" muted>Pickup</Txt><Txt v="h3">{o.pickup.house}, {o.pickup.areaName}</Txt><Txt v="xs" muted>{o.pickup.name} · {o.pickup.mobile}</Txt>
      <Txt v="small" muted style={{ marginTop: 8 }}>Drop</Txt><Txt v="h3">{o.drop.house}, {o.drop.areaName}</Txt><Txt v="xs" muted>{o.drop.name} · {o.drop.mobile}</Txt>
      <Txt v="small" muted style={{ marginTop: 8 }}>Goods</Txt>
      <Txt>{g.type === 'Other' ? g.other : g.type} · {weightOf(g.weightId).label} · worth ₹{g.valueRupees.toLocaleString('en-IN')}{g.note ? `\n"${g.note}"` : ''}</Txt>
      <Card style={{ marginTop: 10 }}>
        <PriceRow label={`Trip fare · ${o.distanceKm} km`} paise={f.tripPaise} />
        {f.helperPaise > 0 && <PriceRow label={`Loading helper × ${g.helpers}`} paise={f.helperPaise} />}
        {f.protectionPaise > 0 && <PriceRow label="Goods protection" paise={f.protectionPaise} />}
        {f.discountPaise > 0 && <PriceRow label={`Coupon ${f.coupon}`} paise={f.discountPaise} minus />}
        {f.tipPaise > 0 && <PriceRow label="Tip to driver" paise={f.tipPaise} />}
        <PriceRow label="Total incl. GST" paise={f.totalPaise} total />
      </Card>
      <Txt v="xs" muted>{payLabel(o)}{f.balanceDuePaise > 0 ? ` · ${rs(f.balanceDuePaise)} extra to pay the driver at drop` : ''}</Txt>
    </Sheet>
  );
}

// ------------------------------------------------------------------ one screen, one view per status (P6, P6b, P7, P8, P9)
export function ParcelOrderScreen({ navigation, route }: any) {
  const { c } = useTheme();
  const id: string = route.params.id;
  const o = useParcelStore((s) => s.orders.find((x) => x.id === id));
  const { tick, retryTip, switchTo, later, cancel, rate } = useParcelStore();
  const draft = useParcelDraft();
  const now = useNow();
  const [details, setDetails] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [photo, setPhoto] = useState(false);
  const [choice, setChoice] = useState<'TIP' | 'SWITCH' | 'LATER'>('TIP');
  const [sched, setSched] = useState(false);
  const [sDate, setSDate] = useState(''); const [sSlot, setSSlot] = useState(''); const [sErr, setSErr] = useState('');
  const [stars, setStars] = useState(0); const [tip, setTip] = useState(0); const [rateErr, setRateErr] = useState('');

  useEffect(() => { tick(id); const t = setInterval(() => tick(id), 1000); return () => clearInterval(t); }, [id, tick]);
  const goHome = () => navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  if (!o) return <Screen title="Parcel order" onBack={goHome}><EmptyState icon="box" title="Order not found" text="It may have been removed from this device." action="Go home" onAction={goHome} /></Screen>;

  const v = vehicleOf(o.vehicle);
  const q = cancelQuote(o);
  const bigger = VEHICLES[Math.min(VEHICLES.length - 1, VEHICLES.findIndex((x) => x.id === o.vehicle) + 1)];
  const switchFare = bigger.id !== o.vehicle ? bigger : null;
  const fare = (vv: typeof v) => { const km = o.distanceKm; return Math.round((vv.basePaise + Math.max(0, km - vv.includedKm) * vv.perKmPaise) / 100) * 100; };
  const [label, kind] = PARCEL_STATUS[o.status];
  const shell = (children: React.ReactNode, footer?: React.ReactNode) => (
    <Screen title={`Order ${o.id}`} onBack={goHome} footer={footer} right={<Badge text={label} kind={kind} />}>
      {children}
      <DetailsSheet o={o} visible={details} onClose={() => setDetails(false)} />
      <ConfirmDialog visible={confirmCancel} danger title="Cancel this order?" text={q.note + (q.refundPaise ? ` ${rs(q.refundPaise)} is refunded.` : '')} confirm="Yes, cancel order" cancel="Keep order"
        onCancel={() => setConfirmCancel(false)} onConfirm={() => { cancel(o.id); setConfirmCancel(false); toast('Order cancelled', 'success'); }} />
    </Screen>
  );
  const cancelBtn = canCancel(o) && <Button variant="outline" title={q.feePaise ? `Cancel · ₹${q.feePaise / 100} fee` : o.paid ? 'Cancel · full refund' : 'Cancel order'} onPress={() => setConfirmCancel(true)} />;

  // ---- P6 finding a driver
  if (o.status === 'SEARCHING') {
    const pct = Math.min(1, (now - (o.t.searchStartedAt ?? now)) / PARCEL_TIMING.SEARCH_MS);
    return shell(<>
      <Radar />
      <Txt v="h1" style={{ marginTop: 12 }}>Finding a {v.short} near you</Txt>
      <Txt v="small" muted>Sent to 6 drivers within 2 km · usually under a minute</Txt>
      <View style={{ height: 5, borderRadius: 3, backgroundColor: c.border, marginVertical: 12 }}><View style={{ height: 5, borderRadius: 3, backgroundColor: c.brand, width: `${Math.max(8, pct * 100)}%` }} /></View>
      <Card><Row style={{ justifyContent: 'space-between' }}><Txt v="h3">Order {o.id}</Txt><Txt v="small" muted>{rs(o.fare.totalPaise)} · {payLabel(o)}</Txt></Row></Card>
      <Box kind="info" icon="clock" text="Busy hour? If no one accepts in 3 minutes, we will show you options." />
    </>, cancelBtn || undefined);
  }

  // ---- P6b no driver found
  if (o.status === 'NO_DRIVER') {
    const opts: { k: 'TIP' | 'SWITCH' | 'LATER'; icon: any; t: string; s: string; off?: boolean }[] = [
      { k: 'TIP', icon: 'zap', t: `Add ${rs(PARCEL_RULES.RETRY_TIP_PAISE)} tip and retry`, s: 'Drivers see a higher fare · most accept in 1 min' },
      { k: 'SWITCH', icon: 'truck', t: switchFare ? `Switch to ${switchFare.short} · ${rs(fare(switchFare))}` : 'Larger vehicles not available', s: switchFare ? 'Trucks free nearby' : 'You already chose the largest', off: !switchFare },
      { k: 'LATER', icon: 'cal', t: 'Schedule for later', s: 'Pick a slot · driver assigned 30 min before' },
    ];
    const run = () => {
      if (choice === 'TIP') { retryTip(o.id); toast('Searching again with the tip', 'success'); }
      else if (choice === 'SWITCH' && switchFare) { switchTo(o.id, switchFare.id); toast(`Searching for a ${switchFare.short}`, 'success'); }
      else setSched(true);
    };
    const days = Array.from({ length: PARCEL_RULES.SCHEDULE_MAX_DAYS + 1 }, (_, i) => dayjs().add(i, 'day').format('YYYY-MM-DD'));
    return shell(<>
      <View style={{ alignItems: 'center', marginTop: 8 }}><View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: c.chip, alignItems: 'center', justifyContent: 'center' }}><Icon name="truck" size={36} color={c.brand} /></View></View>
      <Txt v="h1" center style={{ marginTop: 10 }}>No {v.short} accepted yet</Txt>
      <Txt v="small" muted center style={{ marginBottom: 10 }}>It is a busy hour near {o.pickup.areaName}. Your {rs(o.fare.totalPaise)} is safe. Pick what to do next.</Txt>
      {opts.map((p) => (
        <Pressable key={p.k} disabled={p.off} onPress={() => setChoice(p.k)} accessibilityState={{ selected: choice === p.k, disabled: !!p.off }}
          style={{ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1.5, marginVertical: 5, opacity: p.off ? 0.5 : 1, borderColor: choice === p.k ? c.brand : c.border, backgroundColor: c.surface }}>
          <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: c.dangerBg, alignItems: 'center', justifyContent: 'center' }}><Icon name={p.icon} color={c.brand} size={17} /></View>
          <View style={{ flex: 1 }}><Txt v="h3">{p.t}</Txt><Txt v="xs" color={p.k === 'SWITCH' ? c.success : undefined} muted={p.k !== 'SWITCH'}>{p.s}</Txt></View>
        </Pressable>
      ))}
      <Txt v="xs" muted center style={{ marginTop: 6 }}>{o.paid ? `Cancel · refund ${rs(cancelQuote(o).refundPaise)} to your ${o.payMethod === 'UPI' ? 'UPI' : 'wallet'} in 2 hrs` : 'You can cancel without any charge'}</Txt>
      <Sheet visible={sched} onClose={() => setSched(false)} title="Schedule for later">
        <Txt v="xs" muted>Date</Txt>
        <Row gap={6} style={{ flexWrap: 'wrap', marginVertical: 6 }}>{days.map((dd) => <Chip key={dd} label={dayjs(dd).format('ddd D MMM')} on={sDate === dd} onPress={() => { setSDate(dd); setSSlot(''); setSErr(''); }} />)}</Row>
        {!!sDate && <><Txt v="xs" muted>Time</Txt>
          <Row gap={6} style={{ flexWrap: 'wrap', marginVertical: 6 }}>{scheduleSlots(sDate).map((s) => <Chip key={s} label={dayjs(`2000-01-01 ${s}`).format('hh:mm A')} on={sSlot === s} onPress={() => { setSSlot(s); setSErr(''); }} />)}</Row></>}
        {!!sErr && <Txt v="xs" color={c.danger}>{sErr}</Txt>}
        <Button title="Confirm slot" style={{ marginTop: 8 }} onPress={() => { const e = validateSchedule(sDate, sSlot); setSErr(e); if (e) return; later(o.id, dayjs(`${sDate} ${sSlot}`, 'YYYY-MM-DD HH:mm').valueOf()); setSched(false); toast('Order scheduled', 'success'); }} />
      </Sheet>
    </>, <Button title={choice === 'TIP' ? 'Add tip and keep searching' : choice === 'SWITCH' ? 'Switch vehicle' : 'Choose a slot'} onPress={run} />);
  }

  // ---- P7 driver assigned / at pickup
  if (o.status === 'ASSIGNED' || o.status === 'AT_PICKUP') {
    const eta = etaMinutes(o, now);
    return shell(<>
      <ParcelMap o={o} now={now} />
      <Txt v="h1" style={{ marginTop: 12 }}>{o.status === 'ASSIGNED' ? `Driver arriving in ${eta} min` : 'Driver reached the pickup'}</Txt>
      <Card><DriverCard o={o} />
        <View style={{ backgroundColor: '#0B1F3A', borderRadius: 14, padding: 14, marginTop: 12 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View><Txt v="xs" color="#BAE6FD">Pickup OTP · share only at loading</Txt><Txt v="title" color="#fff" style={{ letterSpacing: 8, marginTop: 4 }}>{o.pickupOtp.split('').join(' ')}</Txt></View>
            <Icon name="lock" size={26} color="#38BDF8" />
          </Row>
        </View>
        <Steps status={o.status} />
      </Card>
      <Row gap={8} style={{ marginTop: 6 }}>
        <View style={{ flex: 1 }}>{cancelBtn || null}</View>
        <View style={{ flex: 1 }}><Button title="Share live link" icon="share" onPress={() => Share.share({ message: `Track my Zproogo parcel ${o.id}: https://track.zproogo.in/p/${o.id}` })} /></View>
      </Row>
      <Pressable onPress={() => setDetails(true)} style={{ alignSelf: 'center', marginTop: 10 }}><Txt v="small" color={c.brand} bold>Order details</Txt></Pressable>
    </>);
  }

  // ---- P8 live tracking
  if (o.status === 'IN_TRANSIT') {
    const eta = etaMinutes(o, now);
    const t = (ms?: number) => (ms ? dayjs(ms).format('hh:mm A') : '');
    const steps = [
      { t: 'Driver assigned', at: t(o.t.assignedAt), done: true }, { t: 'Loaded · pickup OTP verified', at: t(o.t.loadedAt), done: true },
      { t: `On the way to ${o.drop.areaName}`, at: 'Now', now: true }, { t: `Delivery · drop OTP sent to ${o.drop.name.split(' ')[0]}`, at: dayjs(now).add(eta, 'minute').format('hh:mm A'), done: false },
    ];
    return shell(<>
      <ParcelMap o={o} now={now} />
      <Row style={{ justifyContent: 'space-between', marginTop: 12 }}>
        <Txt v="h1">Arriving by {dayjs(now).add(eta, 'minute').format('hh:mm A')}</Txt>
      </Row>
      <Txt v="small" muted>{(o.distanceKm * (1 - transitProgress(o, now))).toFixed(1)} km left · {o.driver?.name.split(' ')[0]} · {o.driver?.vehicleNo}</Txt>
      <Card>
        {steps.map((s) => (
          <Row key={s.t} style={{ paddingVertical: 6, alignItems: 'flex-start' }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, marginTop: 3, backgroundColor: s.done ? c.success : s.now ? c.brand : c.surface, borderWidth: 2, borderColor: s.done ? c.success : s.now ? c.brand : c.border }} />
            <Txt v="small" bold={s.now} style={{ flex: 1 }} muted={!s.done && !s.now}>{s.t}</Txt>
            <Txt v="xs" color={s.now ? c.brand : undefined} muted={!s.now} bold={s.now}>{s.at}</Txt>
          </Row>
        ))}
      </Card>
      <Box icon="lock" text={`Receiver gives drop OTP ${o.dropOtp} to close the delivery.`} />
      <Row gap={8} style={{ marginTop: 6 }}>
        <View style={{ flex: 1 }}><Button variant="outline" title="Get help" onPress={() => navigation.navigate('Help')} /></View>
        <View style={{ flex: 1 }}><Button title="Order details" onPress={() => setDetails(true)} /></View>
      </Row>
      <Button small variant="outline" icon="share" title="Share live link" style={{ marginTop: 8 }} onPress={() => Share.share({ message: `Track my Zproogo parcel ${o.id}: https://track.zproogo.in/p/${o.id}` })} />
    </>);
  }

  // ---- P9 delivered + proof
  if (o.status === 'DELIVERED') {
    const mins = Math.max(1, Math.round(((o.t.deliveredAt ?? now) - (o.t.assignedAt ?? now)) / 60000) + Math.round(o.distanceKm * 2));
    const submit = () => {
      const e = validateRating(stars) || validateTip(tip) || (tip > 0 && stars === 0 ? 'Rate the driver before adding a tip' : '');
      setRateErr(e); if (e) return;
      if (!o.rated && (stars > 0 || tip > 0)) rate(o.id, stars, tip);
      goHome();
    };
    const proof = (h: number) => (
      <Svg width="100%" height={h} viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><Rect width="160" height="100" fill="#D6E8F5" /><Rect x="95" y="12" width="36" height="78" rx="3" fill="#1E3A5F" />
        <Rect x="30" y="60" width="34" height="30" fill="#E0A458" /><Rect x="40" y="42" width="30" height="24" fill="#C98B3D" /><Path d="M0 90H160V100H0z" fill="#A9C7DE" /></Svg>
    );
    return shell(<>
      <View style={{ alignItems: 'center' }}><View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.successBg, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={34} color={c.success} strokeWidth={3} /></View></View>
      <Txt v="h1" center style={{ marginTop: 8 }}>Parcel delivered</Txt>
      <Txt v="small" muted center>Received by {o.drop.name} at {dayjs(o.t.deliveredAt).format('hh:mm A')} · drop OTP verified</Txt>
      <Card style={{ marginTop: 12 }}><Row><View style={{ width: 90, height: 64, borderRadius: 10, overflow: 'hidden' }}>{proof(64)}</View>
        <View style={{ flex: 1 }}><Txt v="h3">Proof of delivery</Txt><Txt v="xs" muted>Photo taken by driver · {dayjs(o.t.deliveredAt).format('hh:mm A')} · {o.drop.areaName}</Txt>
          <Txt v="small" color={c.brand} bold onPress={() => setPhoto(true)}>View full photo</Txt></View></Row></Card>
      <Card><Row style={{ justifyContent: 'space-around' }}>
        {[['Paid', rs(o.fare.totalPaise)], ['Trip time', `${mins} min`], ['Distance', `${o.distanceKm} km`]].map(([k, val]) => <View key={k} style={{ alignItems: 'center' }}><Txt v="xs" muted>{k}</Txt><Txt v="h2">{val}</Txt></View>)}
      </Row></Card>
      <Card>
        <Txt v="h3">{o.rated ? `You rated ${o.driver?.name.split(' ')[0]}` : `Rate ${o.driver?.name.split(' ')[0]}`}</Txt>
        <View style={{ marginVertical: 8 }}><Stars value={o.rated ? o.rating ?? 0 : stars} onChange={o.rated ? undefined : (n) => { setStars(n); setRateErr(''); }} /></View>
        {!o.rated && <Row gap={6}><Txt v="xs" muted>Add a tip</Txt>{PARCEL_RULES.DRIVER_TIPS_PAISE.map((p) => <Chip key={p} label={rs(p)} on={tip === p} onPress={() => { setTip(tip === p ? 0 : p); setRateErr(''); }} />)}</Row>}
        {!!rateErr && <Txt v="xs" color={c.danger} style={{ marginTop: 4 }}>{rateErr}</Txt>}
      </Card>
      <Row gap={8}>
        <View style={{ flex: 1 }}><Button variant="outline" icon="download" title="Invoice" onPress={() => Share.share({ message: invoiceText(o) })} /></View>
        <View style={{ flex: 1 }}><Button variant="outline" icon="refresh" title="Book again" onPress={() => { draft.prefill(o); navigation.reset({ index: 1, routes: [{ name: 'Main' }, { name: 'ParcelHome' }] }); }} /></View>
      </Row>
      <Sheet visible={photo} onClose={() => setPhoto(false)} title="Proof of delivery">{proof(220)}<Txt v="xs" muted style={{ marginTop: 6 }}>Sample photo. The real photo comes from the driver app once the backend is connected.</Txt></Sheet>
    </>, <Button title="Submit & go home" onPress={submit} />);
  }

  // ---- cancelled
  if (o.status === 'CANCELLED') {
    return shell(<>
      <EmptyState icon="x" title="Order cancelled" text={o.cancelFeePaise ? `₹${o.cancelFeePaise / 100} cancellation fee applied.` : 'No cancellation fee.'} />
      {!!o.refundPaise && <Box kind="success" text={`${rs(o.refundPaise)} is being refunded to your ${o.payMethod === 'UPI' ? 'UPI' : 'wallet'}. It arrives within 2 hours.`} />}
      <Button title="Book again" icon="refresh" style={{ marginTop: 10 }} onPress={() => { draft.prefill(o); navigation.reset({ index: 1, routes: [{ name: 'Main' }, { name: 'ParcelHome' }] }); }} />
    </>);
  }

  // ---- scheduled
  return shell(<>
    <EmptyState icon="cal" title="Pickup scheduled" text={`${dayjs(o.scheduledFor).format('ddd, D MMM · hh:mm A')}. We assign a driver 30 minutes before.`} />
    <Card><Row><Icon name="pin" color={c.brand} /><View style={{ flex: 1 }}><Txt v="h3">{o.pickup.areaName} → {o.drop.areaName}</Txt><Txt v="xs" muted>{v.short} · {o.distanceKm} km · {rs(o.fare.totalPaise)} · {payLabel(o)}</Txt></View></Row></Card>
    <Pressable onPress={() => setDetails(true)} style={{ alignSelf: 'center', marginVertical: 8 }}><Txt v="small" color={c.brand} bold>Order details</Txt></Pressable>
    {cancelBtn || null}
  </>);
}

// ------------------------------------------------------------------ lists (My orders + My Trips > Parcels)
export type ParcelTab = 'upcoming' | 'completed' | 'cancelled';
export const filterParcels = (orders: ParcelOrder[], tab: ParcelTab) =>
  orders.filter((o) => (tab === 'upcoming' ? isOngoing(o) : tab === 'completed' ? o.status === 'DELIVERED' : o.status === 'CANCELLED'));

export function ParcelOrderCard({ o, onPress }: { o: ParcelOrder; onPress: () => void }) {
  const { c } = useTheme();
  const [label, kind] = PARCEL_STATUS[o.status];
  return (
    <Card onPress={onPress}>
      <Row>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.chip, alignItems: 'center', justifyContent: 'center' }}><Icon name="box" color={c.brand} /></View>
        <View style={{ flex: 1 }}><Txt v="h3">{orderTitle(o)}</Txt><Txt v="xs" muted numberOfLines={1}>{orderSubtitle(o)}</Txt></View>
        <Badge text={label} kind={kind} />
      </Row>
      <Row style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: c.border, justifyContent: 'space-between' }}>
        <Txt v="xs" muted>ID {o.id}{o.status === 'SCHEDULED' && o.scheduledFor ? ` · ${dayjs(o.scheduledFor).format('D MMM, hh:mm A')}` : ''}</Txt>
        {isOngoing(o) ? <Txt v="small" color={c.brand} bold>{o.status === 'IN_TRANSIT' ? 'Track live' : 'View'}</Txt> : <Txt v="small" color={c.success} bold>{rs(o.fare.totalPaise)}</Txt>}
      </Row>
    </Card>
  );
}

export function ParcelOrdersScreen({ navigation }: any) {
  const orders = useParcelStore((s) => s.orders);
  const [tab, setTab] = useState<ParcelTab>('upcoming');
  const list = filterParcels(orders, tab);
  return (
    <Screen title="My parcel orders" onBack={() => navigation.goBack()}>
      <Tabs value={tab} onChange={setTab} items={[{ value: 'upcoming', label: 'Ongoing' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }]} />
      {list.length === 0
        ? <EmptyState icon="box" title="No parcels here" text="Your parcel orders will appear here." action="Send a parcel" onAction={() => navigation.navigate('ParcelHome')} />
        : list.map((o) => <ParcelOrderCard key={o.id} o={o} onPress={() => navigation.navigate('ParcelOrder', { id: o.id })} />)}
    </Screen>
  );
}
