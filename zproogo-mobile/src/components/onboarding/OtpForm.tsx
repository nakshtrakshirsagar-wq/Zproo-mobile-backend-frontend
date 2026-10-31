import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Country } from './countries';
import { colors, fonts, typography } from './theme';
import { OTP_LENGTH, onlyDigits } from './validation';

type Props = {
  country: Country;
  phone: string;
  /** seconds before "Resend OTP" is allowed (from the server's answer to "send OTP") */
  resendInSec: number;
  /** > 0 while login is locked after too many wrong codes */
  lockedSec: number;
  /** resolves true when the code was accepted (the screen is then left); false -> boxes are cleared */
  onVerify: (otp: string) => Promise<boolean>;
  /** resolves with the next resend delay in seconds, or null when sending failed */
  onResend: () => Promise<number | null>;
  onChangeNumber: () => void;
  verifying: boolean;
  error: string;
  clearError: () => void;
};

export default function OtpForm({ country, phone, resendInSec, lockedSec, onVerify, onResend, onChangeNumber, verifying, error, clearError }: Props) {
  const inputRef = useRef<TextInput>(null);
  const submittedRef = useRef('');
  const [otp, setOtp] = useState('');
  const [focused, setFocused] = useState(true);
  const [seconds, setSeconds] = useState(resendInSec);
  const locked = lockedSec > 0;

  useEffect(() => {
    if (seconds <= 0) return undefined;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  // Android SMS Retriever: auto-fill the code (the SMS template must end with the app hash). Silently skipped when unavailable.
  useEffect(() => {
    let remove: (() => void) | undefined;
    (async () => {
      try {
        const m = require('react-native-otp-verify');
        await m.startOtpListener((msg: string) => {
          const code = new RegExp(`(\\d{${OTP_LENGTH}})`).exec(msg ?? '')?.[1];
          if (code) setOtp(code);
        });
        remove = m.removeListener;
      } catch { /* not available on this device */ }
    })();
    return () => remove?.();
  }, []);

  const verify = async (code: string) => {
    const ok = await onVerify(code);
    if (!ok) { submittedRef.current = ''; setOtp(''); inputRef.current?.focus(); }
  };

  // auto-submit once all digits are typed
  useEffect(() => {
    if (otp.length === OTP_LENGTH && submittedRef.current !== otp && !verifying && !locked) {
      submittedRef.current = otp;
      verify(otp);
    }
    if (otp.length < OTP_LENGTH) submittedRef.current = '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, verifying, locked]);

  const change = (text: string) => {
    if (error) clearError();
    setOtp(onlyDigits(text).slice(0, OTP_LENGTH));
  };

  const resend = async () => {
    if (seconds > 0 || locked) return;
    setOtp('');
    const next = await onResend();
    if (next != null) setSeconds(next);
    inputRef.current?.focus();
  };

  const boxes = [];
  for (let i = 0; i < OTP_LENGTH; i += 1) {
    const active = focused && (i === otp.length || (i === OTP_LENGTH - 1 && otp.length === OTP_LENGTH));
    boxes.push(
      <View key={i} style={[styles.box, active && styles.boxActive, !!error && styles.boxError]}>
        <Text style={styles.boxText}>{otp[i] || ''}</Text>
      </View>,
    );
  }

  const mm = String(Math.floor(lockedSec / 60)).padStart(2, '0');
  const ss = String(lockedSec % 60).padStart(2, '0');

  return (
    <View>
      <Text style={[typography.header, styles.title]}>Verify your number</Text>
      <Text style={[typography.body, styles.sub]}>
        Enter the {OTP_LENGTH}-digit OTP sent to <Text style={styles.phone}>{`${country.dial} ${phone}`}</Text>
      </Text>

      <Pressable onPress={() => inputRef.current?.focus()} style={styles.boxRow}>
        {boxes}
        <TextInput
          ref={inputRef}
          value={otp}
          onChangeText={change}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          autoFocus
          caretHidden
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          editable={!verifying && !locked}
          accessibilityLabel="OTP"
          style={styles.hiddenInput}
        />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {locked ? <Text style={styles.error}>{`Try again in ${mm}:${ss}`}</Text> : null}

      <Pressable
        onPress={() => verify(otp)}
        disabled={verifying || locked || otp.length !== OTP_LENGTH}
        accessibilityRole="button"
        style={({ pressed }) => [styles.primaryBtn, (pressed || verifying || locked || otp.length !== OTP_LENGTH) && { opacity: 0.6 }]}
      >
        {verifying ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Verify & Continue</Text>}
      </Pressable>

      <View style={styles.footer}>
        <Pressable onPress={onChangeNumber} hitSlop={10} accessibilityRole="button">
          <Text style={styles.link}>Change number</Text>
        </Pressable>
        <Pressable onPress={resend} disabled={seconds > 0 || locked} hitSlop={10} accessibilityRole="button">
          <Text style={[styles.link, (seconds > 0 || locked) && { color: colors.muted }]}>
            {seconds > 0 ? `Resend OTP in ${seconds}s` : 'Resend OTP'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, lineHeight: 30, color: colors.ink },
  sub: { color: colors.muted, marginTop: 6 },
  phone: { fontFamily: fonts.medium, color: colors.ink },
  boxRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  box: { width: 46, height: 56, borderRadius: 12, borderWidth: 1.5, borderColor: colors.divider, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  boxActive: { borderColor: colors.inputBorder },
  boxError: { borderColor: colors.error },
  boxText: { fontFamily: fonts.headerBold, fontSize: 22, color: colors.ink },
  hiddenInput: { position: 'absolute', width: '100%', height: '100%', opacity: 0 },
  error: { ...typography.label, color: colors.error, marginTop: 10 },
  primaryBtn: { marginTop: 20, height: 52, borderRadius: 26, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontFamily: fonts.headerBold, fontSize: 16, color: '#fff' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  link: { fontFamily: fonts.medium, fontSize: 14, color: colors.red },
});
