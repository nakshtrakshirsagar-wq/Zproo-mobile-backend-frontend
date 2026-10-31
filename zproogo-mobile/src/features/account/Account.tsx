import React, { useState } from 'react';
import { BOTTOM_NAV_SPACE } from '../../components/BottomNav';
import { Linking, Pressable, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../theme/ThemeProvider';
import { Avatar, Badge, Box, Button, Card, ChipGroup, EmptyState, Field, Loading, Row, Screen, Section, Toggle, Txt } from '../../components/ui';
import { ConfirmDialog } from '../../components/widgets';
import { Icon, IconName } from '../../components/Icon';
import { Api } from '../../api/endpoints';
import { useAuth } from '../../store/auth';
import { usePrefs } from '../../store/prefs';
import { clearTokens } from '../../security/secureStore';
import { useRequireLogin } from '../../hooks/useRequireLogin';
import { useSecureScreen } from '../../security/useSecureScreen';
import { Config } from '../../config';
import { dateShort, rupees, toE164 } from '../../utils/format';
import { toast } from '../../utils/toast';
import { LIMITS, cleanAlnumUpper, cleanDateInput, cleanEmail, cleanMobile, cleanName, collapseSpaces, validateDob, validateEmail, validateEmergencyContact, validateName, validateNationality, validatePassportExpiry, validatePassportNo, validateText } from '../../utils/validation';

function MenuItem({ icon, label, end, onPress }: { icon: IconName; label: string; end?: string; onPress?: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.chip, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={15} color={c.brand} /></View>
      <Txt style={{ flex: 1 }}>{label}</Txt>{end && <Txt v="small" muted>{end}</Txt>}<Icon name="chev" size={14} color={c.muted} />
    </Pressable>
  );
}

/** Account tab (screen 07 guest / profile hub). Profile photo shown (whiteboard 2). */
export function AccountScreen({ navigation }: any) {
  const { c } = useTheme();
  const user = useAuth((s) => s.user);
  const requireLogin = useRequireLogin();
  const need = (screen: string) => () => requireLogin(() => navigation.navigate(screen));
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: BOTTOM_NAV_SPACE }}>
        <Txt v="h1">Account</Txt>
        <Card onPress={user ? () => navigation.navigate('Profile') : undefined}>
          <Row><Avatar name={user?.name ?? user?.mobile ?? 'Guest'} url={user?.photoUrl} size={56} />
            <View style={{ flex: 1 }}><Txt v="h2">{user ? user.name ?? 'Traveller' : 'Guest'}</Txt>
              <Txt v="small" muted>{user ? user.mobile ?? user.email : 'Log in to save travellers & wallet'}</Txt>
              {user && <Badge kind="warn" text={`${user.points} points`} />}</View>
            {user && <Icon name="edit" color={c.muted} />}</Row>
        </Card>
        {!user && <Button title="Log in or sign up" onPress={() => requireLogin(() => undefined)} />}
        <Card style={{ paddingVertical: 2 }}>
          <MenuItem icon="wallet" label="Wallet" onPress={need('Wallet')} />
          <MenuItem icon="users" label="Saved travellers" onPress={need('Travellers')} />
          <MenuItem icon="shield" label="Emergency contacts" onPress={need('EmergencyContacts')} />
          <MenuItem icon="ticket" label="My Trips" onPress={() => navigation.navigate('MyTrips')} />
          <MenuItem icon="tag" label="Offers" onPress={() => navigation.navigate('Offers')} />
          <MenuItem icon="help" label="Help & support" onPress={() => navigation.navigate('Help')} />
          <MenuItem icon="moon" label="Settings" onPress={() => navigation.navigate('Settings')} />
          <MenuItem icon="info" label="About Zproogo" end={'v' + Config.VERSION} onPress={() => Linking.openURL('https://zproogo.com')} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

