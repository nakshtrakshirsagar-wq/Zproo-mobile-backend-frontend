import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTheme } from '../../theme/ThemeProvider';
import { Badge, Box, Button, Card, ChipGroup, EmptyState, ErrorView, Field, Loading, PriceRow, Row, Screen, Section, Tabs, Txt } from '../../components/ui';
import { ConfirmDialog } from '../../components/widgets';
import { Icon } from '../../components/Icon';
import { Api } from '../../api/endpoints';
import { useAuth } from '../../store/auth';
import { rupees } from '../../utils/format';
import { toast } from '../../utils/toast';
import { LIMITS, cleanAlnumUpper, cleanName, collapseSpaces, onlyDigits, validateAccountNumber, validateIfsc, validateName, validateOtp, validateUpi } from '../../utils/validation';

/** CXL·00 step 1 - what to cancel (full / partial). */
export function CancelSelectScreen({ navigation, route }: any) {
  const { c } = useTheme();
  const q = useQuery({ queryKey: ['booking', route.params.id], queryFn: () => Api.booking(route.params.id) });
  const b = q.data;
  const items = (b?.items ?? []).filter((i) => i.kind !== 'ADDON' && i.status === 'ACTIVE');
  const [mode, setMode] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [sel, setSel] = useState<string[]>([]);
  if (!b) return <Screen title="Cancel booking">{q.error ? <ErrorView error={q.error} onRetry={q.refetch} /> : <Loading />}</Screen>;
  if (b.journeyStarted) {
    return (
      <Screen title="Cancel booking">
        <EmptyState icon="lock" title="Online cancel isn't available" text="The journey has started or the cut-off has passed. Here's what you can do:" />
        {[['bus', 'Bus · raise a complaint', 'GPS data checked; full refund if operator at fault', 'COMPLAINT'], ['train', 'Train · file TDR', 'Refund decided by Railways', 'TDR'],
          ['plane', 'Flight · no-show refund', 'Claim statutory taxes and fees', 'REFUND'], ['hotel', 'Hotel · contact support', 'We will talk to the hotel', 'OTHER'],
          ['car', 'Cab · report a ride issue', 'Fare, route or driver issue — we review the GPS trail', 'RIDE']]
          .filter(([i]) => i === ({ BUS: 'bus', TRAIN: 'train', FLIGHT: 'plane', HOTEL: 'hotel', CAB: 'car' } as Record<string, string>)[b.mode])
          .map(([i, t, s, cat]) => (
            <Card key={t} onPress={() => navigation.navigate('Help', { bookingId: b.id, category: cat })}>
              <Row><Icon name={i as any} color={c.brand} /><View style={{ flex: 1 }}><Txt v="h3">{t}</Txt><Txt v="xs" muted>{s}</Txt></View><Icon name="chev" color={c.muted} /></Row>
            </Card>))}
      </Screen>
    );
  }
  const chosen = mode === 'FULL' ? items.map((i) => i.id) : sel;
  return (
    <Screen title="Cancel booking" footer={<Button title="Get refund quote" disabled={!chosen.length} onPress={() => navigation.navigate('CancelConfirm', { id: b.id, itemIds: chosen })} />}>
      <Card><Txt v="h3">{b.details.title}</Txt><Txt v="xs" muted>{b.supplierPnr ? `PNR ${b.supplierPnr}` : b.code} · {dayjs(b.travelDate).format('ddd, D MMM')}</Txt></Card>
      {items.length > 1 && <Tabs value={mode} onChange={setMode} items={[{ value: 'FULL', label: 'Full booking' }, { value: 'PARTIAL', label: 'Partial' }]} />}
      {mode === 'PARTIAL' && items.map((i) => {
        const on = sel.includes(i.id);
        return (
          <Pressable key={i.id} onPress={() => setSel(on ? sel.filter((x) => x !== i.id) : [...sel, i.id])}
            style={{ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, borderRadius: 13, borderWidth: 1.5, marginVertical: 5, borderColor: on ? c.brand : c.border, backgroundColor: c.surface }}>
            <View style={{ width: 18, height: 18, borderRadius: 5, borderWidth: 2, borderColor: on ? c.brand : c.border, backgroundColor: on ? c.brand : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {on && <Icon name="check" size={11} color="#fff" strokeWidth={3} />}</View>
            <Txt style={{ flex: 1 }}>{i.label} · {i.paxName}</Txt><Txt v="small" color={c.success} bold>{rupees(i.pricePaise)}</Txt>
          </Pressable>
        );
      })}
      <Box text="You'll see the exact refund before you confirm. Charges follow the operator / airline / hotel policy shown at booking." />
    </Screen>
  );
}

const REASONS = [{ value: 'PLANS_CHANGED', label: 'Plans changed' }, { value: 'BETTER_PRICE', label: 'Found better price' }, { value: 'WRONG_DATE', label: 'Wrong date' }, { value: 'HEALTH', label: 'Health' }, { value: 'OTHER', label: 'Other' }];

/** CXL·00 steps 2-4 - live quote with breakup, reason, refund mode, confirm (+ OTP re-check for high value). */
export function CancelConfirmScreen({ navigation, route }: any) {
  const { c } = useTheme();
  const qc = useQueryClient();
  const { id, itemIds } = route.params;
  const q = useQuery({ queryKey: ['cxquote', id, itemIds], queryFn: () => Api.cancelQuote(id, itemIds), retry: false });
  const [reason, setReason] = useState('PLANS_CHANGED');
  const [modeR, setModeR] = useState<'SOURCE' | 'WALLET'>('WALLET');
  const [confirm, setConfirm] = useState(false);
  const [otpNeeded, setOtpNeeded] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpErr, setOtpErr] = useState('');
  const [busy, setBusy] = useState(false);
  const user = useAuth((s) => s.user);
  const r = q.data;

  const go = async () => {
    if (otpNeeded) { const oe = validateOtp(otp); setOtpErr(oe); if (oe) return; }
    setBusy(true);
    try {
      const res = await Api.cancel({ bookingId: id, itemIds, reason, refundMode: modeR, otp: otp || undefined });
      setConfirm(false);
      qc.invalidateQueries({ queryKey: ['booking', id] }); qc.invalidateQueries({ queryKey: ['trips'] }); qc.invalidateQueries({ queryKey: ['wallet'] });
      toast(res.status === 'CANCELLATION_PENDING' ? 'Cancelling with operator…' : 'Cancelled', 'success');
      // cab rides go back to the ride screen (shows the cancelled state + refund link); others to the refund tracker
      if (r?.rideStageLabel) navigation.replace('CabRide', { id }); else navigation.replace('RefundTracker', { bookingId: id });
    } catch (e: any) {
      if (e.code === 'REAUTH_REQUIRED') { setOtpNeeded(true); if (user?.mobile) await Api.sendOtp(user.mobile).catch(() => undefined); }
      else { setConfirm(false); toast(e.message, 'error'); }
    } finally { setBusy(false); }
  };

  if (q.error) return <Screen title="Refund quote"><ErrorView error={q.error} onRetry={q.refetch} />{(q.error as any).details?.option && <Box text={(q.error as any).details.option.text} />}</Screen>;
  if (!r) return <Screen title="Refund quote"><Loading text="Fetching live quote…" /></Screen>;
  return (
    <Screen title={r.rideStageLabel ? 'Cancel ride' : 'Refund quote'} footer={<Button title={r.payOption === 'PAY_TO_DRIVER' ? 'Cancel ride' : `Cancel · refund ${rupees(r.refundPaise)}`} onPress={() => setConfirm(true)} />}>
      <Row gap={6}><Icon name="refresh" size={12} color={c.muted} /><Txt v="xs" muted>{r.rideStageLabel ? `Live ride status: ${r.rideStageLabel}`
        : `${r.source === 'SUPPLIER' ? 'Live quote from operator' : 'As per cancellation policy'} · ${r.hoursLeft} h before departure`}</Txt></Row>
      {r.source !== 'SUPPLIER' && r.policySlabs?.length > 1 && <View style={{ flexDirection: 'row', gap: 4, marginVertical: 8 }}>
        {r.policySlabs.map((s: any) => { const on = s.hoursBefore === r.slab.hoursBefore; return (
          <View key={s.hoursBefore} style={{ flex: 1, borderRadius: 9, padding: 6, alignItems: 'center', backgroundColor: on ? c.brand : c.chip }}>
            <Txt v="h3" color={on ? '#fff' : c.text}>{s.chargePct}%</Txt><Txt v="xs" color={on ? '#fff' : c.muted}>{'>'}{s.hoursBefore}h</Txt></View>); })}
      </View>}
      <Card>
        <PriceRow label="Amount paid for selection" paise={r.lines.paidPaise} />
        <PriceRow label="Cancellation charge" paise={r.lines.chargePaise} minus />
        {r.lines.convFeeKeptPaise > 0 && <PriceRow label="Convenience fee (non-refundable)" paise={r.lines.convFeeKeptPaise} minus />}
        {r.lines.couponPaise > 0 && <PriceRow label="Coupon discount taken back" paise={r.lines.couponPaise} minus />}
        {r.lines.insuranceRefundPaise > 0 && <PriceRow label="Insurance refund" paise={r.lines.insuranceRefundPaise} green />}
        <PriceRow label="Refund" paise={r.refundPaise} total />
      </Card>
      {r.operator && (
        <Card>
          <Txt v="small" bold>Operator quote</Txt>
          {r.operator.chargePct ? <Row><Txt v="small" muted style={{ flex: 1 }}>Cancellation charge</Txt><Txt>{r.operator.chargePct}</Txt></Row> : null}
          {r.operator.totalFarePaise != null && <Row><Txt v="small" muted style={{ flex: 1 }}>Ticket fare with taxes</Txt><Txt>{rupees(r.operator.totalFarePaise)}</Txt></Row>}
          {r.operator.refundPaise != null && <Row><Txt v="small" muted style={{ flex: 1 }}>Refund from operator</Txt><Txt>{rupees(r.operator.refundPaise)}</Txt></Row>}
          {r.operator.serviceTaxOnChargePaise ? <Row><Txt v="small" muted style={{ flex: 1 }}>Service tax on charge</Txt><Txt>{rupees(r.operator.serviceTaxOnChargePaise)}</Txt></Row> : null}
        </Card>
      )}
      {r.notes.map((n: string) => <Txt key={n} v="xs" muted>• {n}</Txt>)}
      <Section title="Why are you cancelling?" />
      <ChipGroup value={reason} onChange={setReason} options={REASONS} />
      {r.payOption === 'PAY_TO_DRIVER' && <Box text="Nothing was paid online for this ride, so there is no refund." />}
      {r.payOption !== 'PAY_AT_HOTEL' && r.payOption !== 'PAY_TO_DRIVER' && r.refundPaise > 0 && <>
        <Section title="Refund to" />
        {([['WALLET', 'Zproogo wallet · instant', 'Use on your next trip'], ['SOURCE', 'Original payment method', 'UPI 1–3 days · cards 5–7 working days']] as const).map(([v, t, s]) => (
          <Pressable key={v} onPress={() => setModeR(v)} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, borderRadius: 13, borderWidth: 1.5, marginVertical: 5, borderColor: modeR === v ? c.brand : c.border, backgroundColor: c.surface }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: modeR === v ? 6 : 2, borderColor: modeR === v ? c.brand : c.border }} />
            <View style={{ flex: 1 }}><Txt v="h3">{t}</Txt><Txt v="xs" muted>{s}</Txt></View>{v === 'WALLET' && <Badge kind="success" text="Instant" />}
          </Pressable>
        ))}
      </>}
      <ConfirmDialog visible={confirm} danger icon="alert" title={r.rideStageLabel ? 'Cancel this ride?' : `Cancel ${r.full ? 'booking' : r.items.map((i: any) => i.label).join(', ')}?`}
        text={r.payOption === 'PAY_TO_DRIVER' ? 'This cannot be undone. Your driver will be released.'
          : `This cannot be undone. Refund ${rupees(r.refundPaise)} ${modeR === 'WALLET' ? 'to your wallet instantly' : 'to your original payment method'}.`}
        confirm="Yes, cancel" cancel="Keep booking" loading={busy} onConfirm={go} onCancel={() => { setConfirm(false); setOtpNeeded(false); }}>
        {otpNeeded && <><Box kind="warn" text="For your security, enter the OTP we just sent to your mobile." />
          <Field label="OTP" value={otp} onChangeText={(t) => { setOtp(onlyDigits(t, LIMITS.OTP_LEN)); setOtpErr(''); }} keyboardType="number-pad" maxLength={LIMITS.OTP_LEN} autoComplete="sms-otp" error={otpErr || undefined} /></>}
      </ConfirmDialog>
    </Screen>
  );
}

