import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import dayjs from 'dayjs';
import { useTheme } from '../../theme/ThemeProvider';
import { Badge, Box, Button, Card, Chip, Counter, EmptyState, Field, PriceRow, Row, Screen, Section, Sheet, Tabs, Txt } from '../../components/ui';
import { CalendarSheet, ConfirmDialog, QrBlock } from '../../components/widgets';
import { Icon, IconName } from '../../components/Icon';
import { useAuth } from '../../store/auth';
import { useRequireLogin } from '../../hooks/useRequireLogin';
import { toast } from '../../utils/toast';
import {
  ADDONS, BIKES, BIKE_RULES, Bike, FILTERS, FUEL_LABELS, Fuel, HUBS, LicenceClass, PLANS, SORTS, SortId, bikeOf, cancelQuote, cleanDl, computeBreakup,
  endOf, freeKmLabel, hubOf, licenceAllows, pickupSlots, planOf, rentPaise, validateAge, validateIdProof, validateLicence, validateOdometer, validateSlot,
} from './bikeRules';
import { COUPONS, kycDone, maskId, useBikeDraft, useBikeStore } from './bikeStore';

export const rs = (paise: number) => '₹' + Math.round(paise / 100).toLocaleString('en-IN');
export const fmtTime = (t: number) => dayjs(t).format('hh:mm A');
export const fmtDay = (t: number) => (dayjs(t).isSame(dayjs(), 'day') ? 'Today' : dayjs(t).isSame(dayjs().add(1, 'day'), 'day') ? 'Tomorrow' : dayjs(t).format('ddd, D MMM'));
export const fmtWhen = (t: number) => `${fmtDay(t)}, ${fmtTime(t)}`;
export const BIKE_STEPS = ['Bike', 'Verify', 'Review', 'Ride'];

/** tinted tile with the bike glyph (no image files needed) */
export function BikeArt({ b, size = 64 }: { b: Bike; size?: number }) {
  return (
    <View style={{ width: size, height: size * 0.78, borderRadius: 12, backgroundColor: b.tint, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={b.type === 'ELECTRIC' ? 'zap' : 'bike'} size={size * 0.52} color={b.accent} />
    </View>
  );
}
export function CheckRow({ on, onPress, label, sub, error }: { on: boolean; onPress: () => void; label: string; sub?: string; error?: string }) {
  const { c } = useTheme();
  return (
    <View>
      <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
        <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: error ? c.danger : on ? c.brand : c.border, backgroundColor: on ? c.brand : c.surface, alignItems: 'center', justifyContent: 'center' }}>
          {on && <Icon name="check" size={12} color="#fff" strokeWidth={3} />}
        </View>
        <View style={{ flex: 1 }}><Txt v="h3" style={{ fontSize: 12.5 }}>{label}</Txt>{!!sub && <Txt v="xs" muted>{sub}</Txt>}</View>
      </Pressable>
      {!!error && <Txt v="xs" color={c.danger}>{error}</Txt>}
    </View>
  );
}
/** slot the user picked, as a timestamp ('' time -> now + 30 min rounded) */
export const draftStart = (date: string, time: string) => dayjs(`${date} ${time}`, 'YYYY-MM-DD HH:mm').valueOf();
function useGuard(ok: boolean, navigation: any) { useEffect(() => { if (!ok) navigation.replace('BikeHome'); }, [ok]); } // eslint-disable-line react-hooks/exhaustive-deps

