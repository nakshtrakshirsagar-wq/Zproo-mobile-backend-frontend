import React, { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTheme } from '../../theme/ThemeProvider';
import { Box, Button, Card, ChipGroup, ErrorView, Field, HoldTimer, Loading, Row, Screen, Section, Stepper, Toggle, Txt } from '../../components/ui';
import { CalendarSheet, PickerSheet, SearchCard } from '../../components/widgets';
import { Icon } from '../../components/Icon';
import { Api, Train } from '../../api/endpoints';
import { useRequireLogin } from '../../hooks/useRequireLogin';
import { useAuth } from '../../store/auth';
import { useBooking } from '../../store/booking';
import { STATIONS } from '../../utils/places';
import { dateShort, duration, rupees, time24, toE164, ymd } from '../../utils/format';
import { toast } from '../../utils/toast';
import {
  TRAIN_RULES, isSeatOnlyClass, validateEmail, validateIrctcId, validateMobile, validatePassengerAge, validatePassengerName,
  validatePassengers, validatePnr, validateTrainSearch, type PaxErrors,
} from './trainValidation';

/** Screen 42 - train search (IRCTC partner, Tatkal, PNR). */
export function TrainSearchScreen({ navigation }: any) {
  const { c } = useTheme();
  const [from, setFrom] = useState('CSMT');
  const [to, setTo] = useState('NDLS');
  const [date, setDate] = useState(ymd(dayjs().add(4, 'day')));
  const [tatkal, setTatkal] = useState(false);
  const [paxCount, setPaxCount] = useState(1);
  const [pick, setPick] = useState<'from' | 'to' | 'date' | null>(null);
  const [tried, setTried] = useState(false);
  const nm = (code: string) => STATIONS.find((s) => s.code === code)?.name ?? code;
  const { errors, warning } = validateTrainSearch({ from, to, date, tatkal, paxCount });
  const firstError = errors.from ?? errors.to ?? errors.date ?? errors.pax;
  const setTatkalMode = (v: boolean) => { setTatkal(v); if (v && paxCount > TRAIN_RULES.MAX_PAX_TATKAL) setPaxCount(TRAIN_RULES.MAX_PAX_TATKAL); };
  const search = () => {
    setTried(true);
    if (firstError) return;
    navigation.navigate('TrainList', { query: { from, to, date, quota: tatkal ? 'TQ' : 'GN', paxCount } });
  };
  // same-station is shown at once; the other errors appear after the first tap on Search
  const showErr = (k: 'from' | 'to' | 'date' | 'pax') => (k === 'to' && errors.to && from === to ? errors.to : tried ? errors[k] : undefined);
  return (
    <Screen title="Trains">
      <Row style={{ backgroundColor: c.chip, borderRadius: 10, padding: 8 }}><Icon name="shield" size={14} color={c.muted} /><Txt v="small" muted>Booked through an authorised IRCTC partner</Txt></Row>
      <SearchCard onSwap={() => { setFrom(to); setTo(from); }} rows={[
        { icon: 'pin', label: 'From station', value: `${nm(from)} (${from})`, onPress: () => setPick('from') },
        { icon: 'pin', label: 'To station', value: `${nm(to)} (${to})`, onPress: () => setPick('to') },
        { icon: 'cal', label: 'Date', value: dateShort(date), onPress: () => setPick('date'), chevron: true },
      ]} />
      {(['to', 'date'] as const).map((k) => showErr(k) ? <Box key={k} kind="error" text={showErr(k)!} /> : null)}
      <Toggle value={tatkal} onChange={setTatkalMode} icon="zap" label="Tatkal quota" sub="Opens 10:00 AC · 11:00 non-AC, one day before" />
      {tatkal && warning && !errors.date && <Box kind="warn" text={warning} />}
      <Txt v="h3">Passengers</Txt>
      <ChipGroup value={String(paxCount)} onChange={(v) => setPaxCount(Number(v))} options={Array.from({ length: tatkal ? TRAIN_RULES.MAX_PAX_TATKAL : TRAIN_RULES.MAX_PAX_GENERAL }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))} />
      <Txt v="xs" muted>Maximum {tatkal ? TRAIN_RULES.MAX_PAX_TATKAL : TRAIN_RULES.MAX_PAX_GENERAL} passengers per ticket{tatkal ? ' on Tatkal' : ''}</Txt>
      {showErr('pax') && <Box kind="error" text={showErr('pax')!} />}
      <Button title="Search trains" icon="search" onPress={search} style={{ marginTop: 10 }} />
      <Section title="More" />
      <Card onPress={() => navigation.navigate('PnrStatus')}><Row><Icon name="ticket" color={c.brand} /><Txt v="h3" style={{ flex: 1 }}>PNR status & live running</Txt><Icon name="chev" color={c.muted} /></Row></Card>
      <PickerSheet visible={pick === 'from' || pick === 'to'} onClose={() => setPick(null)} title="Select station" items={STATIONS}
        label={(s) => s.name} sub={(s) => s.code} onPick={(s) => (pick === 'from' ? setFrom(s.code) : setTo(s.code))} />
      <CalendarSheet visible={pick === 'date'} onClose={() => setPick(null)} value={date} onPick={setDate} />
    </Screen>
  );
}