export function ProfileScreen({ navigation }: any) {
  const user = useAuth((s) => s.user)!;
  const [name, setName] = useState(user.name ?? '');
  const [email, setEmail] = useState(user.email ?? '');
  const [gender, setGender] = useState(user.gender ?? '');
  const [women, setWomen] = useState(user.womenModeDefault);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }));
  const all: Record<string, string> = {};
  const vn = validateName(name, { label: 'Full name', max: 80 }); if (vn) all.name = vn;
  const ve = validateEmail(email, { required: false }); if (ve) all.email = ve;
  const errors: Record<string, string> = {};
  Object.keys(all).forEach((k) => { if (submitted || touched[k]) errors[k] = all[k]; });
  return (
    <Screen title="Profile" footer={<Button title="Save" loading={busy} onPress={async () => {
      setSubmitted(true);
      if (Object.keys(all).length) return;
      setBusy(true);
      try { useAuth.getState().setUser(await Api.updateMe({ name: collapseSpaces(name), email: email.trim() || undefined, gender: gender || undefined, womenModeDefault: women } as any)); usePrefs.getState().set({ womenMode: women }); toast('Saved', 'success'); navigation.goBack(); }
      catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
    }} />}>
      <View style={{ alignItems: 'center', marginBottom: 12 }}><Avatar name={name} url={user.photoUrl} size={84} /><Txt v="xs" muted style={{ marginTop: 6 }}>Photo comes from your Google account</Txt></View>
      <Field label="Full name" value={name} onChangeText={(t) => setName(cleanName(t, 80))} onBlur={() => touch('name')} error={errors.name} autoCapitalize="words" autoCorrect={false} maxLength={80} />
      <Field label="Mobile (verified)" value={user.mobile ?? ''} editable={false} />
      <Field label="Email" value={email} onChangeText={(t) => setEmail(cleanEmail(t))} onBlur={() => touch('email')} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={LIMITS.EMAIL_MAX} />
      <ChipGroup value={gender} onChange={setGender} options={[{ value: 'M', label: 'Male' }, { value: 'F', label: 'Female' }, { value: 'O', label: 'Other' }]} />
      <Toggle value={women} onChange={setWomen} icon="shield" label="Booking for women on by default" highlight />
    </Screen>
  );
}

