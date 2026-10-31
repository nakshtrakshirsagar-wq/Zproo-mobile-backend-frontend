import React, { useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../theme/ThemeProvider';
import { Badge, Box, Button, Card, ChipGroup, Counter, ErrorView, Field, Loading, Price, Row, Screen, Section, Stepper, Toggle, Txt, HoldTimer } from '../../components/ui';
import { toast } from '../../utils/toast';
import { ConfirmDialog, Scene } from '../../components/widgets';
import { Icon, IconName } from '../../components/Icon';
import { Api, Room } from '../../api/endpoints';
import { useAction } from '../../hooks/useApi';
import { useRequireLogin } from '../../hooks/useRequireLogin';
import { useBooking } from '../../store/booking';
import { useAuth } from '../../store/auth';
import { dateShort, toE164 } from '../../utils/format';
import { LIMITS, cleanAlnumUpper, cleanEmail, cleanMobile, cleanName, collapseSpaces, validateEmail, validateGstin, validateMobile, validateName, validateText } from '../../utils/validation';

const AMENITY_ICON: Record<string, IconName> = { Pool: 'waves', 'Beach access': 'umbrella', Restaurant: 'food', WiFi: 'wifi', Breakfast: 'coffee', Spa: 'heart', Parking: 'pin', Gym: 'zap' };

/** Screen 71 - hotel details (amenities in blue, whiteboard 28). */
export function HotelDetailsScreen({ navigation, route }: any) {
  const { c } = useTheme();
  const { id, query } = route.params;
  const q = useQuery({ queryKey: ['hotel', id], queryFn: () => Api.hotel(id) });
  const h = q.data;
  return (
    <Screen title={h?.name ?? 'Hotel'} padded={false} footer={h && <Row>
      <View style={{ flex: 1 }}><Price paise={h.pricePaise} size={18} suffix="/night" /><Txt v="xs" muted>+ taxes</Txt></View>
      <Button title="Select room" style={{ flex: 1 }} onPress={() => navigation.navigate('Rooms', { hotel: h, query })} /></Row>}>
      {q.isLoading ? <Loading /> : q.error ? <ErrorView error={q.error} onRetry={q.refetch} /> : <>
        <Scene kind={h.image === 'resort2' ? 'lake' : 'mountains'} height={200}>
          <View style={{ position: 'absolute', right: 12, bottom: 12, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 }}><Txt v="xs" bold color="#0B1F3A">Gallery · {h.gallery}</Txt></View>
        </Scene>
        <View style={{ padding: 16 }}>
          <Txt v="h1">{h.name}</Txt>
          <Row gap={4}><Icon name="pin" size={12} color={c.muted} /><Txt v="small" muted>{h.area}, {h.city} · {h.distanceKm} km {h.landmark}</Txt></Row>
          <Row gap={4} style={{ marginTop: 4 }}><Icon name="star" size={12} color={c.warning} fill={c.warning} /><Txt v="small" bold>{h.rating}</Txt><Txt v="small" muted>({h.reviews} reviews) · {h.stars}-star</Txt></Row>
          <Section title="Amenities" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {h.amenities.map((a: string) => (
              <View key={a} style={{ alignItems: 'center', width: 68 }}>
                <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: c.infoBg, alignItems: 'center', justifyContent: 'center' }}><Icon name={AMENITY_ICON[a] ?? 'check'} color={c.blue} /></View>
                <Txt v="xs" muted center>{a}</Txt>
              </View>
            ))}
          </View>
          <Section title="About" /><Txt muted>{h.about}</Txt>
          <Section title="Guest reviews" />
          {h.reviewSummary.map((r: any) => (
            <Row key={r.label} style={{ marginVertical: 3 }}><Txt v="small" muted style={{ width: 70 }}>{r.label}</Txt>
              <View style={{ flex: 1, height: 7, borderRadius: 4, backgroundColor: c.chip }}><View style={{ width: `${r.pct}%`, height: 7, borderRadius: 4, backgroundColor: c.brand }} /></View>
              <Txt v="xs" muted style={{ width: 32, textAlign: 'right' }}>{r.pct}%</Txt></Row>
          ))}
          <Section title="Policies" /><Txt muted>Check-in {h.policies.checkIn} · Check-out {h.policies.checkOut}. {h.policies.text}</Txt>
        </View>
      </>}
    </Screen>
  );
}