const AV_COLORS = { AVL: 'success', RAC: 'warn', WL: 'danger', REGRET: 'neutral' } as const;

/** Screen 43 - trains with class availability (AVL / RAC / WL with chance / REGRET). */
export function TrainListScreen({ navigation, route }: any) {
  const { c } = useTheme();
  const { query } = route.params;
  const q = useQuery({ queryKey: ['trains', query], queryFn: () => Api.trainSearch(query) });
  const requireLogin = useRequireLogin();
  const [busy, setBusy] = useState<string | null>(null);
  const choose = (t: Train, code: string) => requireLogin(async () => {
    if (!useAuth.getState().user?.irctcUsername) return navigation.navigate('IrctcLink');
    setBusy(t.number + code);
    try {
      const h = await Api.hold({ mode: 'TRAIN', trainNo: t.number, date: query.date, from: query.from, to: query.to, classCode: code, quota: query.quota, paxCount: query.paxCount });
      useBooking.getState().setHold(h);
      useBooking.getState().setDetails({ extras: { paxCounts: { adults: query.paxCount, children: 0, infants: 0 } } });
      navigation.navigate('TrainPassengers');
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(null); }
  });
  return (
    <Screen scroll={false} padded={false} title={`${query.from} → ${query.to} · ${dateShort(query.date)}`}>
      {q.isLoading ? <Loading text="Checking availability…" /> : q.error ? <ErrorView error={q.error} onRetry={q.refetch} /> : (
        <FlatList data={q.data!.trains} keyExtractor={(t) => t.number} contentContainerStyle={{ padding: 16 }}
          ListHeaderComponent={q.data!.tatkal && !q.data!.tatkal.open ? <Box kind="warn" text={`Tatkal opens ${q.data!.tatkal.opensAt}`} /> : <Txt v="xs" muted>AVL available · RAC · WL waitlist · REGRET not bookable</Txt>}
          renderItem={({ item: t }) => (
            <Card>
              <Row><View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' }}><Icon name="train" color="#fff" /></View>
                <View style={{ flex: 1 }}><Txt v="h3">{t.number} {t.name}</Txt><Txt v="xs" muted>{t.runningDays}</Txt></View></Row>
              <Row style={{ marginVertical: 8 }}>
                <View><Txt v="h2">{time24(t.departAt)}</Txt><Txt v="xs" muted>{t.from}</Txt></View>
                <View style={{ flex: 1, alignItems: 'center' }}><Txt v="xs" muted>{duration(t.durationMin)}</Txt></View>
                <View style={{ alignItems: 'flex-end' }}><Txt v="h2">{time24(t.arriveAt)}</Txt><Txt v="xs" muted>{t.to}</Txt></View>
              </Row>
              <Row gap={6} style={{ flexWrap: 'wrap' }}>
                {t.classes.map((k) => (
                  <Pressable key={k.code} disabled={k.status === 'REGRET' || !!busy} onPress={() => choose(t, k.code)}
                    style={{ borderWidth: 1.5, borderColor: c.border, borderRadius: 11, padding: 8, minWidth: 78, opacity: k.status === 'REGRET' ? 0.5 : 1, backgroundColor: c.surface }}>
                    <Txt v="h3">{k.code}</Txt>
                    <Txt v="xs" color={c.success} bold>{k.status === 'REGRET' ? '—' : rupees(k.farePaise)}</Txt>
                    <Txt v="xs" color={c[AV_COLORS[k.status] === 'success' ? 'success' : AV_COLORS[k.status] === 'warn' ? 'warning' : AV_COLORS[k.status] === 'danger' ? 'danger' : 'muted']} bold>
                      {k.status}{k.count ? ' ' + k.count : ''}</Txt>
                    {k.chancePct != null && <Txt v="xs" muted style={{ fontSize: 9 }}>{k.chancePct}% chance</Txt>}
                  </Pressable>
                ))}
              </Row>
            </Card>
          )} />
      )}
    </Screen>
  );
}