export function TravellersScreen() {
  useSecureScreen();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['travellers'], queryFn: Api.travellers });
  const [f, setF] = useState({ name: '', gender: 'M', dob: '', passportNo: '', passportExpiry: '', nationality: 'IN' });
  const [adding, setAdding] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }));
  const all: Record<string, string> = {};
  const vn = validateName(f.name, { label: 'Full name', max: 80 }); if (vn) all.name = vn;
  if (f.dob) { const d = validateDob(f.dob); if (d) all.dob = d; }
  if (f.passportNo) { const p = validatePassportNo(f.passportNo); if (p) all.passportNo = p; }
  if (f.passportNo || f.passportExpiry) {
    if (!f.passportNo) all.passportNo = 'Enter passport number';
    const x = validatePassportExpiry(f.passportExpiry); if (x) all.passportExpiry = x;
  }
  if (f.nationality) { const n = validateNationality(f.nationality); if (n) all.nationality = n; }
  const errors: Record<string, string> = {};
  Object.keys(all).forEach((k) => { if (submitted || touched[k]) errors[k] = all[k]; });
  const save = async () => {
    setSubmitted(true);
    if (Object.keys(all).length) return;
    try {
      await Api.addTraveller({ name: collapseSpaces(f.name), gender: f.gender, dob: f.dob || undefined, passportNo: f.passportNo || undefined, passportExpiry: f.passportExpiry || undefined, nationality: f.nationality || undefined });
      setAdding(false); setSubmitted(false); setTouched({}); setF({ ...f, name: '', dob: '', passportNo: '', passportExpiry: '' }); qc.invalidateQueries({ queryKey: ['travellers'] });
    } catch (e: any) { toast(e.message, 'error'); }
  };
  return (
    <Screen title="Saved travellers">
      {q.isLoading ? <Loading /> : (q.data ?? []).map((t) => (
        <Card key={t.id}><Row><Avatar name={t.name} size={34} /><View style={{ flex: 1 }}><Txt v="h3">{t.name}</Txt><Txt v="xs" muted>{t.gender}{t.passportMasked ? ` · Passport ${t.passportMasked}` : ''}{t.passportExpiry ? ` · exp ${dateShort(t.passportExpiry)}` : ''}</Txt></View>
          <Txt v="small" color="#E11D48" onPress={async () => { await Api.deleteTraveller(t.id); qc.invalidateQueries({ queryKey: ['travellers'] }); }}>Remove</Txt></Row></Card>
      ))}
      {adding ? <Card>
        <Field label="Full name" value={f.name} onChangeText={(v) => setF({ ...f, name: cleanName(v, 80) })} onBlur={() => touch('name')} error={errors.name} autoCapitalize="words" autoCorrect={false} maxLength={80} />
        <ChipGroup value={f.gender} onChange={(v) => setF({ ...f, gender: v })} options={[{ value: 'M', label: 'Male' }, { value: 'F', label: 'Female' }, { value: 'O', label: 'Other' }]} />
        <Field label="Date of birth (YYYY-MM-DD)" value={f.dob} onChangeText={(v) => setF({ ...f, dob: cleanDateInput(v) })} onBlur={() => touch('dob')} error={errors.dob} keyboardType="number-pad" placeholder="YYYY-MM-DD" maxLength={10} />
        <Field label="Passport number (optional)" value={f.passportNo} onChangeText={(v) => setF({ ...f, passportNo: cleanAlnumUpper(v, LIMITS.PASSPORT_MAX) })} onBlur={() => touch('passportNo')} error={errors.passportNo} autoCapitalize="characters" autoCorrect={false} maxLength={LIMITS.PASSPORT_MAX} />
        <Field label="Passport expiry (YYYY-MM-DD)" value={f.passportExpiry} onChangeText={(v) => setF({ ...f, passportExpiry: cleanDateInput(v) })} onBlur={() => touch('passportExpiry')} error={errors.passportExpiry} keyboardType="number-pad" placeholder="YYYY-MM-DD" maxLength={10} />
        <Box icon="lock" text="Passport number and date of birth are encrypted on our servers." />
        <Button title="Save traveller" onPress={save} disabled={f.name.trim().length < 2} />
      </Card> : <Button title="Add traveller" icon="plus" variant="outline" onPress={() => setAdding(true)} />}
    </Screen>
  );
}

export function EmergencyContactsScreen() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['contacts'], queryFn: Api.contacts });
  const [f, setF] = useState({ name: '', mobile: '', relation: 'Mother' });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }));
  const user = useAuth((st) => st.user);
  const all = validateEmergencyContact(f, [(user?.mobile ?? '').replace('+91', ''), ...(q.data ?? []).map((x: any) => String(x.mobile ?? '').replace('+91', ''))]);
  const dupMobile = (q.data ?? []).some((x: any) => String(x.mobile ?? '').replace('+91', '') === f.mobile);
  if (dupMobile && f.mobile.length === 10) all.mobile = 'This contact is already added';
  const errors = { name: submitted || touched.name ? all.name : undefined, mobile: submitted || touched.mobile ? all.mobile : undefined };
  return (
    <Screen title="Emergency contacts">
      <Box kind="success" icon="shield" text="When you press SOS during a trip, these contacts get an SMS / WhatsApp with your live location." />
      {(q.data ?? []).map((x) => (
        <Card key={x.id}><Row><Icon name="phone" color="#E11D48" /><View style={{ flex: 1 }}><Txt v="h3">{x.name}</Txt><Txt v="xs" muted>{x.relation} · {x.mobile}</Txt></View>
          <Txt v="small" color="#E11D48" onPress={async () => { await Api.deleteContact(x.id); qc.invalidateQueries({ queryKey: ['contacts'] }); }}>Remove</Txt></Row></Card>
      ))}
      {(q.data?.length ?? 0) < 3 && <Card>
        <Field label="Name" value={f.name} onChangeText={(v) => setF({ ...f, name: cleanName(v) })} onBlur={() => touch('name')} error={errors.name} autoCapitalize="words" autoCorrect={false} maxLength={LIMITS.NAME_MAX} />
        <Field label="Mobile" value={f.mobile} onChangeText={(v) => setF({ ...f, mobile: cleanMobile(v) })} onBlur={() => touch('mobile')} error={errors.mobile} keyboardType="number-pad" maxLength={LIMITS.MOBILE_LEN} />
        <ChipGroup value={f.relation} onChange={(v) => setF({ ...f, relation: v })} options={['Mother', 'Father', 'Sister', 'Brother', 'Friend', 'Partner'].map((x) => ({ value: x, label: x }))} />
        <Button title="Add contact" onPress={async () => {
          setSubmitted(true);
          if (all.name || all.mobile) return;
          try { await Api.addContact({ ...f, name: collapseSpaces(f.name), mobile: toE164(f.mobile) }); setSubmitted(false); setTouched({}); setF({ name: '', mobile: '', relation: 'Mother' }); qc.invalidateQueries({ queryKey: ['contacts'] }); }
          catch (e: any) { toast(e.message, 'error'); }
        }} />
      </Card>}
    </Screen>
  );
}

