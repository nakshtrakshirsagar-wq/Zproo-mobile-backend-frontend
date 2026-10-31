import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OnboardingSlider from './OnboardingSlider';
import PhoneForm from './PhoneForm';
import OtpForm from './OtpForm';
import CountryPickerModal from './CountryPickerModal';
import { Country, DEFAULT_COUNTRY } from './countries';
import { colors } from './theme';
import { onlyDigits, validatePhone, validateOtp } from './validation';
import { AuthResult, sendOtp, signInWithGoogle, toFailure, verifyOtp } from './authService';

const WAVE_CLEARANCE = 58; // keeps the headline above the wave

export type { AuthResult } from './authService';

type Props = {
  /** "Skip" pressed - continue as a guest */
  onSkip: () => void;
  /** logged in (tokens are already saved and the user is already in the auth store) */
  onAuthSuccess: (result: AuthResult) => void;
};

/**
 * First-launch screen: image slider on top (65%), "log in or create account" below (35%).
 * Replaces the old 3 onboarding pages. Phone OTP + Google both go through the app's real API (src/api/endpoints.ts).
 */
export default function OnboardingAuth({ onSkip, onAuthSuccess }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [formError, setFormError] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [resendInSec, setResendInSec] = useState(30);
  const [lockedSec, setLockedSec] = useState(0);
  const [panelH, setPanelH] = useState(0); // measured height of the login panel (phone step) -> image takes the rest
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // Android back button on the OTP step goes back to the phone step instead of closing the app.
  useEffect(() => {
    if (step !== 'otp') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setOtpError(''); setStep('phone'); return true; });
    return () => sub.remove();
  }, [step]);

  // countdown for the "too many attempts" lock
  useEffect(() => {
    if (lockedSec <= 0) return undefined;
    const t = setTimeout(() => setLockedSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [lockedSec]);

  const styles = useMemo(() => makeStyles(height), [height]);
  const topInset = (insets.top || (Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 44)) + 10;
  // Image fills whatever the login panel leaves, so the whole screen always fits without scrolling.
  const panelGuess = Math.round(height * 0.42);
  const heroHeight = Math.max(Math.round(height * 0.28), height - (panelH || panelGuess));

  const changePhone = (text: string) => {
    setPhone(onlyDigits(text));
    if (phoneError) setPhoneError('');
    if (formError) setFormError('');
  };

  const selectCountry = (c: Country) => {
    setCountry(c);
    setPickerOpen(false);
    setPhone((p) => p.slice(0, c.max));
    setPhoneError('');
  };

  const handleSendOtp = async () => {
    if (sending || googleLoading) return;
    Keyboard.dismiss();
    const err = validatePhone(country, phone);
    if (err) { setPhoneError(err); return; }
    setSending(true);
    setFormError('');
    try {
      setResendInSec(await sendOtp(country, phone));
      setOtpError('');
      setStep('otp');
    } catch (e) {
      const f = toFailure(e);
      if (f.lockedSec) setLockedSec(f.lockedSec);
      if (f.resendInSec) { setResendInSec(f.resendInSec); setOtpError(''); setStep('otp'); }
      else setFormError(f.message);
    } finally {
      if (mounted.current) setSending(false);
    }
  };

  const handleResend = async (): Promise<number | null> => {
    try {
      const sec = await sendOtp(country, phone);
      setOtpError('');
      return sec;
    } catch (e) {
      const f = toFailure(e);
      if (f.lockedSec) setLockedSec(f.lockedSec);
      setOtpError(f.message);
      return f.resendInSec ?? null;
    }
  };

  const handleVerify = useCallback(
    async (otp: string): Promise<boolean> => {
      const err = validateOtp(otp);
      if (err) { setOtpError(err); return false; }
      setVerifying(true);
      setOtpError('');
      try {
        const result = await verifyOtp(country, phone, otp);
        onAuthSuccess(result);
        return true;
      } catch (e) {
        const f = toFailure(e);
        if (f.lockedSec) setLockedSec(f.lockedSec);
        setOtpError(f.message);
        return false;
      } finally {
        if (mounted.current) setVerifying(false);
      }
    },
    [country, phone, onAuthSuccess],
  );

  const handleGoogle = async () => {
    if (sending || googleLoading) return;
    Keyboard.dismiss();
    setFormError('');
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result) onAuthSuccess(result); // null = the person cancelled the Google sheet
    } catch (e) {
      setFormError(toFailure(e).message);
    } finally {
      if (mounted.current) setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView
        bounces={false}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={keyboardOpen || step === 'otp'}
      >
        <OnboardingSlider
          width={width}
          height={heroHeight}
          topInset={topInset}
          bottomClearance={WAVE_CLEARANCE}
          paused={keyboardOpen || step === 'otp'}
          onSkip={onSkip}
        />

        <View
          style={styles.panel}
          onLayout={(e) => { if (step === 'phone') { const h = Math.round(e.nativeEvent.layout.height); if (Math.abs(h - panelH) > 1) setPanelH(h); } }}
        >
          {step === 'phone' ? (
            <PhoneForm
              country={country}
              phone={phone}
              onChangePhone={changePhone}
              onBlurPhone={() => phone && setPhoneError(validatePhone(country, phone))}
              onOpenCountry={() => setPickerOpen(true)}
              onSubmit={handleSendOtp}
              onGoogle={handleGoogle}
              phoneError={phoneError}
              formError={formError}
              sending={sending}
              googleLoading={googleLoading}
            />
          ) : (
            <OtpForm
              country={country}
              phone={phone}
              resendInSec={resendInSec}
              lockedSec={lockedSec}
              onVerify={handleVerify}
              onResend={handleResend}
              onChangeNumber={() => { setOtpError(''); setStep('phone'); }}
              verifying={verifying}
              error={otpError}
              clearError={() => setOtpError('')}
            />
          )}
        </View>
      </ScrollView>

      <CountryPickerModal visible={pickerOpen} selected={country} onSelect={selectCountry} onClose={() => setPickerOpen(false)} />
    </KeyboardAvoidingView>
  );
}

const makeStyles = (height: number) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scrollContent: { flexGrow: 1 },
    panel: {
      // natural height (no fixed 35%) so the content never gets pushed below the screen
      paddingHorizontal: 24,
      paddingTop: 4,
      paddingBottom: Math.max(12, Math.round(height * 0.02)),
      backgroundColor: colors.bg,
    },
  });
