import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTheme } from '../../theme/ThemeProvider';
import { Badge, Box, Button, Card, ChipGroup, Field, HoldTimer, Loading, Price, Row, Screen, Section, Stepper, Toggle, Txt } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { Api } from '../../api/endpoints';
import { useBooking } from '../../store/booking';
import { useAuth } from '../../store/auth';
import { useSecureScreen } from '../../security/useSecureScreen';
import { rupees, toE164 } from '../../utils/format';
import { LIMITS, cleanAlnumUpper, cleanDateInput, cleanEmail, cleanMobile, cleanName, collapseSpaces, findDuplicates, validateDob, validateEmail, validateMobile, validateName, validateNationality, validatePassportExpiry, validatePassportNo } from '../../utils/validation';

type T = { type: 'ADULT' | 'CHILD' | 'INFANT'; title: string; firstName: string; lastName: string; dob: string; gender: string; email: string;
  passportNo: string; passportExpiry: string; nationality: string };

/** Screen 54 - traveller details exactly as on ID, with email (whiteboard 19); passport fields for international trips. */
export function FlightTravellersScreen({ navigation }: any) {
  useSecureScreen();
  const { hold, extras, setDetails } = useBooking();
  const user = useAuth((s) => s.user);
  const intl = !!extras.international;
  const p = hold?.summary;
  const [list, setList] = useState<T[]>(() => {
    const q = extras.paxCounts ?? { adults: 1, children: 0, infants: 0 };
    const mk = (type: T['type']): T => ({ type, title: type === 'ADULT' ? 'Mr' : 'Mstr', firstName: '', lastName: '', dob: '', gender: 'M', email: '', passportNo: '', passportExpiry: '', nationality: 'IN' });
    return [...Array(q.adults).fill(0).map(() => mk('ADULT')), ...Array(q.children).fill(0).map(() => mk('CHILD')), ...Array(q.infants).fill(0).map(() => mk('INFANT'))];
  });
  const [mobile, setMobile] = useState((user?.mobile ?? '').replace('+91', ''));
  const [email, setEmail] = useState(user?.email ?? '');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const upd = (i: number, x: Partial<T>) => setList(list.map((t, k) => (k === i ? { ...t, ...x } : t)));
  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }));
  const travel = p?.departAt as string | undefined;

  const all: Record<string, string> = {};
  const dup = findDuplicates(list.map((t) => `${t.firstName}|${t.lastName}|${t.dob}`));
  list.forEach((t, i) => {
    const f = validateName(t.firstName, { label: 'First name', max: LIMITS.FIRST_NAME_MAX }); if (f) all['f' + i] = f;
    const l = validateName(t.lastName, { label: 'Last name', max: LIMITS.LAST_NAME_MAX, min: 1 }); if (l) all['l' + i] = l;
    const d = validateDob(t.dob, t.type, travel) || dup[i]; if (d) all['d' + i] = d;
    if (i === 0 && t.email) { const e = validateEmail(t.email); if (e) all['e' + i] = e; }
    if (intl) {
      const pn = validatePassportNo(t.passportNo); if (pn) all['p' + i] = pn;
      const px = validatePassportExpiry(t.passportExpiry, travel); if (px) all['x' + i] = px;
      const nt = validateNationality(t.nationality); if (nt) all['t' + i] = nt;
    }
  });
  const vm = validateMobile(mobile); if (vm) all.mobile = vm;
  const ve = validateEmail(email); if (ve) all.email = ve;
  const errors: Record<string, string> = {};
  Object.keys(all).forEach((k) => { if (submitted || touched[k]) errors[k] = all[k]; });

  const next = () => {
    setSubmitted(true); setErr(null);
    if (Object.keys(all).length) return setErr('Please correct the highlighted details');
    setDetails({
      pax: list.map((t) => ({ type: t.type, title: t.title, firstName: collapseSpaces(t.firstName), lastName: collapseSpaces(t.lastName), dob: t.dob, gender: t.gender,
        email: t.email.trim() || undefined, ...(intl ? { passportNo: t.passportNo.toUpperCase(), passportExpiry: t.passportExpiry, nationality: t.nationality } : {}) })),
      contact: { mobile: toE164(mobile), email: email.trim() },
    });
    navigation.navigate('FlightSeats');
  };

  return (
    <Screen title="Traveller details" footer={<Button title="Continue" onPress={next} />}>
      <Stepper step={1} />
      <HoldTimer expiresAt={hold?.expiresAt} label="Fare valid for" />
      <Card><Txt v="h3">{p?.title} · {p?.airline} {p?.flightNo}</Txt><Txt v="xs" muted>{p?.fareName} · {dayjs(p?.departAt).format('ddd, D MMM HH:mm')}</Txt></Card>
      <Box kind="warn" text="Enter names exactly as on the government ID / passport. Name mismatch can stop boarding." />
      {list.map((t, i) => (
        <View key={i}>
          <Section title={`${t.type === 'ADULT' ? 'Adult' : t.type === 'CHILD' ? 'Child' : 'Infant'} ${i + 1}`} />
          <ChipGroup value={t.title} onChange={(v) => upd(i, { title: v, gender: ['Ms', 'Mrs', 'Miss'].includes(v) ? 'F' : 'M' })}
            options={(t.type === 'ADULT' ? ['Mr', 'Ms', 'Mrs'] : ['Mstr', 'Miss']).map((x) => ({ value: x, label: x }))} />
          <Row><View style={{ flex: 1 }}><Field label="First name" value={t.firstName} onChangeText={(v) => upd(i, { firstName: cleanName(v, LIMITS.FIRST_NAME_MAX) })} onBlur={() => touch('f' + i)} error={errors['f' + i]} autoCapitalize="words" autoCorrect={false} maxLength={LIMITS.FIRST_NAME_MAX} /></View>
            <View style={{ flex: 1 }}><Field label="Last name" value={t.lastName} onChangeText={(v) => upd(i, { lastName: cleanName(v, LIMITS.LAST_NAME_MAX) })} onBlur={() => touch('l' + i)} error={errors['l' + i]} autoCapitalize="words" autoCorrect={false} maxLength={LIMITS.LAST_NAME_MAX} /></View></Row>
          <Field label="Date of birth (YYYY-MM-DD)" value={t.dob} onChangeText={(v) => upd(i, { dob: cleanDateInput(v) })} onBlur={() => touch('d' + i)} error={errors['d' + i]} keyboardType="number-pad" placeholder="YYYY-MM-DD" maxLength={10} />
          {i === 0 && <Field label="Email id (optional)" value={t.email} onChangeText={(v) => upd(i, { email: cleanEmail(v) })} onBlur={() => touch('e' + i)} error={errors['e' + i]} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={LIMITS.EMAIL_MAX} />}
          {intl && <>
            <Field label="Passport number" value={t.passportNo} onChangeText={(v) => upd(i, { passportNo: cleanAlnumUpper(v, LIMITS.PASSPORT_MAX) })} onBlur={() => touch('p' + i)} error={errors['p' + i]} autoCapitalize="characters" autoCorrect={false} maxLength={LIMITS.PASSPORT_MAX} />
            <Row><View style={{ flex: 1 }}><Field label="Passport expiry (YYYY-MM-DD)" value={t.passportExpiry} onChangeText={(v) => upd(i, { passportExpiry: cleanDateInput(v) })} onBlur={() => touch('x' + i)} error={errors['x' + i]} keyboardType="number-pad" placeholder="YYYY-MM-DD" maxLength={10} /></View>
              <View style={{ width: 110 }}><Field label="Nationality" value={t.nationality} onChangeText={(v) => upd(i, { nationality: v.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 2) })} onBlur={() => touch('t' + i)} error={errors['t' + i]} autoCapitalize="characters" autoCorrect={false} maxLength={2} /></View></Row>
          </>}
        </View>
      ))}
      <Section title="Contact for airline alerts" />
      <Field label="Mobile" value={mobile} onChangeText={(v) => setMobile(cleanMobile(v))} onBlur={() => touch('mobile')} error={errors.mobile} keyboardType="number-pad" maxLength={LIMITS.MOBILE_LEN} />
      <Field label="Email" value={email} onChangeText={(v) => setEmail(cleanEmail(v))} onBlur={() => touch('email')} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={LIMITS.EMAIL_MAX} />
      {err && <Box kind="error" text={err} />}
    </Screen>
  );
}

