import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../theme/ThemeProvider';
import { Box, Button, Card, Field, HoldTimer, PriceRow, Row, SaveBadge, Screen, Section, Sheet, Stepper, Toggle, Txt, Badge } from '../../components/ui';
import { ConfirmDialog } from '../../components/widgets';
import { Icon } from '../../components/Icon';
import { Api } from '../../api/endpoints';
import { useBooking } from '../../store/booking';
import { useSecureScreen } from '../../security/useSecureScreen';
import { startPayment } from './pay';
import { dateShort, rupees, time } from '../../utils/format';
import { LIMITS, cleanCoupon, validateCoupon } from '../../utils/validation';
import { toast } from '../../utils/toast';

const MODE_ADDONS: Record<string, { code: string; label: string; sub: string }[]> = {
  BUS: [{ code: 'INSURANCE', label: 'Travel insurance', sub: 'Cover up to ₹5 lakh · ₹15 per seat' }, { code: 'FREE_CANCEL', label: 'Free cancellation', sub: 'Full fare refund till 6h before · ₹49 per seat' }],
  TRAIN: [{ code: 'INSURANCE', label: 'Travel insurance', sub: '₹0.45 per passenger' }],
  FLIGHT: [], HOTEL: [],
  CAB: [{ code: 'INSURANCE', label: 'Ride insurance', sub: '₹2 lakh accident cover for everyone in the car · ₹3' }],
};