/** CXL·RF - refund tracker. */
export function RefundTrackerScreen({ navigation, route }: any) {
  const { c } = useTheme();
  const q = useQuery({ queryKey: ['refunds'], queryFn: Api.refunds, refetchInterval: 10000 });
  const list = (q.data ?? []).filter((r) => !route.params?.bookingId || r.bookingId === route.params.bookingId);
  return (
    <Screen title="Refund tracker">
      {q.isLoading ? <Loading /> : !list.length ? <EmptyState icon="refresh" title="Refund is being prepared" text="If a refund is due, it will appear here in a moment." action="Refresh" onAction={q.refetch} /> : list.map((r) => {
        const steps = [['Cancelled', true], ['Refund initiated', true], [r.mode === 'WALLET' ? 'Credited to wallet' : 'Processing at bank', r.status !== 'INITIATED'],
          ['Credited', r.status === 'REFUNDED']] as const;
        return (
          <Card key={r.id}>
            <View style={{ alignItems: 'center' }}><Txt v="xs" muted>Refund amount</Txt><Txt v="title" color={c.success}>{rupees(r.amountPaise)}</Txt>
              <Txt v="small" muted>{r.mode === 'WALLET' ? 'Zproogo wallet · instant' : r.mode === 'BANK' ? 'Bank transfer' : 'Original payment method'}</Txt></View>
            <View style={{ marginTop: 12 }}>
              {steps.map(([t, done], k) => (
                <Row key={t} style={{ paddingVertical: 6 }}>
                  <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: r.status === 'FAILED' && k === 3 ? c.danger : done ? c.success : c.border }} />
                  <Txt bold={done} style={{ flex: 1 }}>{t}</Txt>
                </Row>))}
            </View>
            {r.arn && <Txt v="xs" muted>Bank reference (ARN): {r.arn}</Txt>}
            {r.status === 'FAILED' && <>
              <Box kind="error" text={r.failureReason ?? 'Refund could not reach your account'} />
              <Button small title="Add bank account / UPI" onPress={() => navigation.navigate('RefundPayout', { refundId: r.id })} />
            </>}
          </Card>
        );
      })}
      <Button title="Raise a query" variant="outline" onPress={() => navigation.navigate('Help')} style={{ marginTop: 8 }} />
    </Screen>
  );
}