/** Screen 72 - rooms with +/- in black (whiteboard 29); sold-out modal (73, redesigned). */
export function RoomsScreen({ navigation, route }: any) {
  const { hotel, query } = route.params;
  const q = useQuery({ queryKey: ['rooms', hotel.id, query], queryFn: () => Api.hotelRooms(hotel.id, query) });
  const [qty, setQty] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState('ALL');
  const [soldOut, setSoldOut] = useState<string | null>(null);
  const requireLogin = useRequireLogin();
  const hold = useAction((r: Room) => Api.hold({ mode: 'HOTEL', hotelId: hotel.id, rateKey: r.rateKey, qty: qty[r.rateKey] ?? 1, ...query }), {
    onSuccess: (h) => { useBooking.getState().setHold(h); requireLogin(() => navigation.navigate('HotelGuest')); },
    onError: (e) => { if (e.code === 'SOLD_OUT') setSoldOut(e.message); else toast(e.message, 'error'); },
  });
  const rooms = (q.data ?? []).filter((r) => filter === 'ALL' || (filter === 'BB' ? r.mealPlan === 'BREAKFAST' : r.refundable));
  return (
    <Screen title="Select room">
      <Txt v="h3">{hotel.name}</Txt><Txt v="small" muted>{dateShort(query.checkIn)} – {dateShort(query.checkOut)} · {query.adults} adults</Txt>
      <ChipGroup value={filter} onChange={setFilter} options={[{ value: 'ALL', label: 'All' }, { value: 'BB', label: 'With breakfast' }, { value: 'REF', label: 'Refundable' }]} />
      {q.isLoading ? <Loading /> : rooms.map((r) => (
        <Card key={r.rateKey}>
          <Row gap={10}>
            <View style={{ width: 84, height: 72, borderRadius: 11, overflow: 'hidden' }}><Scene kind={r.image === 'sea' ? 'lake' : 'mountains'} height={72} /></View>
            <View style={{ flex: 1 }}>
              <Txt v="h3">{r.name}</Txt><Txt v="xs" muted>{r.description}</Txt>
              <Badge kind={r.refundable ? 'success' : 'danger'} text={r.refundable ? `Free cancellation till ${dateShort(r.freeCancelUntil!)}` : 'Non-refundable'} />
            </View>
          </Row>
          <Row style={{ marginTop: 10, justifyContent: 'space-between' }}>
            <Price paise={r.pricePaise} suffix="/night" />
            <Counter value={qty[r.rateKey] ?? 1} min={1} max={Math.min(5, r.available)} onChange={(n) => setQty({ ...qty, [r.rateKey]: n })} />
          </Row>
          <Button small title="Select" style={{ marginTop: 10 }} loading={hold.isPending && hold.variables?.rateKey === r.rateKey} onPress={() => hold.mutate(r)} />
        </Card>
      ))}
      <ConfirmDialog visible={!!soldOut} icon="hotel" title="Just sold out" text={`${soldOut ?? ''}. We checked live availability — pick another room or hotel.`}
        confirm="See other rooms" cancel="See other hotels" onConfirm={() => { setSoldOut(null); q.refetch(); }} onCancel={() => { setSoldOut(null); navigation.goBack(); navigation.goBack(); }} />
    </Screen>
  );
}

