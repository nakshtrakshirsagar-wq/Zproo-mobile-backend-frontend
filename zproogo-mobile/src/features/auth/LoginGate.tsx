import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { useTheme } from '../../theme/ThemeProvider';
import { Box, Button, HoldTimer, IconButton, Row, Txt } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { Api } from '../../api/endpoints';
import { saveTokens } from '../../security/secureStore';
import { useSecureScreen } from '../../security/useSecureScreen';
import { useAuth } from '../../store/auth';
import { useBooking } from '../../store/booking';
import { Config } from '../../config';
import { toE164 } from '../../utils/format';
import { validateMobile } from '../../utils/validation';
import type { ApiError } from '../../api/client';

GoogleSignin.configure({ webClientId: Config.GOOGLE_WEB_CLIENT_ID });

/** Screen 08 - login gate. Opens as a sheet at the TOP of the page (so the keyboard never covers it). Mobile OTP or Google. No passwords anywhere. */
export function LoginGateScreen({ navigation }: any) {
  useSecureScreen();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const hold = useBooking((s) => s.hold);
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lockedSec, setLockedSec] = useState(0);
  const [resend, setResend] = useState(0);
  const otpRef = useRef<TextInput>(null);
  const drop = useRef(new Animated.Value(-420)).current;   // sheet slides down from the top of the page
  useEffect(() => { Animated.timing(drop, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, [drop]);

  useEffect(() => {
    if (resend <= 0 && lockedSec <= 0) return;
    const t = setInterval(() => { setResend((r) => Math.max(0, r - 1)); setLockedSec((l) => Math.max(0, l - 1)); }, 1000);
    return () => clearInterval(t);
  }, [resend, lockedSec]);

  // Android SMS Retriever: auto-fill the OTP (MSG91 template must end with the app hash).
  useEffect(() => {
    if (step !== 'otp') return;
    let remove: (() => void) | undefined;
    (async () => {
      try {
        const m = require('react-native-otp-verify');
        await m.startOtpListener((msg: string) => { const code = /(\d{6})/.exec(msg ?? '')?.[1]; if (code) setOtp(code); });
        remove = m.removeListener;
      } catch { /* not available on this device */ }
    })();
    return () => remove?.();
  }, [step]);

  const fail = (e: ApiError) => {
    if (e.code === 'TOO_MANY_ATTEMPTS') setLockedSec(e.details?.retryAfterSec ?? 900);
    else if (e.code === 'OTP_INVALID') setErr(`Wrong code. ${e.details?.attemptsLeft} attempt(s) left before a 15-minute lock.`);
    else if (e.code === 'OTP_COOLDOWN') setResend(e.details?.retryAfterSec ?? 30);
    else setErr(e.message);
  };

  const send = async () => {
    setErr(null); setBusy(true);
    try { const r = await Api.sendOtp(toE164(mobile)); setStep('otp'); setResend(r.resendInSec); setTimeout(() => otpRef.current?.focus(), 300); }
    catch (e: any) { fail(e); } finally { setBusy(false); }
  };

  const finish = async (t: { accessToken: string; refreshToken: string; user: any }) => {
    await saveTokens({ accessToken: t.accessToken, refreshToken: t.refreshToken });
    useAuth.getState().setUser(t.user);
    const merged = await Api.mergeGuest().catch(() => undefined);
    navigation.replace('Welcome', { merged });
  };

  const verify = async () => {
    setErr(null); setBusy(true);
    try { await finish(await Api.verifyOtp(toE164(mobile), otp)); } catch (e: any) { fail(e); setOtp(''); } finally { setBusy(false); }
  };

  const google = async () => {
    setErr(null);
    try {
      await GoogleSignin.hasPlayServices();
      const r = await GoogleSignin.signIn();
      if (!isSuccessResponse(r) || !r.data.idToken) return;
      setBusy(true);
      const t = await Api.google(r.data.idToken);
      await saveTokens({ accessToken: t.accessToken, refreshToken: t.refreshToken });
      useAuth.getState().setUser(t.user);
      if (t.needsMobile) return navigation.replace('LinkMobile');
      await finish(t);
    } catch (e: any) { if (e?.code !== '12501' && e?.message) fail(e); } finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.overlay }}>
      <Animated.View style={{ transform: [{ translateY: drop }], maxHeight: '100%' }}>
      <ScrollView keyboardShouldPersistTaps="handled" bounces={false} style={{ flexGrow: 0 }}>
      <View style={{ backgroundColor: c.bg, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, padding: 18, paddingTop: insets.top + 14, paddingBottom: 20 }}>
        <Row><Txt v="h2" style={{ flex: 1 }}>{lockedSec ? 'Too many attempts' : 'Log in to continue'}</Txt><IconButton name="x" label="Close" size={14} onPress={() => navigation.goBack()} /></Row>
        {hold && <HoldTimer expiresAt={hold.expiresAt} label="Your selection is on hold" />}

        {lockedSec > 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 16 }}>
            <Icon name="lock" size={44} color={c.brand} />
            <Txt muted center style={{ marginTop: 8 }}>For your safety, login is locked for 15 minutes. Your selection stays on hold until its own timer ends.</Txt>
            <Txt v="title" color={c.brand} style={{ marginTop: 10 }}>{String(Math.floor(lockedSec / 60)).padStart(2, '0')}:{String(lockedSec % 60).padStart(2, '0')}</Txt>
            <Button title="Keep browsing as guest" variant="outline" onPress={() => navigation.goBack()} style={{ alignSelf: 'stretch', marginTop: 14 }} />
          </View>
        ) : step === 'mobile' ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: c.border, borderRadius: 14, paddingHorizontal: 12, height: 50, marginTop: 12, backgroundColor: c.surface }}>
              <Txt v="h3">🇮🇳 +91</Txt>
              <View style={{ width: 1, height: 22, backgroundColor: c.border }} />
              <TextInput value={mobile} onChangeText={(t) => setMobile(t.replace(/\D/g, '').slice(0, 10))} keyboardType="number-pad" maxLength={10}
                placeholder="Mobile number" placeholderTextColor={c.muted} style={{ flex: 1, color: c.text, fontSize: 15, fontWeight: '600', letterSpacing: 1 }}
                autoComplete="tel" textContentType="telephoneNumber" accessibilityLabel="Mobile number" />
            </View>
            {mobile.length === 10 && !!validateMobile(mobile) && <Txt v="xs" color={c.danger} style={{ marginTop: 4 }}>{validateMobile(mobile)}</Txt>}
            <Button title="Get OTP" loading={busy} disabled={!!validateMobile(mobile)} onPress={send} style={{ marginTop: 12 }} />
            <Row style={{ marginVertical: 16 }}><View style={{ flex: 1, height: 1, backgroundColor: c.border }} /><Txt v="small" muted>or</Txt><View style={{ flex: 1, height: 1, backgroundColor: c.border }} /></Row>
            <Pressable onPress={google} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 48, borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
              <Icon name="google" size={18} color="#4285F4" /><Txt v="h3">Continue with Google</Txt>
            </Pressable>
          </>
        ) : (
          <>
            <Txt muted style={{ marginTop: 8 }}>Code sent to <Txt bold>+91 {mobile}</Txt>  <Txt v="small" color={c.brand} onPress={() => { setStep('mobile'); setOtp(''); }}>Change</Txt></Txt>
            <Pressable onPress={() => otpRef.current?.focus()} style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', marginVertical: 18 }}>
              {Array.from({ length: 6 }).map((_, k) => (
                <View key={k} style={{ width: 42, height: 50, borderRadius: 12, borderWidth: 1.5, borderColor: k === otp.length ? c.brand : c.border, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface }}>
                  <Txt v="h2">{otp[k] ?? ''}</Txt>
                </View>
              ))}
            </Pressable>
            <TextInput ref={otpRef} value={otp} onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6}
              autoComplete="sms-otp" textContentType="oneTimeCode" style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }} accessibilityLabel="OTP" />
            <Button title="Verify & continue" loading={busy} disabled={otp.length !== 6} onPress={verify} />
            <Txt v="small" muted center style={{ marginTop: 10 }}>
              {resend > 0 ? `Resend code in 00:${String(resend).padStart(2, '0')}` : <Txt v="small" color={c.brand} onPress={send}>Resend code</Txt>}
            </Txt>
          </>
        )}
        {err && <Box kind="error" text={err} />}
        {!lockedSec && <Txt v="xs" muted center style={{ marginTop: 10 }}>{'Close to keep browsing as guest. Your selection is kept.'}</Txt>}
        <Row gap={4} style={{ justifyContent: 'center', marginTop: 6 }}><Icon name="lock" size={11} color={c.muted} /><Txt v="xs" muted>Secured · we never ask for a password</Txt></Row>
        <View style={{ width: 42, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginTop: 12 }} />
      </View>
      </ScrollView>
      </Animated.View>
      {/* tap the dimmed area below the sheet to close */}
      <Pressable style={{ flex: 1 }} onPress={() => navigation.goBack()} accessibilityLabel="Close login" />
    </View>
  );
}