// ============================================================ B1 · Rent a bike
export function BikeHomeScreen({ navigation }: any) {
  const { c } = useTheme();
  const d = useBikeDraft();
  const live = useBikeStore((s) => s.rentals.filter((r) => r.status !== 'CLOSED' && r.status !== 'CANCELLED').length);
  const [pick, setPick] = useState<'date' | 'time' | 'hub' | null>(null);
  const [tried, setTried] = useState(false);
  const plan = planOf(d.plan);
  const slots = useMemo(() => pickupSlots(d.date), [d.date, pick]); // eslint-disable-line react-hooks/exhaustive-deps

  // default to the first free slot; if today is over, roll to tomorrow
  useEffect(() => {
    if (d.time && slots.includes(d.time)) return;
    if (slots.length) return d.set({ time: slots[0] });
    if (d.date === dayjs().format('YYYY-MM-DD')) d.set({ date: dayjs().add(1, 'day').format('YYYY-MM-DD'), time: '' });
  }, [slots.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const err = d.time ? validateSlot(d.date, d.time) : '';
  const start = d.time ? draftStart(d.date, d.time) : 0;
  const end = start ? endOf({ plan: d.plan, units: d.units, start }) : 0;
  const hub = hubOf(d.hubId);
  const perHr = Math.min(...BIKES.map((b) => b.hourly));
  const go = () => {
    setTried(true);
    const e = validateSlot(d.date, d.time);
    if (e) return toast(e, 'error');
    navigation.navigate('BikeList');
  };
  const choose = (p: typeof PLANS[number]) => d.set({ plan: p.id, units: p.def });

  return (
    <Screen title="" right={<Pressable onPress={() => navigation.navigate('BikeRentals')} accessibilityLabel="My rentals"><Badge text={live ? `My rentals · ${live}` : 'My rentals'} kind="info" /></Pressable>}
      footer={<Button title="Find bikes" icon="search" onPress={go} />}>
      <Txt v="title" color={c.brand}>Bike rental</Txt>
      <Txt v="small" muted>Our own serviced fleet · helmet included</Txt>

      <View style={{ marginTop: 12 }}>
        <Tabs value={d.plan} onChange={(v) => choose(PLANS.find((p) => p.id === v)!)} items={PLANS.map((p) => ({ value: p.id, label: p.label }))} />
      </View>

      <Card>
        <Pressable onPress={() => setPick('hub')} accessibilityLabel="Change hub">
          <Row>
            <Icon name="pin" color={c.brand} />
            <View style={{ flex: 1 }}><Txt v="xs" muted>Pickup hub</Txt><Txt v="h3" numberOfLines={1}>{hub.name} · {hub.area.split(',')[0]}</Txt></View>
            <Txt v="xs" color={c.success} bold>{hub.distKm} km</Txt>
          </Row>
        </Pressable>
        <View style={{ height: 1, backgroundColor: c.border, marginVertical: 10 }} />
        <Row gap={8}>
          <Pressable style={{ flex: 1 }} onPress={() => setPick('date')}>
            <Row gap={6}><Icon name="cal" size={15} color={c.brand} /><View><Txt v="xs" muted>Pickup</Txt><Txt v="h3">{d.date ? fmtDay(dayjs(d.date).valueOf()) : 'Select date'}</Txt></View></Row>
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => (slots.length ? setPick('time') : toast('No slots left on this date. Pick another day', 'error'))}>
            <Row gap={6}><Icon name="clock" size={15} color={c.brand} /><View><Txt v="xs" muted>Time</Txt><Txt v="h3">{d.time ? dayjs(`2000-01-01 ${d.time}`).format('hh:mm A') : 'Select time'}</Txt></View></Row>
          </Pressable>
        </Row>
        <View style={{ height: 1, backgroundColor: c.border, marginVertical: 10 }} />
        <Row>
          <View style={{ flex: 1 }}>
            <Txt v="xs" muted>For how many {plan.units}?</Txt>
            <Txt v="small" muted>{end ? `Return ${fmtWhen(end)}` : 'Pick a time to see the return time'}</Txt>
          </View>
          <Counter value={d.units} min={plan.min} max={plan.max} onChange={(n) => d.set({ units: n })} />
          <Txt v="h3" style={{ minWidth: 54 }}>{d.units === 1 ? plan.unit : plan.units}</Txt>
        </Row>
        {tried && !!err && <Txt v="xs" color={c.danger} style={{ marginTop: 6 }}>{err}</Txt>}
      </Card>
      {d.plan === 'HOURLY' && <View style={{ alignSelf: 'center', backgroundColor: c.dangerBg, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, marginVertical: 4 }}>
        <Txt v="xs" color={c.danger} bold>{d.units} hours · from {rs(perHr)}/hr</Txt></View>}

      <Section title="How do you want the bike?" />
      <Row gap={8}>
        {([['HUB', 'Pick up at hub', 'Free'], ['DOORSTEP', 'Doorstep delivery', `${rs(BIKE_RULES.DOORSTEP_PAISE)} each way`]] as const).map(([v, t, s]) => {
          const on = d.delivery === v;
          return (
            <Pressable key={v} onPress={() => d.set({ delivery: v })} accessibilityState={{ selected: on }}
              style={{ flex: 1, padding: 11, borderRadius: 12, borderWidth: 1.5, borderColor: on ? c.brand : c.border, backgroundColor: on ? c.dangerBg : c.surface }}>
              <Txt v="h3" color={on ? c.brand : c.text}>{t}</Txt><Txt v="xs" color={v === 'HUB' ? c.success : c.muted}>{s}</Txt>
            </Pressable>
          );
        })}
      </Row>
      <Row gap={8} style={{ marginTop: 10 }}>
        {([['shield', 'Helmet included'], ['phone', '24×7 roadside help'], ['wallet', 'Refundable deposit']] as [IconName, string][]).map(([i, t]) => (
          <View key={t} style={{ flex: 1, backgroundColor: c.chip, borderRadius: 12, padding: 10, alignItems: 'center', gap: 4 }}>
            <Icon name={i} size={18} color={c.brand} /><Txt v="xs" center>{t}</Txt>
          </View>
        ))}
      </Row>

      <CalendarSheet visible={pick === 'date'} onClose={() => setPick(null)} value={d.date} minDate={dayjs().format('YYYY-MM-DD')} title="Pickup date"
        onPick={(v: string) => { d.set({ date: v, time: '' }); setPick(null); }} />
      <Sheet visible={pick === 'time'} onClose={() => setPick(null)} title="Pickup time">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {slots.map((t) => <Chip key={t} label={dayjs(`2000-01-01 ${t}`).format('hh:mm A')} on={d.time === t} onPress={() => { d.set({ time: t }); setPick(null); }} />)}
        </View>
        <Txt v="xs" muted style={{ marginTop: 10 }}>Hubs hand over bikes between 10:00 AM and 8:00 PM.</Txt>
      </Sheet>
      <Sheet visible={pick === 'hub'} onClose={() => setPick(null)} title="Pickup hub">
        {HUBS.map((h) => (
          <Card key={h.id} highlight={h.id === d.hubId} onPress={() => { d.set({ hubId: h.id }); setPick(null); }}>
            <Row><Icon name="pin" color={c.brand} /><View style={{ flex: 1 }}><Txt v="h3">{h.name}</Txt><Txt v="xs" muted>{h.area}</Txt></View><Txt v="xs" color={c.success} bold>{h.distKm} km</Txt></Row>
          </Card>
        ))}
      </Sheet>
    </Screen>
  );
}

// ============================================================ B2 · Available bikes
export function BikeListScreen({ navigation }: any) {
  const { c } = useTheme();
  const d = useBikeDraft();
  const [type, setType] = useState<typeof FILTERS[number]['value']>('ALL');
  const [sort, setSort] = useState<SortId>('RECOMMENDED');
  const [sheet, setSheet] = useState(false);
  const ok = !!d.time && !validateSlot(d.date, d.time);
  useGuard(ok, navigation);
  const plan = planOf(d.plan);
  const start = ok ? draftStart(d.date, d.time) : 0;
  const list = useMemo(() => {
    const l = BIKES.filter((b) => type === 'ALL' || b.type === type);
    const p = (b: Bike) => rentPaise(b, d.plan, d.units);
    if (sort === 'PRICE_LOW') l.sort((a, b) => p(a) - p(b));
    if (sort === 'PRICE_HIGH') l.sort((a, b) => p(b) - p(a));
    if (sort === 'RATING') l.sort((a, b) => b.rating - a.rating);
    return l;
  }, [type, sort, d.plan, d.units]);
  const hub = hubOf(d.hubId);
  if (!ok) return null;
  return (
    <Screen title={hub.name} right={<Pressable onPress={() => setSheet(true)} accessibilityLabel="Sort and filter" style={{ padding: 8 }}><Icon name="filter" color={c.text} /></Pressable>}>
      <Txt v="small" muted center style={{ marginTop: -6, marginBottom: 8 }}>{fmtWhen(start)} – {fmtTime(endOf({ plan: d.plan, units: d.units, start }))}</Txt>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>{FILTERS.map((f) => <Chip key={f.value} label={f.label} on={type === f.value} onPress={() => setType(f.value)} />)}</Row>
      <Txt v="small" muted style={{ marginVertical: 8 }}>{list.length} bike{list.length === 1 ? '' : 's'} available · prices include GST and helmet</Txt>
      {!list.length && <EmptyState icon="bike" title="No bikes in this category" text="Try another category." action="Show all" onAction={() => setType('ALL')} />}
      {list.map((b) => (
        <Card key={b.id} onPress={() => navigation.navigate('BikeDetails', { id: b.id })}>
          <Row>
            <BikeArt b={b} />
            <View style={{ flex: 1 }}>
              <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Txt v="h3" style={{ flex: 1 }}>{b.name}</Txt>
                {b.badge ? <Txt v="xs" color={b.badge === 'Last one' ? c.danger : c.blue} bold>{b.badge}</Txt> : <Txt v="xs" color={c.success} bold>{b.stock} left</Txt>}
              </Row>
              <Txt v="xs" muted>{b.cc ? `${b.cc}cc · ` : ''}{b.fuel} · {b.gear}</Txt>
              <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
                <Txt v="h2">{rs(rentPaise(b, d.plan, d.units))} <Txt v="xs" muted>for {d.units} {d.units === 1 ? plan.unit : plan.units}</Txt></Txt>
                <Txt v="xs" muted>{freeKmLabel(b, plan.hours * d.units)}</Txt>
              </Row>
            </View>
          </Row>
        </Card>
      ))}
      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Sort by">
        {SORTS.map((s) => <Card key={s.value} highlight={sort === s.value} onPress={() => { setSort(s.value); setSheet(false); }}><Txt v="h3">{s.label}</Txt></Card>)}
      </Sheet>
    </Screen>
  );
}

// ============================================================ B3 · Bike details
export function BikeDetailsScreen({ navigation, route }: any) {
  const { c } = useTheme();
  const d = useBikeDraft();
  const kyc = useBikeStore((s) => s.kyc);
  const b = bikeOf(route.params?.id);
  const ok = !!d.time && !validateSlot(d.date, d.time);
  useGuard(ok, navigation);
  if (!ok) return null;
  const plan = planOf(d.plan);
  const hours = plan.hours * d.units;
  const br = computeBreakup(b, d.plan, d.units, [], d.delivery);
  const go = () => {
    d.set({ bikeId: b.id });
    if (kycDone(kyc)) {
      if (kyc.learner || !licenceAllows(b, kyc.classes)) return toast(`${b.name} needs ${b.licence === 'MCWG' ? 'MCWG (geared bikes)' : 'a valid two-wheeler'} licence. Your saved licence does not cover it`, 'error');
      return navigation.navigate('BikeReview');
    }
    navigation.navigate('BikeKyc');
  };
  const tile = (v: string, l: string) => <View key={l} style={{ flex: 1, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingVertical: 8, alignItems: 'center' }}><Txt v="h3">{v}</Txt><Txt v="xs" muted>{l}</Txt></View>;
  return (
    <Screen title="" footer={<Row><View><Txt v="h2">{rs(br.rentPaise)}</Txt><Txt v="xs" muted>+ {rs(b.deposit)} deposit</Txt></View><Button title="Rent this bike" style={{ flex: 1 }} onPress={go} /></Row>}>
      <View style={{ backgroundColor: b.tint, borderRadius: 18, alignItems: 'center', justifyContent: 'center', height: 170 }}>
        <Icon name={b.type === 'ELECTRIC' ? 'zap' : 'bike'} size={96} color={b.accent} />
        <View style={{ position: 'absolute', right: 10, bottom: 10, backgroundColor: c.successBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}><Txt v="xs" color={c.success} bold>Serviced {b.servicedDaysAgo} days ago</Txt></View>
      </View>
      <Row style={{ justifyContent: 'space-between', marginTop: 12 }}>
        <Txt v="h1" style={{ flex: 1 }}>{b.name}</Txt>
        <Row gap={4}><Icon name="star" size={14} color={c.warning} fill={c.warning} /><Txt v="h3">{b.rating}</Txt><Txt v="xs" muted>({b.reviews})</Txt></Row>
      </Row>
      <Txt v="small" muted>{b.type === 'ELECTRIC' ? 'Electric scooter' : b.type === 'SCOOTER' ? 'Scooter' : b.type === 'PREMIUM' ? 'Premium bike' : 'Bike'} · {b.model}</Txt>
      <Row gap={8} style={{ marginVertical: 10 }}>{[tile(b.cc ? `${b.cc}cc` : 'Electric', 'Engine'), tile(b.mileage.replace(' range', ''), b.fuel === 'Electric' ? 'Range' : 'Mileage'), tile(b.gear === 'Automatic' ? 'Auto' : 'Manual', 'Gear'), tile(String(b.seats), 'Seats')]}</Row>
      <Card>
        <Txt v="h3" style={{ marginBottom: 6 }}>Charges</Txt>
        <PriceRow label={`Rent · ${d.units} ${d.units === 1 ? plan.unit : plan.units}`} paise={br.rentPaise} />
        <Row style={{ justifyContent: 'space-between', marginVertical: 3 }}><Txt v="small" muted>Free km</Txt><Txt v="small" bold>{b.freeKm10 === null ? 'Unlimited' : `${br.freeKm} km`}</Txt></Row>
        {b.freeKm10 !== null && <Row style={{ justifyContent: 'space-between', marginVertical: 3 }}><Txt v="small" muted>Extra km</Txt><Txt v="small" bold>{rs(b.extraKm)} / km</Txt></Row>}
        <Row style={{ justifyContent: 'space-between', marginVertical: 3 }}><Txt v="small" muted>Late return</Txt><Txt v="small" bold>{rs(BIKE_RULES.LATE_PER_HR_PAISE)} / hr</Txt></Row>
        <View style={{ height: 1, backgroundColor: c.border, marginVertical: 6 }} />
        <Row style={{ justifyContent: 'space-between' }}><Txt v="small" muted>Security deposit</Txt><Txt v="small" bold>{rs(b.deposit)} <Txt v="xs" color={c.success}>refundable</Txt></Txt></Row>
      </Card>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        {['Helmet included', 'Roadside assistance', b.fuel === 'Electric' ? 'Charged at pickup' : 'Fuel not included', `Min age ${BIKE_RULES.MIN_AGE}`].map((t) => <View key={t} style={{ backgroundColor: c.chip, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}><Txt v="xs">{t}</Txt></View>)}
      </Row>
      <View style={{ marginTop: 10 }}>
        <Box kind="warn" icon="passport" text={b.licence === 'MCWG' ? 'Geared bikes need MCWG on your licence. Carry your original driving licence. We verify it once, then you can rent any bike instantly.' : 'Carry your original driving licence. We verify it once, then you can rent any bike instantly.'} />
      </View>
      {hours > 0 && <Txt v="xs" muted style={{ marginTop: 6 }}>{b.fuel === 'Electric' ? 'Return with at least 20% charge to avoid a charging fee.' : `Return with the same fuel level. Each missing 1/4 tank is charged ${rs(BIKE_RULES.FUEL_PER_QUARTER_PAISE)}.`}</Txt>}
    </Screen>
  );
}

// ============================================================ B4 · Licence & KYC
export function BikeKycScreen({ navigation }: any) {
  const { c } = useTheme();
  const user = useAuth((s) => s.user);
  const d = useBikeDraft();
  const kyc = useBikeStore((s) => s.kyc);
  const save = useBikeStore((s) => s.saveKyc);
  const [busy, setBusy] = useState<'' | 'dl' | 'id' | 'selfie'>('');
  const [tried, setTried] = useState(false);
  const b = bikeOf(d.bikeId);
  useGuard(!!d.bikeId, navigation);
  if (!d.bikeId) return null;

  const dlErr = validateLicence(kyc.dl, kyc.classes, kyc.learner);
  const dobErr = validateAge(kyc.dob);
  const idErr = validateIdProof(kyc.idKind, kyc.idValue);
  const wait = (ms = 900) => new Promise((r) => setTimeout(r, ms));
  const toggleClass = (k: LicenceClass) => save({ classes: kyc.classes.includes(k) ? kyc.classes.filter((x) => x !== k) : [...kyc.classes, k], licenceVerifiedAt: undefined });

  const verifyLicence = async () => {
    setTried(true);
    if (dlErr || dobErr) return toast(dlErr || dobErr, 'error');
    if (!licenceAllows(b, kyc.classes)) return toast(`${b.name} needs ${b.licence === 'MCWG' ? 'MCWG on your licence' : 'a two-wheeler licence (MCWOG or MCWG)'}`, 'error');
    setBusy('dl');
    try { await wait(); save({ licenceVerifiedAt: Date.now(), licenceValidTill: dayjs().add(10, 'year').format('YYYY') }); toast('Licence verified', 'success'); } finally { setBusy(''); }
  };
  const verifyId = async (via: 'DIGILOCKER' | 'PHOTO') => {
    setTried(true);
    if (idErr) return toast(idErr, 'error');
    setBusy('id');
    try { await wait(); save({ idVia: via, idVerifiedAt: Date.now() }); toast(via === 'DIGILOCKER' ? 'Fetched from DigiLocker' : 'Photo received · matched', 'success'); } finally { setBusy(''); }
  };
  const selfie = async () => {
    setBusy('selfie');
    try { await wait(1000); save({ selfieAt: Date.now() }); toast('Selfie matched with your licence photo', 'success'); } finally { setBusy(''); }
  };
  const next = () => {
    setTried(true);
    if (!kyc.licenceVerifiedAt) return toast('Verify your driving licence first', 'error');
    if (!kyc.idVerifiedAt) return toast('Verify your Aadhaar or passport', 'error');
    if (!kyc.selfieAt) return toast('Take a live selfie to finish', 'error');
    navigation.navigate('BikeReview');
  };
  const seg = (on: boolean) => <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: on ? c.brand : c.border }} />;
  return (
    <Screen title="Verify to ride" footer={<Button title="Verify & continue" onPress={next} />}>
      <Row gap={6}>{seg(true)}{seg(!!kyc.licenceVerifiedAt)}{seg(!!kyc.idVerifiedAt)}</Row>
      <Row gap={6} style={{ marginTop: 4 }}><Txt v="xs" style={{ flex: 1 }} center bold>Licence</Txt><Txt v="xs" style={{ flex: 1 }} center bold>ID proof</Txt><Txt v="xs" style={{ flex: 1 }} center bold>Selfie</Txt></Row>
      <Txt v="small" muted style={{ marginVertical: 10 }}>One-time check. Your documents are encrypted and only used to verify you.</Txt>

      <Card highlight={!kyc.licenceVerifiedAt}>
        <Row>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: kyc.licenceVerifiedAt ? c.successBg : c.dangerBg, alignItems: 'center', justifyContent: 'center' }}><Icon name={kyc.licenceVerifiedAt ? 'check' : 'card'} color={kyc.licenceVerifiedAt ? c.success : c.brand} /></View>
          <View style={{ flex: 1 }}><Txt v="h3">Driving licence</Txt>{!!kyc.licenceVerifiedAt && <Txt v="xs" muted>{kyc.dl} · {kyc.classes.join(', ')}</Txt>}</View>
          {!!kyc.licenceVerifiedAt && <Badge text="Verified" kind="success" />}
        </Row>
        {kyc.licenceVerifiedAt ? (
          <View style={{ backgroundColor: c.infoBg, borderRadius: 8, padding: 8, marginTop: 8 }}><Txt v="xs" color={c.info}>Checked with the government licence records (Parivahan) · valid till {kyc.licenceValidTill}</Txt></View>
        ) : (
          <View style={{ marginTop: 8 }}>
            <Field label="Licence number · e.g. MH12 2019 0045123" value={kyc.dl} autoCapitalize="characters" autoCorrect={false} maxLength={20} onChangeText={(t) => save({ dl: cleanDl(t) })}
              error={tried && kyc.dl ? (dlErr.includes('valid licence number') ? dlErr : undefined) : tried && !kyc.dl ? dlErr : undefined} />
            <Field label="Date of birth · YYYY-MM-DD" value={kyc.dob} keyboardType="numbers-and-punctuation" maxLength={10} onChangeText={(t) => save({ dob: t.replace(/[^0-9-]/g, '') })} error={tried ? dobErr || undefined : undefined} />
            <Txt v="xs" muted style={{ marginBottom: 4 }}>Vehicle class on your licence</Txt>
            <Row gap={6} style={{ flexWrap: 'wrap' }}>{(['MCWOG', 'MCWG', 'LMV'] as LicenceClass[]).map((k) => <Chip key={k} label={k} on={kyc.classes.includes(k)} onPress={() => toggleClass(k)} />)}</Row>
            <CheckRow on={kyc.learner} onPress={() => save({ learner: !kyc.learner })} label="This is a learner licence" error={kyc.learner ? 'Learner licences are not accepted' : undefined} />
            <Button small title="Verify licence" loading={busy === 'dl'} onPress={verifyLicence} style={{ marginTop: 6 }} />
          </View>
        )}
      </Card>

      <Card highlight={!!kyc.licenceVerifiedAt && !kyc.idVerifiedAt}>
        <Row>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: kyc.idVerifiedAt ? c.successBg : c.dangerBg, alignItems: 'center', justifyContent: 'center' }}><Icon name={kyc.idVerifiedAt ? 'check' : 'passport'} color={kyc.idVerifiedAt ? c.success : c.brand} /></View>
          <View style={{ flex: 1 }}><Txt v="h3">Aadhaar or passport</Txt><Txt v="xs" muted>{kyc.idVerifiedAt ? `${maskId(kyc)} · via ${kyc.idVia === 'DIGILOCKER' ? 'DigiLocker' : 'photo'}` : `Name must match${user?.name ? ` · ${user.name}` : ' your licence'}`}</Txt></View>
          {!!kyc.idVerifiedAt && <Badge text="Verified" kind="success" />}
        </Row>
        {!kyc.idVerifiedAt && !!kyc.licenceVerifiedAt && (
          <View style={{ marginTop: 8 }}>
            <Row gap={6} style={{ marginBottom: 6 }}>{(['AADHAAR', 'PASSPORT'] as const).map((k) => <Chip key={k} label={k === 'AADHAAR' ? 'Aadhaar' : 'Passport'} on={kyc.idKind === k} onPress={() => save({ idKind: k, idValue: '' })} />)}</Row>
            <Field label={kyc.idKind === 'AADHAAR' ? '12-digit Aadhaar number' : 'Passport number'} value={kyc.idValue} autoCapitalize="characters" autoCorrect={false} keyboardType={kyc.idKind === 'AADHAAR' ? 'number-pad' : 'default'}
              maxLength={kyc.idKind === 'AADHAAR' ? 12 : 9} onChangeText={(t) => save({ idValue: kyc.idKind === 'AADHAAR' ? t.replace(/\D/g, '') : t.replace(/[^A-Za-z0-9]/g, '').toUpperCase() })} error={tried ? idErr || undefined : undefined} />
            <Button title="Fetch from DigiLocker" loading={busy === 'id'} onPress={() => verifyId('DIGILOCKER')} />
            <Button title="Upload photo instead" variant="outline" icon="download" onPress={() => verifyId('PHOTO')} style={{ marginTop: 8 }} />
          </View>
        )}
        {!kyc.idVerifiedAt && !kyc.licenceVerifiedAt && <Txt v="xs" muted style={{ marginTop: 6 }}>Verify your licence first.</Txt>}
      </Card>

      <Card>
        <Row>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: kyc.selfieAt ? c.successBg : c.chip, alignItems: 'center', justifyContent: 'center' }}><Icon name={kyc.selfieAt ? 'check' : 'user'} color={kyc.selfieAt ? c.success : c.muted} /></View>
          <View style={{ flex: 1 }}><Txt v="h3">Live selfie</Txt><Txt v="xs" muted>Matched with your licence photo</Txt></View>
          {kyc.selfieAt ? <Badge text="Done" kind="success" /> : kyc.idVerifiedAt ? <Button small title="Take selfie" loading={busy === 'selfie'} onPress={selfie} /> : <Txt v="xs" muted>Next</Txt>}
        </Row>
      </Card>

      <Box kind="error" icon="alert" text="Royal Enfield and other geared bikes need MCWG on your licence. Learner licences are not accepted." />
      {kycDone(kyc) && <Txt v="small" color={c.brand} bold style={{ marginTop: 10 }} onPress={() => { useBikeStore.getState().resetKyc(); }}>Use a different licence</Txt>}
    </Screen>
  );
}