/** Screen 56 (now BEFORE add-ons, whiteboard 20) - cabin seat map, one seat per traveller, skippable. */
export function FlightSeatsScreen({ navigation }: any) {
  const { c } = useTheme();
  const { pax, setDetails } = useBooking();
  const fareKey = useBooking((st) => st.extras.fareKey);
  const q = useQuery({ queryKey: ['seatmap', fareKey], queryFn: () => Api.seatMap(fareKey!), enabled: !!fareKey });
  const need = pax.filter((p) => p.type !== 'INFANT').length;
  const [sel, setSel] = useState<string[]>([]);
  const total = sel.reduce((a, id) => a + (q.data?.seats.find((s) => s.id === id)?.pricePaise ?? 0), 0);
  const done = (skip?: boolean) => {
    let i = 0;
    setDetails({ pax: pax.map((p) => (p.type !== 'INFANT' && !skip && sel[i] ? { ...p, seatId: sel[i++] } : { ...p, seatId: undefined })), extras: { flightSeatIds: skip ? [] : sel } });
    navigation.navigate('FlightAddons');
  };
  const rows = useMemo(() => Array.from({ length: 30 }, (_, r) => (q.data?.seats ?? []).filter((s) => s.row === r + 1)), [q.data]);
  return (
    <Screen title="Select seats" right={<Txt v="small" color={c.brand} onPress={() => done(true)}>Skip</Txt>} footer={
      <Row><View style={{ flex: 1 }}><Txt v="small" muted>{sel.length}/{need} seat(s)</Txt><Price paise={total} size={17} /></View>
        <Button style={{ flex: 1 }} title="Continue" onPress={() => done()} /></Row>}>
      <Row gap={12} style={{ marginBottom: 8 }}>{[['Free', c.surface, c.border], ['Selected', c.brand, c.brand], ['Taken', c.chip, c.border], ['Exit row', c.surface, c.warning]].map(([l, bg, bd]) => (
        <Row key={l} gap={4}><View style={{ width: 13, height: 13, borderRadius: 3, backgroundColor: bg, borderWidth: 2, borderColor: bd }} /><Txt v="xs" muted>{l}</Txt></Row>))}</Row>
      {!fareKey ? <Box text="Seat map unavailable for this fare." /> : q.isLoading ? <Loading /> : (
        <Card style={{ borderTopLeftRadius: 60, borderTopRightRadius: 60, paddingTop: 26 }}>
          <Txt v="xs" muted center>FRONT</Txt>
          {rows.map((r, i) => (
            <Row key={i} gap={6} style={{ justifyContent: 'center', marginVertical: 3 }}>
              {r.map((s, k) => {
                const on = sel.includes(s.id);
                return (
                  <React.Fragment key={s.id}>
                    {k === 3 && <Txt v="xs" muted style={{ width: 18, textAlign: 'center' }}>{s.row}</Txt>}
                    <Pressable disabled={s.status !== 'AVAILABLE'} accessibilityLabel={`Seat ${s.id} ${rupees(s.pricePaise)}`}
                      onPress={() => setSel(on ? sel.filter((x) => x !== s.id) : sel.length < need ? [...sel, s.id] : [...sel.slice(1), s.id])}
                      style={{ width: 34, height: 34, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center',
                        backgroundColor: on ? c.brand : s.status === 'AVAILABLE' ? c.surface : c.chip, borderColor: on ? c.brand : s.exit ? c.warning : c.border }}>
                      <Txt v="xs" color={on ? '#fff' : c.muted} style={{ fontSize: 8 }}>{s.col}</Txt>
                    </Pressable>
                  </React.Fragment>
                );
              })}
            </Row>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const ADDONS = [
  { code: 'MEAL', icon: 'food' as const, title: 'Meal', sub: 'Veg / non-veg combo · ₹499 per traveller' },
  { code: 'BAGGAGE_15', icon: 'bag' as const, title: 'Extra baggage', sub: '+15 kg · ₹1,200 per traveller' },
  { code: 'INSURANCE', icon: 'shield' as const, title: 'Travel insurance', sub: 'Trip + medical · ₹199 per traveller' },
];

/** Screen 55 - add-ons, skippable (whiteboard 21). */
export function FlightAddonsScreen({ navigation }: any) {
  const { addOns, extras, setDetails } = useBooking();
  const [sel, setSel] = useState<string[]>(addOns.filter((a) => !a.startsWith('SCHENGEN')));
  const next = (skip?: boolean) => {
    setDetails({ addOns: skip ? [] : sel });
    navigation.navigate(extras.international ? 'IntlChecks' : 'Checkout');
  };
  return (
    <Screen title="Add-ons" right={<Txt v="small" color="#D90404" onPress={() => next(true)}>Skip</Txt>} footer={<Button title="Continue" onPress={() => next()} />}>
      <Stepper step={1} />
      {ADDONS.map((a) => <Toggle key={a.code} icon={a.icon} label={a.title} sub={a.sub} value={sel.includes(a.code)} onChange={(v) => setSel(v ? [...sel, a.code] : sel.filter((x) => x !== a.code))} />)}
      <Box text="All add-ons are optional. You can skip this step." />
    </Screen>
  );
}

/** Screens 60-66 - international checks before payment: passport validity, visa, transit, insurance, declaration. */
export function IntlChecksScreen({ navigation }: any) {
  const { c } = useTheme();
  const { hold, pax, addOns, setDetails } = useBooking();
  const s = hold!.summary;
  const minExpiry = pax.map((p) => p.passportExpiry).sort()[0];
  const q = useQuery({ queryKey: ['entry', s.to, minExpiry], queryFn: () => Api.entryRules({ to: s.to, via: s.via, nationality: pax[0]?.nationality ?? 'IN',
    departDate: dayjs(s.departAt).format('YYYY-MM-DD'), passportExpiry: minExpiry }) });
  const [hasVisa, setHasVisa] = useState<'YES' | 'NO' | ''>('');
  const [ins, setIns] = useState<string>(addOns.find((a) => a.startsWith('SCHENGEN')) ?? '');
  const [decl, setDecl] = useState(false);
  const r = q.data;
  if (!r) return <Screen title="Travel documents"><Loading text="Checking entry rules…" /></Screen>;
  const passportBad = r.passport?.ok === false;
  return (
    <Screen title="Travel documents" footer={passportBad
      ? <Button title="Use another passport" onPress={() => navigation.navigate('FlightTravellers')} />
      : <Button title="Continue to payment" disabled={!decl || (r.insuranceMandatory && !ins) || (r.visaRequired && r.visaType === 'REQUIRED' && hasVisa !== 'YES')}
          onPress={() => { setDetails({ addOns: [...addOns.filter((a) => !a.startsWith('SCHENGEN')), ...(ins ? [ins] : [])], extras: { declarationAccepted: true } }); navigation.navigate('Checkout'); }} />}>
      <Box icon="globe" text={`${s.from} → ${s.to} crosses a border. We check documents before payment so you are not refused at the airport.`} />
      {passportBad ? (
        <Card highlight>
          <Row><Icon name="x" size={28} color={c.danger} /><Txt v="h2" style={{ flex: 1 }}>Renew your passport first</Txt></Row>
          <Txt muted style={{ marginTop: 6 }}>Your passport must be valid until {dayjs(r.passport.needsValidTill).format('D MMM YYYY')} (6 months after travel). It expires {dayjs(r.passport.expiry).format('D MMM YYYY')}.</Txt>
        </Card>
      ) : <Box kind="success" text={`Passport valid beyond ${dayjs(r.passport.needsValidTill).format('D MMM YYYY')}`} />}
      <Section title="Visa" />
      <Card><Row><Txt v="h3" style={{ flex: 1 }}>{r.destinationCountry}</Txt>
        <Badge kind={r.visaRequired ? 'danger' : 'success'} text={r.visaType === 'NONE' ? 'Visa free' : r.visaType === 'ON_ARRIVAL' ? 'Visa on arrival' : r.visaType === 'E_VISA' ? 'e-Visa' : 'Visa required'} /></Row>
        {r.allowedStayDays && <Txt v="small" muted>Allowed stay up to {r.allowedStayDays} days</Txt>}
        {r.notes.map((n: string) => <Txt key={n} v="small" muted>• {n}</Txt>)}</Card>
      {r.visaRequired && r.visaType === 'REQUIRED' && <>
        <Txt v="h3">Do you have a valid visa?</Txt>
        <ChipGroup value={hasVisa} onChange={setHasVisa} options={[{ value: 'YES', label: 'Yes, I have one' }, { value: 'NO', label: 'No' }]} />
        {hasVisa === 'NO' && <Box kind="warn" text="You cannot board without a visa. Get the visa first, then book." />}
      </>}
      <Section title="Transit & entry" />
      <Card>
        <Row><Icon name={r.transitVisaRequired ? 'alert' : 'check'} color={r.transitVisaRequired ? c.warning : c.success} /><Txt v="small">{s.via ? `Layover in ${s.via}: ${r.transitVisaRequired ? 'transit visa needed' : 'no transit visa'}` : 'Direct flight - no transit'}</Txt></Row>
        <Row><Icon name={r.returnTicketRequired ? 'ticket' : 'check'} color={c.brand} /><Txt v="small">{r.returnTicketRequired ? 'Return or onward ticket required' : 'No onward ticket needed'}</Txt></Row>
      </Card>
      <Section title={r.insuranceMandatory ? 'Travel insurance (mandatory)' : 'Travel insurance (optional)'} />
      {r.insuranceMandatory && <Box kind="error" icon="shield" text={`Entry needs medical cover of at least €${r.minMedicalCoverEur?.toLocaleString('en-IN')}. This cannot be skipped.`} />}
      <ChipGroup value={ins} onChange={(v) => setIns(v === ins && !r.insuranceMandatory ? '' : v)} options={[
        { value: 'SCHENGEN_BASIC', label: 'Basic €30,000 · ₹1,250' }, { value: 'SCHENGEN_PLUS', label: 'Plus €50,000 · ₹1,990' }]} />
      <Toggle value={decl} onChange={setDecl} icon="check" label="I declare I hold valid travel documents for this journey" />
    </Screen>
  );
}