/** Screen 44 - link IRCTC user id (needed for every train e-ticket). */
export function IrctcLinkScreen({ navigation }: any) {
  const { c } = useTheme();
  const [u, setU] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const idErr = validateIrctcId(u);
  const submit = async () => {
    setTouched(true); setErr(null);
    if (idErr) return;
    setBusy(true);
    try { await Api.linkIrctc(u.trim()); useAuth.getState().setUser(await Api.me()); toast('IRCTC id linked', 'success'); navigation.goBack(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <Screen title="IRCTC account" footer={<Button title="Verify & continue" loading={busy} disabled={u.trim().length === 0} onPress={submit} />}>
      <View style={{ alignItems: 'center', marginVertical: 12 }}><View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: c.navyMid, alignItems: 'center', justifyContent: 'center' }}><Icon name="train" size={28} color="#fff" /></View></View>
      <Txt v="h2" center>Link your IRCTC ID</Txt>
      <Txt muted center>Indian Railways needs an IRCTC user id for every e-ticket. You confirm the booking on IRCTC after payment.</Txt>
      <Field label="IRCTC username" value={u} onChangeText={(v) => setU(v.replace(/\s/g, '').slice(0, 35))} onBlur={() => setTouched(true)} autoCapitalize="none" autoCorrect={false}
        maxLength={35} error={touched && idErr ? idErr : undefined} />
      <Txt v="xs" muted>3-35 characters. Letters, numbers, underscore and dot only.</Txt>
      {err && <Box kind="error" text={err} />}
      <Box text="Don't have one? Create it on irctc.co.in, then come back." />
    </Screen>
  );
}

const BERTHS = [{ value: 'LOWER', label: 'Lower' }, { value: 'MIDDLE', label: 'Middle' }, { value: 'UPPER', label: 'Upper' }, { value: 'SIDE_LOWER', label: 'Side lower' }, { value: 'NONE', label: 'No pref' }];