/** Common checkout for every mode (screens 77-79): summary, coupon, wallet, server-priced breakup in green, pay. */
export function CheckoutScreen({ navigation }: any) {
  useSecureScreen();
  const { c } = useTheme();
  const b = useBooking();
  const hold = b.hold!;
  const [addOns, setAddOns] = useState<string[]>(b.addOns);
  const [coupon, setCoupon] = useState<string | undefined>();
  const [couponInput, setCouponInput] = useState('');
  const [couponErr, setCouponErr] = useState<string | null>(null);
  const [useWallet, setUseWallet] = useState(false);
  const [couponSheet, setCouponSheet] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [mockSheet, setMockSheet] = useState(false);
  const payDriver = hold.mode === 'CAB' && b.extras.payOption === 'PAY_TO_DRIVER';

  const wallet = useQuery({ queryKey: ['wallet'], queryFn: Api.wallet });
  const offers = useQuery({ queryKey: ['offers'], queryFn: Api.offers });
  const quote = useQuery({
    queryKey: ['quote', hold.holdId, addOns, coupon, useWallet, b.extras.flightSeatIds],
    queryFn: () => Api.quote(hold.holdId, { addOns, couponCode: coupon, useWalletPaise: useWallet && !payDriver ? wallet.data?.balancePaise ?? 0 : 0, flightSeatIds: b.extras.flightSeatIds }),
    retry: false,
  });
  useEffect(() => {
    const e: any = quote.error;
    if (e?.code?.startsWith('COUPON')) { setCouponErr(e.message); setCoupon(undefined); setCouponSheet(true); }
    if (e?.code === 'HOLD_EXPIRED') { toast(e.message, 'error'); navigation.popToTop(); }
  }, [quote.error, navigation]);

  const s = hold.summary;
  const pay = async () => {
    setPaying(true);
    try {
      let id = bookingId;
      if (!id) {
        const bk = await Api.createBooking({ holdId: hold.holdId, pax: b.pax, contact: b.contact, addOns, couponCode: coupon,
          useWalletPaise: quote.data?.walletPaise || undefined, ...b.extras, flightSeatIds: undefined, international: undefined });
        id = bk.id; setBookingId(id);
        if (bk.status === 'CONFIRMED') return navigation.replace('PaymentStatus', { bookingId: id });
      }
      const r = await startPayment(id);
      if (r === 'mock') return setMockSheet(true);
      navigation.replace('PaymentStatus', { bookingId: id });
    } catch (e: any) {
      toast(e.message, 'error');
      if (['LADIES_SEAT', 'ADJACENT_FEMALE', 'PAX_COUNT', 'PASSPORT_VALIDITY', 'INSURANCE_MANDATORY', 'AGE_MISMATCH',
        'SEATS_EXCEEDED', 'LUGGAGE_EXCEEDED', 'WOMEN_RIDE_ONLY', 'PREPAID_REQUIRED'].includes(e.code)) navigation.goBack();
      if (e.code === 'HOLD_EXPIRED') navigation.popToTop();
    } finally { setPaying(false); }
  };

  const q = quote.data;
  return (
    <Screen title="Checkout" footer={
      <Row>
        <View style={{ flex: 1 }}><Txt v="xs" muted>{payDriver ? 'Pay driver after ride' : 'Total payable'}</Txt><Txt v="h1" color={c.success}>{q ? rupees(payDriver ? q.totalPaise : q.payablePaise) : '—'}</Txt></View>
        <Button style={{ flex: 1.3 }} title={payDriver ? 'Confirm ride' : q ? `Pay ${rupees(q.payablePaise)}` : 'Pay'} loading={paying} disabled={!q} onPress={pay} icon={payDriver ? 'car' : 'lock'} />
      </Row>}>
      <Stepper step={hold.mode === 'CAB' ? 2 : 3} labels={hold.mode === 'CAB' ? ['Car', 'Rider', 'Review', 'Pay'] : undefined} />
      <HoldTimer expiresAt={hold.expiresAt} label={hold.mode === 'CAB' ? 'Fare locked' : 'Inventory on hold'} onExpire={() => { toast('Time to pay has run out. Please select again.', 'error'); navigation.popToTop(); }} />

      {/* whiteboard 13: summary with city names */}
      <Card>
        <Row><Icon name={hold.mode === 'BUS' ? 'bus' : hold.mode === 'HOTEL' ? 'hotel' : hold.mode === 'FLIGHT' ? 'plane' : hold.mode === 'CAB' ? 'car' : 'train'} color={c.brand} />
          <Txt v="h3" style={{ flex: 1 }}>{s.title}</Txt>{b.womenMode && <Badge kind="ladies" text="Women mode" />}</Row>
        {hold.mode === 'BUS' && <>
          <Row style={{ marginTop: 8, justifyContent: 'space-between' }}>
            <View><Txt v="h3">{time(s.departAt)}</Txt><Txt v="xs" muted>{s.fromCity} · {s.boarding}</Txt></View>
            <Txt v="xs" muted>{dateShort(s.departAt)}</Txt>
            <View style={{ alignItems: 'flex-end' }}><Txt v="h3">{time(s.arriveAt)}</Txt><Txt v="xs" muted>{s.toCity} · {s.dropping}</Txt></View>
          </Row>
          <Txt v="small" muted style={{ marginTop: 6 }}>{s.operator} · Seats {s.seats.join(', ')}</Txt>
        </>}
        {hold.mode === 'HOTEL' && <Txt v="small" muted style={{ marginTop: 6 }}>{s.room} × {s.qty} · {dateShort(s.checkIn)} – {dateShort(s.checkOut)} · {s.nights} night(s)</Txt>}
        {hold.mode === 'FLIGHT' && <Txt v="small" muted style={{ marginTop: 6 }}>{s.airline} {s.flightNo} · {dateShort(s.departAt)} {time(s.departAt)} · {s.fareName}</Txt>}
        {hold.mode === 'TRAIN' && <Txt v="small" muted style={{ marginTop: 6 }}>{s.train} · {s.classCode} · {dateShort(s.departAt)} · {s.availability}</Txt>}
        {hold.mode === 'CAB' && <View style={{ marginTop: 6, gap: 2 }}>
          <Txt v="small" muted>{s.categoryLabel} ({s.examples}) · {s.tripLabel}{s.rentalLabel ? ` · ${s.rentalLabel}` : ''}{s.roundTrip ? ' · Round trip' : ''}</Txt>
          <Txt v="small" muted>{s.now ? 'Pickup now' : `Pickup ${dateShort(s.pickupAt)}, ${time(s.pickupAt)}`}{s.distanceKm ? ` · ${s.distanceKm} km` : ''}{s.returnAt ? ` · return ${dateShort(s.returnAt)}, ${time(s.returnAt)}` : ''}</Txt>
          {!!b.extras.cab?.pickupNote && <Txt v="small" muted>Note: {b.extras.cab.pickupNote}</Txt>}
        </View>}
        <Txt v="xs" muted style={{ marginTop: 4 }}>{hold.mode === 'CAB' ? `Rider ${b.pax[0]?.name} · ${b.extras.cab?.passengers ?? 1} passenger(s) · ${b.extras.cab?.luggage ?? 0} bag(s)` : `${b.pax.length} traveller(s)`} · {b.contact?.email}</Txt>
      </Card>

      {MODE_ADDONS[hold.mode].length > 0 && <Section title="Add-ons" />}
      {MODE_ADDONS[hold.mode].map((a) => (
        <Toggle key={a.code} value={addOns.includes(a.code)} label={a.label} sub={a.sub} icon="shield"
          onChange={(v) => setAddOns(v ? [...addOns, a.code] : addOns.filter((x) => x !== a.code))} />
      ))}

      <Section title="Offers & wallet" />
      <Card onPress={() => setCouponSheet(true)}>
        <Row><Icon name="tag" color={c.brand} />
          <View style={{ flex: 1 }}><Txt v="h3">{q?.coupon ? `${q.coupon} applied` : 'Apply coupon'}</Txt>
            <Txt v="small" color={q?.coupon ? c.success : c.muted}>{q?.coupon ? `You save ${rupees(q.discountPaise)}` : 'See available offers'}</Txt></View>
          <Txt v="small" color={c.brand}>{q?.coupon ? 'Change' : 'View'}</Txt></Row>
      </Card>
      {(wallet.data?.balancePaise ?? 0) > 0 && !payDriver && (
        <Toggle value={useWallet} onChange={setUseWallet} icon="wallet" label={`Use wallet balance (${rupees(wallet.data!.balancePaise)})`} sub="Instant · refunds also come back here" />
      )}

      <Section title="Fare details" />
      <Card>
        {quote.isLoading ? <Txt muted>Calculating…</Txt> : q && <>
          <PriceRow label="Base fare" paise={q.basePaise} />
          {q.taxPaise > 0 && <PriceRow label="Taxes & supplier fees" paise={q.taxPaise} />}
          {q.addOns.map((a) => <PriceRow key={a.code} label={a.label} paise={a.paise} />)}
          <PriceRow label="Convenience fee + GST" paise={q.convPaise + q.convGstPaise} />
          {q.discountPaise > 0 && <PriceRow label={`Offer applied (${q.coupon})`} paise={q.discountPaise} minus />}
          {q.walletPaise > 0 && <PriceRow label="Wallet" paise={q.walletPaise} minus />}
          <PriceRow label={payDriver ? 'Pay driver after ride' : 'You pay'} paise={payDriver ? q.totalPaise : q.payablePaise} total />
        </>}
      </Card>
      {q && <SaveBadge paise={q.savedPaise} />}
      {payDriver ? <Box text="Nothing is charged now. Pay the driver by cash or UPI at the end of the ride. Waiting, tolls and parking beyond the estimate are added as actuals." icon="wallet" />
        : <Box text="Prices are confirmed by Zproogo's server at payment. Card details are handled by Razorpay and never stored by us." icon="lock" />}

      <Sheet visible={couponSheet} onClose={() => setCouponSheet(false)} title="Apply coupon">
        <Row>
          <View style={{ flex: 1 }}><Field label="Coupon code" value={couponInput} onChangeText={(t) => { setCouponInput(cleanCoupon(t)); setCouponErr(null); }} autoCapitalize="characters" autoCorrect={false} maxLength={LIMITS.COUPON_MAX} error={couponErr ?? (couponInput ? validateCoupon(couponInput) || undefined : undefined)} /></View>
          <Button small title="Apply" onPress={() => { setCouponErr(null); setCoupon(couponInput.trim()); setCouponSheet(false); }} disabled={!!validateCoupon(couponInput)} />
        </Row>
        <Section title="Available for you" />
        {(offers.data ?? []).filter((o) => o.modes.includes(hold.mode)).map((o) => (
          <Card key={o.code}>
            <Row><View style={{ flex: 1 }}><Txt v="h3" style={{ letterSpacing: 1 }}>{o.code}</Txt><Txt v="small" muted>{o.description}</Txt></View>
              <Button small variant={coupon === o.code ? 'success' : 'outline'} title={coupon === o.code ? 'Applied' : 'Apply'}
                onPress={() => { setCouponErr(null); setCoupon(o.code); setCouponSheet(false); }} /></Row>
          </Card>
        ))}
        {coupon && <Button title="Remove coupon" variant="outline" onPress={() => { setCoupon(undefined); setCouponSheet(false); }} />}
      </Sheet>

      <ConfirmDialog visible={mockSheet} title="Test payment" icon="card" text="Payment mode is MOCK (local/staging). Choose the gateway result to simulate."
        confirm="Simulate success" cancel="Simulate failure" onCancel={async () => { setMockSheet(false); await Api.payMock(bookingId!, 'failure').catch(() => null); navigation.replace('PaymentStatus', { bookingId }); }}
        onConfirm={async () => { setMockSheet(false); await Api.payMock(bookingId!, 'success').catch((e) => toast(e.message, 'error')); navigation.replace('PaymentStatus', { bookingId }); }} />
    </Screen>
  );
}