export function WalletScreen() {
  useSecureScreen();
  const { c } = useTheme();
  const q = useQuery({ queryKey: ['wallet'], queryFn: Api.wallet });
  return (
    <Screen title="Wallet">
      <LinearGradient colors={['#0B1F3A', '#1E3A5F', '#D90404']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, padding: 18 }}>
        <Txt v="small" color="#BAE6FD">Wallet balance</Txt>
        <Txt v="title" color="#fff">{q.data ? rupees(q.data.balancePaise) : '—'}</Txt>
        <Txt v="small" color="#fff">{q.data?.points ?? 0} reward points</Txt>
      </LinearGradient>
      <Section title="Activity" />
      {q.isLoading ? <Loading /> : !q.data?.entries.length ? <EmptyState icon="wallet" title="No activity yet" text="Refunds to wallet are instant and can be used on your next trip." /> : (
        <Card>{q.data.entries.map((e) => (
          <Row key={e.id} style={{ paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: c.border }}>
            <View style={{ flex: 1 }}><Txt v="h3" style={{ fontSize: 12 }}>{e.note ?? e.type}</Txt><Txt v="xs" muted>{dateShort(e.at)} · {e.type.toLowerCase()}</Txt></View>
            <Txt bold color={e.amountPaise > 0 ? c.success : c.text}>{e.amountPaise > 0 ? '+' : '−'}{rupees(Math.abs(e.amountPaise))}</Txt>
          </Row>))}</Card>
      )}
    </Screen>
  );
}