// ============================================================ B5 · Review & pay
export function BikeReviewScreen({ navigation }: any) {
  const { c } = useTheme();
  const d = useBikeDraft();
  const create = useBikeStore((s) => s.create);
  const firstDone = useBikeStore((s) => s.firstDone);
  const kyc = useBikeStore((s) => s.kyc);
  const requireLogin = useRequireLogin();
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const [couponIn, setCouponIn] = useState('');
  const [couponErr, setCouponErr] = useState('');
  const b = bikeOf(d.bikeId);
  const ok = !!d.bikeId && !!d.time && !validateSlot(d.date, d.time) && kycDone(kyc);
  useGuard(ok, navigation);
  if (!ok) return null;
  const plan = planOf(d.plan);
  const start = draftStart(d.date, d.time);
  const end = endOf({ plan: d.plan, units: d.units, start });
  const br = computeBreakup(b, d.plan, d.units, d.addons, d.delivery);
  const cp = d.coupon ? COUPONS[d.coupon] : undefined;
  const couponPaise = cp ? Math.min(cp.maxPaise, Math.round((br.rentPaise * cp.percent) / 100)) : 0;
  const total = br.payNowPaise - couponPaise;
  const toggle = (id: string) => d.set({ addons: d.addons.includes(id) ? d.addons.filter((x) => x !== id) : [...d.addons, id] });
  const applyIt = () => {
    const code = couponIn.trim().toUpperCase();
    if (!code) return setCouponErr('Enter a coupon code');
    if (!COUPONS[code]) return setCouponErr('This coupon is not valid');
    if (code === 'FIRSTRIDE' && firstDone) return setCouponErr('FIRSTRIDE is only for your first rental');
    d.set({ coupon: code }); setCouponIn(''); setCouponErr('');
  };
  const pay = () => {
    setTried(true);
    if (!d.agree) return toast('Please agree to the rental terms', 'error');
    const e = validateSlot(d.date, d.time); if (e) return toast(e, 'error');
    requireLogin(async () => {
      setBusy(true);
      try {
        await new Promise((r) => setTimeout(r, 700)); // payment gateway (mock, same as parcel)
        const r = create({ bikeId: b.id, hubId: d.hubId, delivery: d.delivery, plan: d.plan, units: d.units, startAt: start, addons: d.addons, coupon: d.coupon || undefined });
        d.reset();
        navigation.reset({ index: 1, routes: [{ name: 'Main' }, { name: 'BikeBooked', params: { id: r.id } }] });
      } catch (e: any) { toast(e?.message ?? 'Payment failed. Try again', 'error'); } finally { setBusy(false); }
    });
  };
  return (
    <Screen title="Review rental" footer={<Button title={`Pay ${rs(total)}`} loading={busy} onPress={pay} />}>
      <Card>
        <Row><BikeArt b={b} size={52} /><View style={{ flex: 1 }}><Txt v="h3">{b.name}</Txt><Txt v="xs" muted>{hubOf(d.hubId).name} · {d.delivery === 'HUB' ? 'self pickup' : 'doorstep delivery'}</Txt><Txt v="xs" muted>{fmtWhen(start)} → {fmtTime(end)}{dayjs(end).isSame(dayjs(start), 'day') ? '' : `, ${dayjs(end).format('D MMM')}`}</Txt></View></Row>
      </Card>
      <Section title="Add-ons" />
      <Card>
        {ADDONS.map((a, i) => (
          <View key={a.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>
            <CheckRow on={d.addons.includes(a.id)} onPress={() => toggle(a.id)} label={`${a.title} +${rs(a.paise)}`} sub={a.sub} />
          </View>
        ))}
      </Card>
      <Card>
        <PriceRow label={`Rent · ${d.units} ${d.units === 1 ? plan.unit : plan.units}`} paise={br.rentPaise} />
        {br.addonsPaise > 0 && <PriceRow label="Add-ons" paise={br.addonsPaise} />}
        {br.deliveryPaise > 0 && <PriceRow label="Doorstep delivery · both ways" paise={br.deliveryPaise} />}
        {couponPaise > 0 && <PriceRow label={`Coupon ${d.coupon}`} paise={couponPaise} minus />}
        <PriceRow label="Refundable deposit" paise={br.depositPaise} />
        <PriceRow label="Pay now incl. GST" paise={total} total />
        <Txt v="xs" color={c.success} style={{ marginTop: 4 }}>{rs(br.depositPaise)} deposit comes back within {BIKE_RULES.DEPOSIT_REFUND_HOURS} hrs of return</Txt>
      </Card>
      {d.coupon ? (
        <Row style={{ justifyContent: 'space-between', marginVertical: 6 }}><Badge kind="success" text={`${d.coupon} applied`} /><Txt v="small" color={c.brand} onPress={() => d.set({ coupon: '' })}>Remove</Txt></Row>
      ) : (
        <Row gap={8} style={{ alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}><Field label="Coupon code" value={couponIn} autoCapitalize="characters" autoCorrect={false} maxLength={30} onChangeText={(t) => { setCouponIn(t.replace(/[^A-Za-z0-9_-]/g, '').toUpperCase()); setCouponErr(''); }} error={couponErr} /></View>
          <Button small title="Apply" onPress={applyIt} style={{ marginTop: 14 }} />
        </Row>
      )}
      <CheckRow on={d.agree} onPress={() => d.set({ agree: !d.agree })} label="I agree to the rental terms: wear a helmet, no racing, return with the same fuel level." error={tried && !d.agree ? 'Please accept the terms to continue' : undefined} />
    </Screen>
  );
}

// ============================================================ B6 · Booking confirmed
export function BikeBookedScreen({ navigation, route }: any) {
  const { c } = useTheme();
  const r = useBikeStore((s) => s.rentals.find((x) => x.id === route.params?.id));
  const startPickup = useBikeStore((s) => s.startPickup);
  const cancel = useBikeStore((s) => s.cancel);
  const [confirm, setConfirm] = useState(false);
  if (!r) return <Screen title="Rental"><EmptyState icon="bike" title="Rental not found" action="My rentals" onAction={() => navigation.replace('BikeRentals')} /></Screen>;
  const b = bikeOf(r.bikeId), hub = hubOf(r.hubId);
  const q = cancelQuote(r.startAt, r.paidPaise, r.depositPaise);
  const cancelled = r.status === 'CANCELLED';
  const go = () => {
    if (Date.now() < r.startAt - 30 * 60000) return toast(`Pickup opens 30 minutes before ${fmtTime(r.startAt)}`, 'error');
    startPickup(r.id); navigation.replace('BikePickup', { id: r.id });
  };
  const row = (l: string, v: string) => <Row key={l} style={{ justifyContent: 'space-between', marginVertical: 3 }}><Txt v="small" muted>{l}</Txt><Txt v="small" bold>{v}</Txt></Row>;
  return (
    <Screen title="Booking" onBack={() => navigation.navigate('Main')} footer={cancelled ? <Button title="Rent another bike" onPress={() => navigation.navigate('BikeHome')} /> : <Button title={r.delivery === 'DOORSTEP' ? 'Bike has arrived · start pickup' : 'I am at the hub · start pickup'} onPress={go} />}>
      <View style={{ alignItems: 'center', marginTop: 6 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: cancelled ? c.dangerBg : c.successBg, alignItems: 'center', justifyContent: 'center' }}><Icon name={cancelled ? 'x' : 'check'} size={32} color={cancelled ? c.danger : c.success} /></View>
        <Txt v="h1" style={{ marginTop: 8 }}>{cancelled ? 'Booking cancelled' : `Your ${b.name} is reserved`}</Txt>
        <Txt v="small" muted>Booking {r.id} · {cancelled ? `refunded ${rs(r.refundPaise ?? 0)}` : `paid ${rs(r.paidPaise)}`}</Txt>
      </View>
      {!cancelled && (
        <Card style={{ marginTop: 12 }}>
          <Txt v="h3" center>{r.delivery === 'DOORSTEP' ? 'Show this to our rider' : 'Show this at the hub'}</Txt>
          <Txt v="xs" muted center style={{ marginBottom: 8 }}>Staff scan it, check your licence and hand over the keys.</Txt>
          <QrBlock value={`ZPROOGO-BIKE:${r.id}:${r.bikeId}:${r.startAt}`} size={130} />
        </Card>
      )}
      <Card>
        {row('Pickup', fmtWhen(r.startAt))}{row('Return', fmtWhen(r.endAt))}{row('Hub', `${hub.name.replace(' hub', '')} · ${hub.area.split(',')[0]}`)}{row('Bike', `${b.name} · ${b.plate}`)}
      </Card>
      {!cancelled && <>
        <Row gap={8}>
          <Button variant="outline" icon="navi" title="Directions" style={{ flex: 1 }} onPress={() => Linking.openURL(`geo:${hub.lat},${hub.lng}?q=${hub.lat},${hub.lng}(${encodeURIComponent(hub.name)})`).catch(() => toast('No maps app found', 'error'))} />
          <Button variant="outline" icon="phone" title="Call hub" style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${hub.phone}`).catch(() => toast('Could not open the dialler', 'error'))} />
        </Row>
        <View style={{ marginTop: 10 }}>
          <Box icon="info" text={q.free ? `Free cancellation until ${fmtTime(q.freeUntil)}${dayjs(q.freeUntil).isSame(dayjs(), 'day') ? '' : ', ' + dayjs(q.freeUntil).format('D MMM')}. After that ${rs(BIKE_RULES.CANCEL_FEE_PAISE)} is kept and the rest is refunded.` : `Free cancellation has ended. ${rs(BIKE_RULES.CANCEL_FEE_PAISE)} is kept and the rest is refunded.`} />
        </View>
        <Txt v="small" color={c.danger} bold center style={{ marginTop: 12 }} onPress={() => setConfirm(true)}>Cancel booking</Txt>
      </>}
      <ConfirmDialog visible={confirm} danger title="Cancel this booking?" icon="alert" confirm="Yes, cancel" cancel="Keep booking" onCancel={() => setConfirm(false)}
        text={q.free ? `You will get ${rs(q.refundPaise)} back to your original payment method.` : `${rs(q.feePaise)} will be kept. You will get ${rs(q.refundPaise)} back.`}
        onConfirm={() => { cancel(r.id); setConfirm(false); toast('Booking cancelled', 'success'); }} />
    </Screen>
  );
}

// ============================================================ B7 · Pickup checklist
export function BikePickupScreen({ navigation, route }: any) {
  const { c } = useTheme();
  const r = useBikeStore((s) => s.rentals.find((x) => x.id === route.params?.id));
  const patch = useBikeStore((s) => s.patch);
  const startRide = useBikeStore((s) => s.startRide);
  const [odo, setOdo] = useState('');
  const [fuel, setFuel] = useState<Fuel>(4);
  const [tried, setTried] = useState(false);
  if (!r) return <Screen title="Pickup check"><EmptyState icon="bike" title="Rental not found" /></Screen>;
  const b = bikeOf(r.bikeId);
  const ev = b.fuel === 'Electric';
  const photoKeys = [['front', 'Front'], ['back', 'Back'], ['left', 'Left'], ['right', 'Right']] as const;
  const taken = photoKeys.filter(([k]) => r.photos[k]).length;
  const oErr = validateOdometer(odo);
  const checks: [keyof typeof r.checks, string][] = [['helmet', 'Helmet received, strap works'], ['brakes', 'Brakes, horn and lights checked'], ['papers', ev ? 'RC and insurance in the storage box' : 'RC, insurance and PUC in the dickey']];
  const go = () => {
    setTried(true);
    if (taken < BIKE_RULES.PHOTOS_REQUIRED) return toast(`Take all ${BIKE_RULES.PHOTOS_REQUIRED} photos of the bike`, 'error');
    if (oErr) return toast(oErr, 'error');
    if (!Object.values(r.checks).every(Boolean)) return toast('Tick every item in the pre-ride checklist', 'error');
    startRide(r.id, Number(odo), ev ? 4 : fuel);
    navigation.replace('BikeRide', { id: r.id });
  };
  return (
    <Screen title="Pickup check" onBack={() => navigation.navigate('Main')} footer={<Button title="Get keys · start ride" icon="lock" onPress={go} />}>
      <Txt v="small" muted center style={{ marginTop: -6, marginBottom: 6 }}>{b.name.replace('Honda ', '')} · {b.plate}</Txt>
      <Txt v="h3">1. Photos of the bike</Txt><Txt v="xs" muted style={{ marginBottom: 6 }}>Protects you from false damage claims · {taken}/{BIKE_RULES.PHOTOS_REQUIRED}</Txt>
      <Row gap={8}>
        {photoKeys.map(([k, l]) => {
          const on = r.photos[k];
          return (
            <Pressable key={k} accessibilityLabel={`${l} photo`} onPress={() => patch(r.id, { photos: { ...r.photos, [k]: !on } })}
              style={{ flex: 1, height: 64, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? '#0B1F3A' : c.surface, borderWidth: 1.5, borderStyle: on ? 'solid' : 'dashed', borderColor: on ? '#0B1F3A' : tried ? c.danger : c.iceAccent }}>
              <Icon name={on ? 'check' : 'download'} size={16} color={on ? '#fff' : c.brand} /><Txt v="xs" color={on ? '#fff' : c.brand}>{l}</Txt>
            </Pressable>
          );
        })}
      </Row>
      <Txt v="h3" style={{ marginTop: 16, marginBottom: 6 }}>2. Readings</Txt>
      <Field label="Odometer (km)" value={odo} keyboardType="number-pad" maxLength={7} onChangeText={(t) => setOdo(t.replace(/\D/g, ''))} error={tried ? oErr || undefined : undefined} />
      {!ev ? (
        <>
          <Txt v="xs" muted style={{ marginBottom: 4 }}>Fuel at start</Txt>
          <Row gap={6} style={{ backgroundColor: c.chip, borderRadius: 12, padding: 4 }}>
            {FUEL_LABELS.map((l, i) => (
              <Pressable key={l} onPress={() => setFuel(i as Fuel)} style={{ flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center', backgroundColor: fuel === i ? c.brand : 'transparent' }}>
                <Txt v="xs" color={fuel === i ? '#fff' : c.text} bold={fuel === i}>{l}</Txt>
              </Pressable>
            ))}
          </Row>
        </>
      ) : <Box icon="zap" text="Electric: charge level is read from the bike at handover." />}
      <Txt v="h3" style={{ marginTop: 16 }}>3. Before you ride</Txt>
      <Card>
        {checks.map(([k, l], i) => (
          <View key={k} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>
            <CheckRow on={r.checks[k]} label={l} onPress={() => patch(r.id, { checks: { ...r.checks, [k]: !r.checks[k] } })} error={tried && !r.checks[k] ? 'Required' : undefined} />
          </View>
        ))}
      </Card>
      <Txt v="xs" muted>Photos here are marked as taken for your record; the hub staff photographs the bike at the same time.</Txt>
    </Screen>
  );
}
