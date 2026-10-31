import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import dayjs from 'dayjs';
import { useTheme } from '../../theme/ThemeProvider';
import { Badge, Box, Button, Card, ChipGroup, Counter, Field, HoldTimer, Row, Screen, Section, Stepper, Toggle, Txt } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { useBooking } from '../../store/booking';
import { useAuth } from '../../store/auth';
import { toE164 } from '../../utils/format';
import { validateRider } from './cabRules';
import { LIMITS, cleanEmail, cleanMobile, cleanName, collapseSpaces, validateEmail, validateEmergencyContact, validateMobile, validateName, validateText } from '../../utils/validation';

export const CAB_STEPS = ['Car', 'Rider', 'Review', 'Pay'];

/** CAB·03 - who is riding, passengers & luggage (checked against the car), pickup note, payment choice, emergency contact. */
export function CabRiderScreen({ navigation }: any) {
  const { c } = useTheme();
  const { hold, womenMode, setDetails } = useBooking();
  const user = useAuth((s) => s.user);
  const s = hold?.summary ?? {};
  const myMobile = (user?.mobile ?? '').replace('+91', '');
  const [forOther, setForOther] = useState(false);
  const [r, setR] = useState({ name: user?.name ?? '', mobile: myMobile, gender: womenMode ? 'F' : user?.gender ?? '', passengers: 1, luggage: 0, pickupNote: '' });
  const [contactMobile, setContactMobile] = useState(myMobile);
  const [email, setEmail] = useState(user?.email ?? '');
  const [pay, setPay] = useState<'PREPAID' | 'PAY_TO_DRIVER'>('PREPAID');
  const [addContact, setAddContact] = useState(womenMode);
  const [ec, setEc] = useState({ name: '', mobile: '', relation: 'Mother' });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }));
  const upd = (p: Partial<typeof r>) => setR((x) => ({ ...x, ...p }));

  const toggleOther = (v: boolean) => {
    setForOther(v);
    upd(v ? { name: '', mobile: '', gender: womenMode ? 'F' : '' } : { name: user?.name ?? '', mobile: myMobile, gender: womenMode ? 'F' : user?.gender ?? '' });
  };

  const riderMobile = forOther ? r.mobile : contactMobile;
  const compute = () => {
    const e = validateRider({ ...r, mobile: riderMobile }, { seats: s.seats, bags: s.bags, label: s.categoryLabel }, womenMode);
    const n = validateName(r.name, { label: 'Rider name' }); if (n) e.name = n; else delete e.name;
    if (forOther) { const m = validateMobile(r.mobile, "rider's mobile"); if (m) e.mobile = m; else delete e.mobile; } else delete e.mobile;
    const note = validateText(r.pickupNote, { label: 'Note', max: LIMITS.PICKUP_NOTE_MAX }); if (note) e.pickupNote = note;
    const cm = validateMobile(contactMobile, 'your mobile'); if (cm) e.contactMobile = cm;
    const em = validateEmail(email); if (em) e.email = em;
    if (addContact) {
      const x = validateEmergencyContact(ec, [contactMobile, riderMobile]);
      if (x.name) e.ecName = x.name;
      if (x.mobile) e.ecMobile = x.mobile;
    }
    return e;
  };
  const all = compute();
  const errors: Record<string, string> = {};
  Object.keys(all).forEach((k) => { if (submitted || touched[k]) errors[k] = all[k]; });

  const submit = () => {
    setSubmitted(true);
    if (Object.keys(all).length) return;
    setDetails({
      pax: [{ name: collapseSpaces(r.name), mobile: toE164(forOther ? r.mobile : contactMobile), gender: r.gender || undefined }],
      contact: { mobile: toE164(contactMobile), email: email.trim() },
      extras: { payOption: pay, cab: { passengers: r.passengers, luggage: r.luggage, pickupNote: r.pickupNote.trim() || undefined },
        emergencyContact: addContact ? { name: collapseSpaces(ec.name), mobile: toE164(ec.mobile), relation: ec.relation } : undefined },
    });
    navigation.navigate('Checkout');
  };

  return (
    <Screen title="Ride details" footer={<Button title="Review & book" onPress={submit} />}>
      <Stepper step={1} labels={CAB_STEPS} />
      <HoldTimer expiresAt={hold?.expiresAt} label={`${s.categoryLabel ?? 'Fare'} fare locked`} onExpire={() => navigation.goBack()} />
      <Card>
        <Row><Icon name="car" color={c.brand} /><Txt v="h3" style={{ flex: 1 }} numberOfLines={2}>{s.title}</Txt>{womenMode && <Badge kind="ladies" text="Women" />}</Row>
        <Txt v="small" muted style={{ marginTop: 4 }}>{s.categoryLabel} · {s.tripLabel} · {s.now ? 'Ride now' : dayjs(s.pickupAt).format('ddd, D MMM · hh:mm A')}</Txt>
      </Card>

      <Section title="Who is riding?" />
      <Row gap={8}>
        {[[false, 'Me'], [true, 'Someone else']].map(([v, l]) => (
          <Pressable key={String(v)} onPress={() => toggleOther(v as boolean)} accessibilityState={{ selected: forOther === v }}
            style={{ flex: 1, padding: 12, borderRadius: 13, borderWidth: 1.5, borderColor: forOther === v ? c.brand : c.border, backgroundColor: c.surface, alignItems: 'center' }}>
            <Icon name={v ? 'users' : 'user'} color={forOther === v ? c.brand : c.muted} /><Txt v="h3" color={forOther === v ? c.brand : c.text}>{l as string}</Txt>
          </Pressable>
        ))}
      </Row>
      <Field label="Rider name" value={r.name} onChangeText={(t) => upd({ name: cleanName(t) })} onBlur={() => touch('name')} error={errors.name} autoCapitalize="words" autoCorrect={false} maxLength={LIMITS.NAME_MAX} />
      {forOther && <>
        <Field label="Rider's mobile · driver will call this number" value={r.mobile} onChangeText={(t) => upd({ mobile: cleanMobile(t) })} onBlur={() => touch('mobile')} keyboardType="number-pad" maxLength={LIMITS.MOBILE_LEN} error={errors.mobile} />
        <Txt v="xs" muted>We SMS the rider the driver details and start OTP.</Txt>
      </>}
      {womenMode ? (
        <Row style={{ marginTop: 6 }}><Badge kind="ladies" text="Female rider" /><Icon name="lock" size={13} color={c.muted} /><Txt v="xs" muted>Women safety rides are for women riders</Txt></Row>
      ) : (
        <ChipGroup value={r.gender} onChange={(g) => upd({ gender: g })} options={[{ value: 'M', label: 'Male' }, { value: 'F', label: 'Female' }, { value: 'O', label: 'Other' }]} />
      )}
      {!!errors.gender && <Txt v="xs" color={c.danger}>{errors.gender}</Txt>}

      <Section title="Trip details" />
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View><Txt v="h3">Passengers</Txt><Txt v="xs" muted>{s.categoryLabel} seats up to {s.seats}</Txt></View>
          <Counter value={r.passengers} onChange={(n) => upd({ passengers: n })} min={1} max={s.seats ?? 4} />
        </Row>
        {!!errors.passengers && <Txt v="xs" color={c.danger}>{errors.passengers}</Txt>}
        <Row style={{ justifyContent: 'space-between', marginTop: 12 }}>
          <View><Txt v="h3">Bags</Txt><Txt v="xs" muted>Boot fits up to {s.bags} medium bags</Txt></View>
          <Counter value={r.luggage} onChange={(n) => upd({ luggage: n })} min={0} max={s.bags ?? 2} />
        </Row>
        {!!errors.luggage && <Txt v="xs" color={c.danger}>{errors.luggage}</Txt>}
      </Card>
      <Field label="Note for driver (optional) · e.g. Gate 3, blue building" value={r.pickupNote} onChangeText={(t) => upd({ pickupNote: t.replace(/[<>]/g, '') })} onBlur={() => touch('pickupNote')} maxLength={LIMITS.PICKUP_NOTE_MAX} error={errors.pickupNote} />

      <Section title="Contact for receipt" />
      <Field label="Your mobile" value={contactMobile} onChangeText={(t) => setContactMobile(cleanMobile(t))} onBlur={() => touch('contactMobile')} keyboardType="number-pad" maxLength={LIMITS.MOBILE_LEN} error={errors.contactMobile} />
      <Field label="Email" value={email} onChangeText={(t) => setEmail(cleanEmail(t))} onBlur={() => touch('email')} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={LIMITS.EMAIL_MAX} error={errors.email} />

      <Section title="How will you pay?" />
      {s.payToDriverAllowed ? ([['PREPAID', 'Pay online now', 'UPI, cards, wallet · offers apply'], ['PAY_TO_DRIVER', 'Pay driver after the ride', 'Cash or UPI to the driver']] as const).map(([v, t, sub]) => (
        <Pressable key={v} onPress={() => setPay(v)} accessibilityState={{ selected: pay === v }}
          style={{ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, borderRadius: 13, borderWidth: 1.5, marginVertical: 5, borderColor: pay === v ? c.brand : c.border, backgroundColor: c.surface }}>
          <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: pay === v ? 6 : 2, borderColor: pay === v ? c.brand : c.border }} />
          <View style={{ flex: 1 }}><Txt v="h3">{t}</Txt><Txt v="xs" muted>{sub}</Txt></View>
        </Pressable>
      )) : <Box text="Outstation rides are paid online in advance. Tolls beyond the estimate are paid to the driver as actuals." />}

      <Toggle value={addContact} onChange={setAddContact} icon="phone" label="Emergency contact" sub="Gets your live location if you press SOS during the ride" />
      {addContact && (
        <View>
          <Field label="Contact name" value={ec.name} onChangeText={(t) => setEc({ ...ec, name: cleanName(t) })} onBlur={() => touch('ecName')} autoCapitalize="words" autoCorrect={false} maxLength={LIMITS.NAME_MAX} error={errors.ecName} />
          <Field label="Contact mobile" value={ec.mobile} onChangeText={(t) => setEc({ ...ec, mobile: cleanMobile(t) })} onBlur={() => touch('ecMobile')} keyboardType="number-pad" maxLength={LIMITS.MOBILE_LEN} error={errors.ecMobile} />
          <ChipGroup value={ec.relation} onChange={(x) => setEc({ ...ec, relation: x })} options={['Mother', 'Father', 'Sister', 'Brother', 'Friend', 'Partner'].map((x) => ({ value: x, label: x }))} />
        </View>
      )}
    </Screen>
  );
}