/** Refund failed -> pay out to bank / UPI (details are not stored). */
export function RefundPayoutScreen({ navigation, route }: any) {
  const [type, setType] = useState<'BANK' | 'UPI'>('BANK');
  const [f, setF] = useState({ accountName: '', accountNumber: '', ifsc: '', upiId: '' });
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }));
  const all: Record<string, string> = {};
  if (type === 'BANK') {
    const a = validateName(f.accountName, { label: 'Account holder name', max: 80 }); if (a) all.accountName = a;
    const n = validateAccountNumber(f.accountNumber); if (n) all.accountNumber = n;
    const i = validateIfsc(f.ifsc); if (i) all.ifsc = i;
  } else { const u = validateUpi(f.upiId); if (u) all.upiId = u; }
  const errors: Record<string, string> = {};
  Object.keys(all).forEach((k) => { if (submitted || touched[k]) errors[k] = all[k]; });
  return (
    <Screen title="Refund details" footer={<Button title="Send refund" loading={busy} onPress={async () => {
      setSubmitted(true);
      if (Object.keys(all).length) return;
      setBusy(true);
      try {
        await Api.refundPayout(route.params.refundId, type === 'BANK' ? { type, accountName: collapseSpaces(f.accountName), accountNumber: f.accountNumber, ifsc: f.ifsc.toUpperCase() } : { type, upiId: f.upiId.trim() });
        toast('Refund will be sent to your account', 'success'); navigation.goBack();
      } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
    }} />}>
      <Txt muted>The refund could not reach your card (for example, card closed). Add an account and we'll pay out directly.</Txt>
      <Tabs value={type} onChange={setType} items={[{ value: 'BANK', label: 'Bank', icon: 'bank' }, { value: 'UPI', label: 'UPI ID', icon: 'phone' }]} />
      {type === 'BANK' ? <>
        <Field label="Account holder" value={f.accountName} onChangeText={(t) => setF({ ...f, accountName: cleanName(t, 80) })} onBlur={() => touch('accountName')} error={errors.accountName} autoCapitalize="words" autoCorrect={false} maxLength={80} />
        <Field label="Account number" value={f.accountNumber} onChangeText={(t) => setF({ ...f, accountNumber: onlyDigits(t, LIMITS.ACCOUNT_MAX) })} onBlur={() => touch('accountNumber')} error={errors.accountNumber} keyboardType="number-pad" maxLength={LIMITS.ACCOUNT_MAX} secureTextEntry />
        <Field label="IFSC" value={f.ifsc} onChangeText={(t) => setF({ ...f, ifsc: cleanAlnumUpper(t, LIMITS.IFSC_LEN) })} onBlur={() => touch('ifsc')} error={errors.ifsc} autoCapitalize="characters" autoCorrect={false} maxLength={LIMITS.IFSC_LEN} />
      </> : <Field label="UPI ID" value={f.upiId} onChangeText={(t) => setF({ ...f, upiId: t.replace(/\s/g, '').slice(0, LIMITS.UPI_MAX) })} onBlur={() => touch('upiId')} error={errors.upiId} autoCapitalize="none" autoCorrect={false} maxLength={LIMITS.UPI_MAX} placeholder="name@bank" />}
      <Box icon="lock" text="Your bank details go straight to the payout partner and are not stored by Zproogo." />
    </Screen>
  );
}