export function HelpScreen({ route }: any) {
  const { c } = useTheme();
  const user = useAuth((s) => s.user);
  const requireLogin = useRequireLogin();
  const faqs = useQuery({ queryKey: ['faqs'], queryFn: Api.faqs });
  const [cat, setCat] = useState(route?.params?.category ?? 'REFUND');
  const [msg, setMsg] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const msgErr = validateText(msg, { label: 'Message', min: LIMITS.SUPPORT_MIN, max: LIMITS.SUPPORT_MAX, required: true });
  const [msgTouched, setMsgTouched] = useState(false);
  const send = () => { setMsgTouched(true); if (msgErr) return; requireLogin(async () => {
    try { await Api.raiseTicket({ category: cat, message: msg.trim(), bookingId: route?.params?.bookingId }); setMsg(''); toast('Ticket raised. We will reply within 24 hours.', 'success'); }
    catch (e: any) { toast(e.message, 'error'); }
  }); };
  return (
    <Screen title="Help & support" back={!!route?.params}>
      <Txt v="h2">How can we help?</Txt>
      <Row style={{ marginVertical: 8 }}>
        <Button small variant="outline" icon="phone" title="Call us" onPress={() => Linking.openURL('tel:' + Config.SUPPORT_PHONE)} style={{ flex: 1 }} />
        <Button small variant="outline" icon="mail" title="Email" onPress={() => Linking.openURL('mailto:support@zproogo.com')} style={{ flex: 1 }} />
      </Row>
      <Section title="Raise a ticket" />
      <ChipGroup value={cat} onChange={setCat} options={[{ value: 'REFUND', label: 'Refund' }, { value: 'DELAY', label: 'Delay' }, { value: 'WRONG_CHARGE', label: 'Wrong charge' },
        { value: 'SEAT', label: 'Seat issue' }, { value: 'COMPLAINT', label: 'Complaint' }, { value: 'RIDE', label: 'Cab ride issue' }, { value: 'TDR', label: 'Train TDR' }, { value: 'OTHER', label: 'Other' }]} />
      <Field label="Describe the issue" value={msg} onChangeText={(t) => setMsg(t.replace(/[<>]/g, ''))} onBlur={() => setMsgTouched(true)} error={msgTouched && msgErr ? msgErr : undefined} multiline numberOfLines={4} maxLength={LIMITS.SUPPORT_MAX} />
      <Txt v="xs" muted style={{ textAlign: 'right' }}>{msg.length}/{LIMITS.SUPPORT_MAX}</Txt>
      <Button title={user ? 'Submit ticket' : 'Log in to submit'} onPress={send} />
      <Section title="Popular questions" />
      {(faqs.data ?? []).map((f, i) => (
        <Card key={f.q} onPress={() => setOpen(open === i ? null : i)}>
          <Row><Txt v="h3" style={{ flex: 1 }}>{f.q}</Txt><Icon name={open === i ? 'minus' : 'plus'} size={14} color={c.brand} /></Row>
          {open === i && <Txt v="small" muted style={{ marginTop: 6 }}>{f.a}</Txt>}
        </Card>
      ))}
      {/* Help is also a tab: leave room so the last FAQ scrolls above the floating nav */}
      {!route?.params && <View style={{ height: BOTTOM_NAV_SPACE - 24 }} />}
    </Screen>
  );
}

export function SettingsScreen({ navigation }: any) {
  const prefs = usePrefs();
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const [del, setDel] = useState(false);
  const logout = async () => {
    await Api.logout().catch(() => undefined);
    await clearTokens(); useAuth.getState().setUser(null); qc.clear();
    navigation.navigate('Main', { screen: 'Home' });
  };
  return (
    <Screen title="Settings">
      <Txt v="h3">Theme</Txt>
      <ChipGroup value={prefs.theme} onChange={(v) => prefs.set({ theme: v })} options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
      <Toggle value={prefs.womenMode} onChange={(v) => prefs.set({ womenMode: v })} icon="shield" label="Booking for women by default" />
      <Section title="Privacy & security" />
      <Box icon="lock" text="Zproogo never asks for a password. Log in with OTP or Google. Your tokens are stored in the Android Keystore." />
      {user && <>
        <Button title="Log out" variant="outline" icon="logout" onPress={logout} style={{ marginTop: 10 }} />
        <Button title="Delete my account" variant="ghost" onPress={() => setDel(true)} style={{ marginTop: 6 }} />
      </>}
      <ConfirmDialog visible={del} danger title="Delete account?" text="Your profile, saved travellers and contacts will be deleted. Booking records required by law are kept anonymised."
        confirm="Delete account" onCancel={() => setDel(false)} onConfirm={async () => { setDel(false); await Api.deleteMe().catch(() => undefined); await logout(); }} />
    </Screen>
  );
}

export function ForceUpdateScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      <EmptyState icon="refresh" title="Update required" text="A new version of Zproogo is available with important fixes. Please update to continue."
        action="Update on Google Play" onAction={() => Linking.openURL('market://details?id=com.zproogo.app')} />
    </SafeAreaView>
  );
}