/** Screen 45 - train passengers. */
export function TrainPassengersScreen({ navigation }: any) {
  const { c } = useTheme();
  const { hold, extras, setDetails } = useBooking();
  const user = useAuth((s) => s.user);
  const s = hold!.summary;
  const count = extras.paxCounts?.adults ?? 1;
  const seatOnly = isSeatOnlyClass(s.classCode);   // CC / EC / 2S etc. have seats, no berth preference
  const [pax, setPax] = useState(Array.from({ length: count }, (_, i) => ({ name: i === 0 ? user?.name ?? '' : '', age: '', gender: 'M', berth: seatOnly ? 'NONE' : 'LOWER', senior: false })));
  const [mobile, setMobile] = useState((user?.mobile ?? '').replace('+91', ''));
  const [email, setEmail] = useState(user?.email ?? '');
  const [paxErr, setPaxErr] = useState<PaxErrors[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const upd = (i: number, x: any) => setPax(pax.map((p, k) => (k === i ? { ...p, ...x } : p)));
  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }));
  // live (per-field) messages show after the field was left once, or after Continue was tapped
  const show = (k: string) => submitted || touched[k];
  const mobileErr = validateMobile(mobile);
  const emailErr = validateEmail(email);
  const live = (i: number): PaxErrors => ({
    name: show(`n${i}`) ? validatePassengerName(pax[i].name) || paxErr[i]?.name : undefined,
    age: show(`a${i}`) ? validatePassengerAge(pax[i].age) || paxErr[i]?.age : undefined,
    senior: paxErr[i]?.senior,
  });
  const onContinue = () => {
    setSubmitted(true); setErr(null);
    const r = validatePassengers(pax);
    setPaxErr(r.errors);
    if (r.message) return setErr(r.message);
    if (mobileErr || emailErr) return setErr('Please correct the contact details');
    setDetails({ pax: pax.map((p) => ({ name: p.name.trim().replace(/\s+/g, ' '), age: Number(p.age), gender: p.gender, berth: seatOnly ? 'NONE' : p.berth, senior: p.senior })), contact: { mobile: toE164(mobile), email: email.trim().toLowerCase() } });
    navigation.navigate('Checkout');
  };
  return (
    <Screen title="Passengers" footer={<Button title="Continue" onPress={onContinue} />}>
      <Stepper step={1} />
      <HoldTimer expiresAt={hold?.expiresAt} label="Fare held" />
      <Card><Txt v="h3">{s.train}</Txt><Txt v="xs" muted>{s.title} · {s.classCode} · {dateShort(s.departAt)} · {s.availability}{s.chancePct ? ` · ${s.chancePct}% chance` : ''}</Txt></Card>
      <Txt v="xs" muted style={{ marginTop: 4 }}>Enter names exactly as on the ID you will carry (letters only, {TRAIN_RULES.NAME_MIN}-{TRAIN_RULES.NAME_MAX} characters).</Txt>
      {pax.map((p, i) => {
        const e = live(i);
        return (
          <View key={i}>
            <Section title={`Passenger ${i + 1}`} />
            <Field label="Name as per ID" value={p.name} onChangeText={(v) => upd(i, { name: v.replace(/[^A-Za-z .'-]/g, '').slice(0, TRAIN_RULES.NAME_MAX) })} onBlur={() => touch(`n${i}`)}
              autoCapitalize="words" autoCorrect={false} maxLength={TRAIN_RULES.NAME_MAX} error={e.name} />
            <Row style={{ alignItems: 'flex-start' }}>
              <View style={{ width: 90 }}><Field label="Age" value={p.age} onChangeText={(v) => upd(i, { age: v.replace(/\D/g, '').slice(0, 3) })} onBlur={() => touch(`a${i}`)} keyboardType="number-pad" maxLength={3} error={e.age ? 'Invalid' : undefined} /></View>
              <View style={{ flex: 1 }}><ChipGroup value={p.gender} onChange={(v) => upd(i, { gender: v })} options={[{ value: 'M', label: 'Male' }, { value: 'F', label: 'Female' }, { value: 'O', label: 'Other' }]} /></View>
            </Row>
            {!!e.age && <Txt v="xs" color={c.danger}>{e.age}</Txt>}
            {!seatOnly && <ChipGroup value={p.berth} onChange={(v) => upd(i, { berth: v })} options={BERTHS} />}
            <Toggle value={p.senior} onChange={(v) => upd(i, { senior: v })} label="Senior citizen" sub="Concession where applicable (men 60+, women 58+)" />
            {!!e.senior && <Txt v="xs" color={c.danger}>{e.senior}</Txt>}
          </View>
        );
      })}
      <Section title="Contact" />
      <Field label="Mobile" value={mobile} onChangeText={(v) => setMobile(v.replace(/\D/g, '').slice(0, 10))} onBlur={() => touch('m')} keyboardType="number-pad" maxLength={10}
        error={show('m') && mobileErr ? mobileErr : undefined} />
      <Field label="Email" value={email} onChangeText={(v) => setEmail(v.replace(/\s/g, ''))} onBlur={() => touch('e')} keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
        error={show('e') && emailErr ? emailErr : undefined} />
      {err && <Box kind="error" text={err} />}
      <Box text="After payment you confirm on IRCTC with your IRCTC password or OTP. If it fails, money is refunded automatically." />
    </Screen>
  );
}

/** Screen 49 - PNR status + live running. */
export function PnrStatusScreen({ route }: any) {
  const { c } = useTheme();
  const [pnr, setPnr] = useState<string>(route.params?.pnr ?? '');
  const [go, setGo] = useState<string | null>(route.params?.pnr ?? null);
  const q = useQuery({ queryKey: ['pnr', go], queryFn: () => Api.pnr(go!), enabled: !!go });
  return (
    <Screen title="PNR status">
      <Row><View style={{ flex: 1 }}><Field label="10-digit PNR" value={pnr} onChangeText={(v) => setPnr(v.replace(/\D/g, '').slice(0, 10))} keyboardType="number-pad" maxLength={10}
          error={pnr.length > 0 ? validatePnr(pnr) || undefined : undefined} /></View>
        <Button small title="Check" disabled={pnr.length !== 10 || !!validatePnr(pnr)} onPress={() => setGo(pnr)} /></Row>
      {q.isLoading && go ? <Loading /> : q.error ? <ErrorView error={q.error} onRetry={q.refetch} /> : q.data && <>
        <Card><Row><Txt v="h3" style={{ flex: 1 }}>PNR {q.data.pnr}</Txt><Txt v="small" color={c.success} bold>{q.data.status}{q.data.chartPrepared ? ' · Chart prepared' : ''}</Txt></Row></Card>
        <Section title="Live running" />
        <Card>{q.data.stations.map((s: any) => (
          <Row key={s.name} style={{ paddingVertical: 7 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: s.state === 'DONE' ? c.success : s.state === 'NOW' ? c.brand : c.border }} />
            <Txt style={{ flex: 1 }} bold={s.state === 'NOW'}>{s.name}</Txt><Txt v="small" muted>{s.time}</Txt>
          </Row>))}</Card>
        <Box text={`Platform ${q.data.platform} at destination`} icon="pin" />
      </>}
    </Screen>
  );
}