/** Screen 74 - guest details with dropdown + text area (whiteboard 31) and pay-now / pay-at-hotel (75). */
export function HotelGuestScreen({ navigation }: any) {
  const { hold, setDetails } = useBooking();
  const user = useAuth((s) => s.user);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [mobile, setMobile] = useState((user?.mobile ?? '').replace('+91', ''));
  const [arrival, setArrival] = useState('14:00');
  const [requests, setRequests] = useState('');
  const [gst, setGst] = useState(false);
  const [gstin, setGstin] = useState('');
  const [payAtHotel, setPayAtHotel] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const s = hold!.summary;
  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }));
  const all: Record<string, string> = {};
  const vn = validateName(name, { label: 'Guest name' }); if (vn) all.name = vn;
  const ve = validateEmail(email); if (ve) all.email = ve;
  const vm = validateMobile(mobile); if (vm) all.mobile = vm;
  const vr = validateText(requests, { label: 'Special requests', max: LIMITS.SPECIAL_REQUEST_MAX }); if (vr) all.requests = vr;
  if (gst) { const vg = validateGstin(gstin); if (vg) all.gstin = vg; }
  const errors: Record<string, string> = {};
  Object.keys(all).forEach((k) => { if (submitted || touched[k]) errors[k] = all[k]; });
  const go = () => {
    setSubmitted(true); setErr(null);
    if (Object.keys(all).length) return setErr('Please correct the highlighted details');
    setDetails({ pax: [{ name: collapseSpaces(name) }], contact: { mobile: toE164(mobile), email: email.trim() },
      extras: { payOption: payAtHotel ? 'PAY_AT_HOTEL' : 'PREPAID', specialRequests: [`Arrival ${arrival}`, requests.trim()].filter(Boolean).join(' · '), gstin: gst ? gstin.toUpperCase() : undefined } });
    navigation.navigate('Checkout');
  };
  return (
    <Screen title="Guest details" footer={<Button title="Continue" onPress={go} />}>
      <Stepper step={1} />
      <HoldTimer expiresAt={hold?.expiresAt} label="Room on hold" />
      <Card><Txt v="h3">{s.hotel}</Txt><Txt v="small" muted>{s.room} × {s.qty} · {dateShort(s.checkIn)} – {dateShort(s.checkOut)} · {s.nights} night(s)</Txt></Card>
      <Field label="Primary guest" value={name} onChangeText={(t) => setName(cleanName(t))} onBlur={() => touch('name')} error={errors.name} autoCapitalize="words" autoCorrect={false} maxLength={LIMITS.NAME_MAX} />
      <Field label="Email" value={email} onChangeText={(t) => setEmail(cleanEmail(t))} onBlur={() => touch('email')} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={LIMITS.EMAIL_MAX} />
      <Field label="Mobile" value={mobile} onChangeText={(t) => setMobile(cleanMobile(t))} onBlur={() => touch('mobile')} error={errors.mobile} keyboardType="number-pad" maxLength={LIMITS.MOBILE_LEN} />
      <Section title="Expected arrival" />
      <ChipGroup value={arrival} onChange={setArrival} options={['12:00', '14:00', '18:00', '22:00', 'After midnight'].map((v) => ({ value: v, label: v }))} />
      <Field label="Special requests (optional)" value={requests} onChangeText={(t) => setRequests(t.replace(/[<>]/g, ''))} onBlur={() => touch('requests')} error={errors.requests} multiline numberOfLines={3} maxLength={400} placeholder="High floor, extra pillow…" />
      <Toggle value={gst} onChange={setGst} icon="ticket" label="Use GST invoice" sub="For business travel" />
      {gst && <Field label="GSTIN" value={gstin} onChangeText={(t) => setGstin(cleanAlnumUpper(t, LIMITS.GSTIN_LEN))} onBlur={() => touch('gstin')} error={errors.gstin} autoCapitalize="characters" autoCorrect={false} maxLength={LIMITS.GSTIN_LEN} />}
      <Section title="How do you want to pay?" />
      <Toggle value={!payAtHotel} onChange={(v) => setPayAtHotel(!v)} icon="card" label="Pay now" sub="UPI, card, net banking · instant voucher" />
      <Toggle value={payAtHotel} onChange={setPayAtHotel} icon="hotel" label="Pay at hotel" sub="No payment now · pay during check-in" />
      {err && <Box kind="error" text={err} />}
    </Screen>
  );
}