/** Google users verify a mobile number once (needed for tickets & SMS). */
export function LinkMobileScreen({ navigation, route }: any) {
  useSecureScreen();
  const { c } = useTheme();
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const run = async (f: () => Promise<void>) => { setErr(null); setBusy(true); try { await f(); } catch (e: any) { setErr(e.message); } finally { setBusy(false); } };
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, padding: 20, paddingTop: 60 }}>
      <Icon name="phone" size={40} color={c.brand} />
      <Txt v="h1" style={{ marginTop: 12 }}>Add your mobile number</Txt>
      <Txt muted>We send tickets and trip alerts by SMS. One-time check.</Txt>
      <TextInput value={mobile} onChangeText={(t) => setMobile(t.replace(/\D/g, '').slice(0, 10))} keyboardType="number-pad" placeholder="10-digit mobile"
        placeholderTextColor={c.muted} style={{ borderWidth: 1.5, borderColor: c.border, borderRadius: 14, padding: 14, marginTop: 16, color: c.text, fontSize: 15, backgroundColor: c.surface }} />
      {!sent && mobile.length === 10 && !!validateMobile(mobile) && <Txt v="xs" color={c.danger} style={{ marginTop: 4 }}>{validateMobile(mobile)}</Txt>}
      {sent && <TextInput value={otp} onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" placeholder="6-digit code" autoComplete="sms-otp"
        placeholderTextColor={c.muted} style={{ borderWidth: 1.5, borderColor: c.border, borderRadius: 14, padding: 14, marginTop: 10, color: c.text, fontSize: 15, letterSpacing: 6, backgroundColor: c.surface }} />}
      {err && <Box kind="error" text={err} />}
      <Button style={{ marginTop: 16 }} loading={busy} title={sent ? 'Verify' : 'Send OTP'} disabled={sent ? otp.length !== 6 : !!validateMobile(mobile)}
        onPress={() => run(async () => {
          if (!sent) { await Api.sendOtp(toE164(mobile)); setSent(true); return; }
          const r = await Api.verifyOtp(toE164(mobile), otp);
          useAuth.getState().setUser(r.user);
          const merged = await Api.mergeGuest().catch(() => undefined);
          navigation.replace('Welcome', { merged, fromOnboarding: route?.params?.fromOnboarding });
        })} />
    </View>
  );
}
