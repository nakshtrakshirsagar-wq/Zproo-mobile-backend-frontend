import React, { useEffect, useState } from 'react';
import { Linking, Pressable, Share, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import dayjs from 'dayjs';
import { useTheme } from '../../theme/ThemeProvider';
import { Badge, Box, Button, Card, Chip, EmptyState, Field, PriceRow, Row, Screen, Section, Sheet, Stars, Txt } from '../../components/ui';
import { Icon, IconName } from '../../components/Icon';
import { toast } from '../../utils/toast';
import { BIKE_RULES, FUEL_LABELS, Fuel, bikeOf, extendOptions, finalBill, hubOf, validateOdometer } from './bikeRules';
import { Rental, RentalStatus, isLive, rentalRoute, simulatedKm, useBikeStore } from './bikeStore';
import { fmtTime, fmtWhen, rs } from './BikeBooking';

function useNow(ms = 1000) {
  const [n, setN] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setN(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return n;
}
const hm = (ms: number) => { const m = Math.max(0, Math.floor(ms / 60000)); return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`; };
const useRental = (id?: string) => useBikeStore((s) => s.rentals.find((x) => x.id === id));
const NotFound = ({ navigation }: any) => <Screen title="Rental"><EmptyState icon="bike" title="Rental not found" action="My rentals" onAction={() => navigation.replace('BikeRentals')} /></Screen>;

// ============================================================ B8 · Ride in progress  (+ B8b extend sheet)
export function BikeRideScreen({ navigation, route }: any) {
  const { c } = useTheme();
  const r = useRental(route.params?.id);
  const extend = useBikeStore((s) => s.extend);
  const requestReturn = useBikeStore((s) => s.requestReturn);
  const report = useBikeStore((s) => s.reportDamage);
  const now = useNow();
  const [ext, setExt] = useState(false);
  const [optId, setOptId] = useState('H3');
  const [busy, setBusy] = useState(false);
  const [dmg, setDmg] = useState(false);
  const [note, setNote] = useState('');
  if (!r) return <NotFound navigation={navigation} />;
  if (r.status !== 'ACTIVE') { return <Screen title="Your rental" onBack={() => navigation.navigate('Main')}><Box icon="info" text="This ride is not active." /><Button title="Open rental" onPress={() => navigation.replace(rentalRoute(r).name, rentalRoute(r).params)} style={{ marginTop: 10 }} /></Screen>; }
  const b = bikeOf(r.bikeId), hub = hubOf(r.hubId);
  const total = Math.max(1, r.endAt - (r.startedAt ?? r.startAt));
  const left = r.endAt - now;
  const late = left < 0;
  const frac = Math.min(1, Math.max(0, left / total));
  const km = simulatedKm(r, now);
  const over = r.freeKm !== null && km > r.freeKm;
  const opts = extendOptions(b);
  const opt = opts.find((o) => o.id === optId)!;
  const newEnd = dayjs(Math.max(r.endAt, now)).add(opt.hours, 'hour').valueOf();
  const R = 40, C = 2 * Math.PI * R;

  const pay = async () => {
    setBusy(true);
    try { await new Promise((res) => setTimeout(res, 700)); extend(r.id, opt.id); setExt(false); toast(`Ride extended to ${fmtTime(newEnd)}`, 'success'); } finally { setBusy(false); }
  };
  const tile = (icon: IconName, t: string, s: string, on: () => void, hi?: boolean) => (
    <Pressable key={t} onPress={on} accessibilityLabel={t} style={{ width: '48%', padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: hi ? c.brand : c.border, backgroundColor: c.surface }}>
      <Icon name={icon} size={20} color={c.brand} /><Txt v="h3" style={{ marginTop: 4 }}>{t}</Txt><Txt v="xs" muted>{s}</Txt>
    </Pressable>
  );
  return (
    <Screen title="Your rental" onBack={() => navigation.navigate('Main')}
      right={<Pressable onPress={() => Linking.openURL('tel:112').catch(() => toast('Could not open the dialler', 'error'))} accessibilityLabel="SOS" style={{ backgroundColor: c.danger, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}><Txt v="xs" color="#fff" bold>SOS</Txt></Pressable>}
      footer={<Button title="Return bike" onPress={() => { requestReturn(r.id); navigation.replace('BikeReturn', { id: r.id }); }} />}>
      <View style={{ backgroundColor: '#0B1F3A', borderRadius: 18, padding: 14 }}>
        <Row>
          <View style={{ width: 96, height: 96, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={96} height={96} viewBox="0 0 96 96">
              <Circle cx={48} cy={48} r={R} stroke="#1E3A5F" strokeWidth={8} fill="none" />
              <Circle cx={48} cy={48} r={R} stroke={late ? '#E11D48' : '#38BDF8'} strokeWidth={8} fill="none" strokeLinecap="round" strokeDasharray={`${C * (late ? 1 : frac)} ${C}`} rotation={-90} origin="48, 48" />
            </Svg>
            <View style={{ position: 'absolute', alignItems: 'center' }}><Txt v="h3" color="#fff">{late ? hm(-left) : hm(left)}</Txt><Txt v="xs" color="#BAE6FD">{late ? 'late' : 'left'}</Txt></View>
          </View>
          <View style={{ flex: 1 }}>
            <Txt v="h3" color="#fff">{b.name}</Txt><Txt v="xs" color="#BAE6FD">{b.plate}</Txt>
            <Txt v="xs" color="#BAE6FD" style={{ marginTop: 6 }}>Return by <Txt v="xs" color="#fff" bold>{fmtTime(r.endAt)}</Txt> · {hub.name}</Txt>
          </View>
        </Row>
      </View>
      <Card style={{ marginTop: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}><Txt v="small" muted>Km used</Txt><Txt v="h3">{km} <Txt v="xs" muted>/ {r.freeKm === null ? 'unlimited' : `${r.freeKm} free`}</Txt></Txt></Row>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: c.chip, marginVertical: 6, overflow: 'hidden' }}><View style={{ width: `${r.freeKm ? Math.min(100, (km / r.freeKm) * 100) : 12}%`, height: 8, backgroundColor: over ? c.danger : c.success }} /></View>
        <Txt v="xs" muted>{r.freeKm === null ? 'Unlimited km on this bike' : `After ${r.freeKm} km: ${rs(b.extraKm)} per km`}</Txt>
      </Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
        {tile('clock', 'Extend rental', `From ${rs(b.hourly)}/hr`, () => setExt(true), true)}
        {tile('wheel', 'Roadside help', 'Puncture, breakdown', () => Linking.openURL(`tel:${hub.phone}`).catch(() => toast('Could not open the dialler', 'error')))}
        {tile('pin', b.fuel === 'Electric' ? 'Charging nearby' : 'Fuel nearby', b.fuel === 'Electric' ? 'Ather Grid points' : 'Petrol pumps', () => Linking.openURL(`geo:0,0?q=${b.fuel === 'Electric' ? 'ev charging station' : 'petrol pump'}`).catch(() => toast('No maps app found', 'error')))}
        {tile('alert', 'Report damage', 'Add photos now', () => setDmg(true))}
      </View>
      <View style={{ marginTop: 10 }}>
        <Box kind={late ? 'error' : 'warn'} icon="alert" text={late ? `You are past your return time. Late return costs ${rs(BIKE_RULES.LATE_PER_HR_PAISE)}/hr. Extend or return now.` : `We will remind you 30 min before return. Late return costs ${rs(BIKE_RULES.LATE_PER_HR_PAISE)}/hr.`} />
      </View>
      {r.extensions.length > 0 && <Txt v="xs" muted style={{ marginTop: 8 }}>Extended: {r.extensions.map((e) => `${e.label} (${rs(e.paise)})`).join(', ')}</Txt>}

      <Sheet visible={ext} onClose={() => setExt(false)} title="Extend your ride">
        <Txt v="small" muted>Current return: {fmtWhen(r.endAt)}</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 10 }}>
          {opts.map((o) => { const on = o.id === optId; return (
            <Pressable key={o.id} onPress={() => setOptId(o.id)} accessibilityState={{ selected: on }} style={{ width: '48%', padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: on ? c.brand : c.border, backgroundColor: on ? c.dangerBg : c.surface }}>
              <Txt v="h3">{o.label}</Txt><Txt v="xs" muted>{rs(o.paise)}</Txt>
            </Pressable>); })}
        </View>
        <View style={{ backgroundColor: c.infoBg, borderRadius: 10, padding: 10 }}><Row style={{ justifyContent: 'space-between' }}><Txt v="small" muted>New return time</Txt><Txt v="h3">{fmtWhen(newEnd)}</Txt></Row></View>
        <Txt v="xs" color={c.success} style={{ marginVertical: 8 }}>{b.freeKm10 === null ? 'Unlimited km continues.' : 'Free km grow with the extension.'} Late fees stop once you extend.</Txt>
        <Button title={`Pay ${rs(opt.paise)} & extend`} loading={busy} onPress={pay} />
      </Sheet>
      <Sheet visible={dmg} onClose={() => setDmg(false)} title="Report damage">
        <Field label="What happened?" value={note} maxLength={200} multiline onChangeText={setNote} />
        <Txt v="xs" muted style={{ marginBottom: 8 }}>Our team will call you and arrange help. Photos can be shared at the hub.</Txt>
        <Button title="Send report" onPress={() => { if (note.trim().length < 5) return toast('Describe the damage in a few words', 'error'); report(r.id, note.trim()); setNote(''); setDmg(false); toast('Report sent. We will call you', 'success'); }} />
      </Sheet>
    </Screen>
  );
}

// ============================================================ B9 · Return & final bill
export function BikeReturnScreen({ navigation, route }: any) {
  const { c } = useTheme();
  const r = useRental(route.params?.id);
  const closeReturn = useBikeStore((s) => s.closeReturn);
  const patch = useBikeStore((s) => s.patch);
  const [odo, setOdo] = useState('');
  const [fuel, setFuel] = useState<Fuel>(4);
  const [tried, setTried] = useState(false);
  const [dispute, setDispute] = useState(false);
  const [note, setNote] = useState('');
  const [at] = useState(Date.now());
  const [fuelTouched, setFuelTouched] = useState(false);
  useEffect(() => { if (r?.startFuel !== undefined && !fuelTouched) setFuel(r.startFuel); }, [r?.startFuel]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!r) return <NotFound navigation={navigation} />;
  if (r.status === 'CLOSED') { navigation.replace('BikeClosed', { id: r.id }); return null; }
  const b = bikeOf(r.bikeId);
  const ev = b.fuel === 'Electric';
  const min = r.startKm ?? 0;
  const oErr = validateOdometer(odo, min);
  const bill = odo && !oErr ? finalBill(b, { depositPaise: r.depositPaise, freeKm: r.freeKm, endsAt: r.endAt, returnedAt: at, startFuel: r.startFuel ?? 4, endFuel: ev ? 4 : fuel, kmDriven: Number(odo) - min }) : null;
  const paidRent = r.paidPaise - r.depositPaise + r.extendedPaise;
  const done = () => {
    setTried(true);
    if (oErr) return toast(oErr, 'error');
    closeReturn(r.id, { km: Number(odo), fuel: ev ? 4 : fuel, at });
    navigation.replace('BikeClosed', { id: r.id });
  };
  const stat = (t: string, v: string, s?: string, warn?: boolean) => <View key={t} style={{ flex: 1, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 8, alignItems: 'center' }}><Txt v="xs" muted>{t}</Txt><Txt v="h3">{v}</Txt>{!!s && <Txt v="xs" color={warn ? c.warning : c.muted}>{s}</Txt>}</View>;
  return (
    <Screen title="Return check" onBack={() => navigation.navigate('Main')} footer={<Button title="Agree & close rental" onPress={done} />}>
      <Txt v="small" muted center style={{ marginTop: -6, marginBottom: 8 }}>{hubOf(r.hubId).name} · checked by Amit</Txt>
      <Card>
        <Txt v="h3" style={{ marginBottom: 6 }}>Readings at return</Txt>
        <Field label={`Odometer (km) · started at ${min}`} value={odo} keyboardType="number-pad" maxLength={7} onChangeText={(t) => setOdo(t.replace(/\D/g, ''))} error={tried ? oErr || undefined : undefined} />
        {!ev ? (
          <>
            <Txt v="xs" muted style={{ marginBottom: 4 }}>Fuel now · started at {FUEL_LABELS[r.startFuel ?? 4]}</Txt>
            <Row gap={6} style={{ backgroundColor: c.chip, borderRadius: 12, padding: 4 }}>
              {FUEL_LABELS.map((l, i) => (
                <Pressable key={l} onPress={() => { setFuel(i as Fuel); setFuelTouched(true); }} style={{ flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center', backgroundColor: fuel === i ? c.brand : 'transparent' }}>
                  <Txt v="xs" color={fuel === i ? '#fff' : c.text} bold={fuel === i}>{l}</Txt>
                </Pressable>
              ))}
            </Row>
          </>
        ) : <Txt v="xs" muted>Electric: no fuel charge.</Txt>}
      </Card>
      {bill && <>
        <Row gap={8} style={{ marginVertical: 8 }}>
          {stat('Driven', `${bill.kmDriven} km`, bill.extraKm ? `${bill.extraKm} km extra` : 'within free km', !!bill.extraKm)}
          {stat('Fuel', ev ? 'Electric' : FUEL_LABELS[fuel], ev ? undefined : bill.fuelQuarters ? `took ${FUEL_LABELS[bill.fuelQuarters]}` : 'same as pickup', !!bill.fuelQuarters)}
          {stat('Returned', fmtTime(at), bill.lateMin > BIKE_RULES.LATE_GRACE_MIN ? `${bill.lateMin} min late` : 'on time', bill.lateMin > BIKE_RULES.LATE_GRACE_MIN)}
        </Row>
        <View style={{ backgroundColor: c.successBg, borderRadius: 12, padding: 10, marginBottom: 8 }}>
          <Row><Icon name="check" color={c.success} /><View style={{ flex: 1 }}><Txt v="h3" color={c.success}>No new damage</Txt><Txt v="xs" muted>Matched with your {Object.values(r.photos).filter(Boolean).length || 4} pickup photos</Txt></View></Row>
        </View>
        <Card>
          <Txt v="h3" style={{ marginBottom: 6 }}>Final bill</Txt>
          <Row style={{ justifyContent: 'space-between', marginVertical: 3 }}><Txt v="small" muted>Rent + add-ons</Txt><Txt v="small" color={c.success} bold>Paid {rs(paidRent)}</Txt></Row>
          {bill.extraKmPaise > 0 && <PriceRow label={`Extra km · ${bill.extraKm} × ${rs(b.extraKm)}`} paise={bill.extraKmPaise} />}
          {bill.latePaise > 0 && <PriceRow label={`Late return · ${bill.lateHours} hr`} paise={bill.latePaise} />}
          {bill.fuelPaise > 0 && <PriceRow label={`Fuel top-up · ${FUEL_LABELS[bill.fuelQuarters]} tank`} paise={bill.fuelPaise} />}
          <View style={{ height: 1, backgroundColor: c.border, marginVertical: 6 }} />
          <PriceRow label="Deducted from deposit" paise={bill.deductions} minus />
          <View style={{ backgroundColor: c.infoBg, borderRadius: 10, padding: 10, marginTop: 6 }}><PriceRow label="Deposit refund" paise={bill.refundPaise} total /></View>
          {bill.deductions >= r.depositPaise && <Txt v="xs" color={c.danger} style={{ marginTop: 4 }}>Charges are more than your deposit. Our team will contact you for the balance.</Txt>}
        </Card>
      </>}
      {!bill && <Box icon="info" text="Enter the odometer reading to see your final bill." />}
      <Txt v="small" color={c.danger} center style={{ marginTop: 12 }} onPress={() => setDispute(true)}>Something wrong? Raise a dispute</Txt>
      <Sheet visible={dispute} onClose={() => setDispute(false)} title="Raise a dispute">
        <Field label="What is wrong with the bill?" value={note} maxLength={200} multiline onChangeText={setNote} />
        <Button title="Submit dispute" onPress={() => { if (note.trim().length < 5) return toast('Tell us what is wrong in a few words', 'error'); patch(r.id, { damageReports: [...r.damageReports, { at: Date.now(), note: 'DISPUTE: ' + note.trim() }] }); setNote(''); setDispute(false); toast('Dispute raised. Support will contact you within 24 hrs', 'success'); }} />
      </Sheet>
    </Screen>
  );
}

// ============================================================ B10 · Rental closed
const TAGS = ['Clean bike', 'Smooth ride', 'Quick pickup', 'Helmet fit'];
export function BikeClosedScreen({ navigation, route }: any) {
  const { c } = useTheme();
  const r = useRental(route.params?.id);
  const rate = useBikeStore((s) => s.rate);
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  useEffect(() => { if (r?.rating) { setStars(r.rating); setTags(r.tags ?? []); } }, [r?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!r) return <NotFound navigation={navigation} />;
  const b = bikeOf(r.bikeId);
  const refund = r.refundPaise ?? 0;
  const mins = r.returnedAt && r.startedAt ? Math.round((r.returnedAt - r.startedAt) / 60000) : 0;
  const invoice = () => Share.share({ message: [`Zproogo bike rental invoice`, `Booking ${r.id} · ${b.name} (${b.plate})`, `${fmtWhen(r.startedAt ?? r.startAt)} to ${fmtWhen(r.returnedAt ?? r.endAt)}`,
    `Rent + add-ons: ${rs(r.paidPaise - r.depositPaise + r.extendedPaise)}`, `Extra km: ${rs(r.bill?.extraKmPaise ?? 0)}`, `Late return: ${rs(r.bill?.latePaise ?? 0)}`, `Fuel top-up: ${rs(r.bill?.fuelPaise ?? 0)}`,
    `Deposit ${rs(r.depositPaise)} · deducted ${rs(r.bill?.deductions ?? 0)} · refunded ${rs(refund)}`].join('\n') }).catch(() => {});
  const again = () => { navigation.navigate('BikeHome'); };
  const submit = () => {
    if (stars) rate(r.id, stars, tags);
    navigation.navigate('Main');
  };
  const step = (t: string, s: string, done: boolean, last?: boolean) => (
    <Row key={t} style={{ alignItems: 'flex-start', marginVertical: 2 }}>
      <View style={{ alignItems: 'center' }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: done ? c.success : c.surface, borderWidth: 2, borderColor: done ? c.success : c.border }} />{!last && <View style={{ width: 2, height: 22, backgroundColor: done ? c.success : c.border }} />}</View>
      <Txt v="small" style={{ flex: 1 }}>{t}</Txt><Txt v="small" muted>{s}</Txt>
    </Row>
  );
  return (
    <Screen title="" onBack={() => navigation.navigate('Main')} footer={<Button title="Submit & go home" onPress={submit} />}>
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.successBg, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={32} color={c.success} /></View>
        <Txt v="h1" style={{ marginTop: 8 }}>Rental closed</Txt>
        <Txt v="small" muted>{b.name.replace('Honda ', '').replace('Bajaj ', '')} · {Math.floor(mins / 60)} hrs {mins % 60} min · {r.bill?.kmDriven ?? 0} km</Txt>
      </View>
      <Card style={{ marginTop: 12 }}>
        <Txt v="h3" style={{ marginBottom: 6 }}>Deposit refund · {rs(refund)}</Txt>
        {step('Bike checked in', r.returnedAt ? fmtTime(r.returnedAt) : '', true)}
        {step('Refund started to your payment method', r.returnedAt ? fmtTime(r.returnedAt + 4 * 60000) : '', true)}
        {step('Credited to your bank', `By ${dayjs(r.returnedAt ?? Date.now()).add(BIKE_RULES.DEPOSIT_REFUND_HOURS, 'hour').format('ddd, D MMM')}`, false, true)}
      </Card>
      <Card>
        <Txt v="h3" center>How was the bike?</Txt>
        <View style={{ marginVertical: 8 }}><Stars value={stars} onChange={setStars} /></View>
        <Row gap={6} style={{ flexWrap: 'wrap', justifyContent: 'center' }}>{TAGS.map((t) => <Chip key={t} label={t} on={tags.includes(t)} onPress={() => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t])} />)}</Row>
      </Card>
      <Row gap={8}>
        <Button variant="outline" icon="download" title="Invoice" style={{ flex: 1 }} onPress={invoice} />
        <Button variant="outline" icon="refresh" title="Rent again" style={{ flex: 1 }} onPress={again} />
      </Row>
    </Screen>
  );
}

// ============================================================ My rentals
const STATUS: Record<RentalStatus, [string, 'success' | 'danger' | 'warn' | 'info' | 'neutral']> = {
  RESERVED: ['Reserved', 'info'], PICKUP: ['Pickup check', 'warn'], ACTIVE: ['Riding', 'success'], RETURNING: ['Returning', 'warn'], CLOSED: ['Closed', 'neutral'], CANCELLED: ['Cancelled', 'danger'],
};
export function BikeRentalsScreen({ navigation }: any) {
  const { c } = useTheme();
  const rentals = useBikeStore((s) => s.rentals);
  const live = rentals.filter(isLive), past = rentals.filter((r) => !isLive(r));
  const card = (r: Rental) => { const b = bikeOf(r.bikeId); const [t, k] = STATUS[r.status]; return (
    <Card key={r.id} onPress={() => { const x = rentalRoute(r); navigation.navigate(x.name, x.params); }}>
      <Row><View style={{ flex: 1 }}><Txt v="h3">{b.name}</Txt><Txt v="xs" muted>{r.id} · {fmtWhen(r.startAt)}</Txt><Txt v="xs" muted>{hubOf(r.hubId).name}</Txt></View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}><Badge text={t} kind={k} /><Txt v="small" bold>{rs(r.paidPaise + r.extendedPaise)}</Txt></View></Row>
    </Card>); };
  return (
    <Screen title="My rentals" footer={<Button title="Rent a bike" icon="bike" onPress={() => navigation.navigate('BikeHome')} />}>
      {!rentals.length && <EmptyState icon="bike" title="No rentals yet" text="Rent a bike by the hour, day or month." action="Rent a bike" onAction={() => navigation.navigate('BikeHome')} />}
      {live.length > 0 && <><Section title="Current" />{live.map(card)}</>}
      {past.length > 0 && <><Section title="Past rentals" />{past.map(card)}</>}
      <Txt v="xs" muted style={{ marginTop: 8 }}>Deposits come back within {BIKE_RULES.DEPOSIT_REFUND_HOURS} hrs of return.</Txt>
    </Screen>
  );
}
