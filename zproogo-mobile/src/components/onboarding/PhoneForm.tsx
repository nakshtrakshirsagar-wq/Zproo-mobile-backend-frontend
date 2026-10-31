import React from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import GoogleButton from './GoogleButton';
import type { Country } from './countries';
import { colors, fonts, typography } from './theme';
import { PRIVACY_URL, TERMS_URL } from './validation';

type Props = {
  country: Country;
  phone: string;
  onChangePhone: (t: string) => void;
  onBlurPhone: () => void;
  onOpenCountry: () => void;
  onSubmit: () => void;
  onGoogle: () => void;
  phoneError: string;
  formError: string;
  sending: boolean;
  googleLoading: boolean;
};

export default function PhoneForm({ country, phone, onChangePhone, onBlurPhone, onOpenCountry, onSubmit, onGoogle, phoneError, formError, sending, googleLoading }: Props) {
  const busy = sending || googleLoading;
  return (
    <View>
      <Text style={[typography.header, styles.title]}>Log in or create a new account</Text>

      <View style={[styles.inputRow, !!phoneError && styles.inputRowError]}>
        <Pressable onPress={onOpenCountry} style={styles.codeBox} disabled={busy} accessibilityRole="button" accessibilityLabel="Choose country code">
          <Text style={styles.codeLabel}>Country Code</Text>
          <View style={styles.codeValueRow}>
            <Text style={styles.codeValue}>{country.dial}</Text>
            <View style={styles.caret} />
          </View>
        </Pressable>
        <View style={styles.divider} />
        <TextInput
          value={phone}
          onChangeText={onChangePhone}
          onBlur={onBlurPhone}
          onSubmitEditing={onSubmit}
          placeholder="Mobile number"
          placeholderTextColor={colors.placeholder}
          keyboardType="phone-pad"
          maxLength={country.max}
          returnKeyType="done"
          autoComplete="tel"
          textContentType="telephoneNumber"
          editable={!busy}
          accessibilityLabel="Mobile number"
          style={styles.phoneInput}
        />
      </View>
      {phoneError ? <Text style={styles.error}>{phoneError}</Text> : null}

      <Pressable
        onPress={onSubmit}
        disabled={busy}
        accessibilityRole="button"
        style={({ pressed }) => [styles.primaryBtn, (pressed || busy) && { opacity: 0.85 }]}
      >
        {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Get OTP</Text>}
      </Pressable>

      <View style={styles.orRow}>
        <View style={styles.orLine} />
        <Text style={styles.orText}>or</Text>
        <View style={styles.orLine} />
      </View>

      <GoogleButton onPress={onGoogle} loading={googleLoading} disabled={sending} />

      {formError ? <Text style={[styles.error, { textAlign: 'center', marginTop: 12 }]}>{formError}</Text> : null}

      <Text style={styles.terms}>
        By continuing, you agree to our{' '}
        <Text style={styles.link} onPress={() => Linking.openURL(TERMS_URL).catch(() => undefined)}>Terms of Use</Text>
        {' '}&{' '}
        <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL).catch(() => undefined)}>Privacy Policy</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, lineHeight: 26, color: colors.ink, marginBottom: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'stretch', height: 52, borderRadius: 12, borderWidth: 1.5, borderColor: colors.inputBorder, backgroundColor: '#fff', overflow: 'hidden' },
  inputRowError: { borderColor: colors.error },
  codeBox: { width: 112, paddingHorizontal: 14, justifyContent: 'center' },
  codeLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  codeValueRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  codeValue: { fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
  caret: { marginLeft: 8, width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: colors.ink },
  divider: { width: 1.5, backgroundColor: colors.inputBorder },
  phoneInput: { flex: 1, paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 17, color: colors.ink },
  error: { ...typography.label, color: colors.error, marginTop: 6 },
  primaryBtn: { marginTop: 10, height: 46, borderRadius: 23, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontFamily: fonts.headerBold, fontSize: 16, color: '#fff' },
  orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  orLine: { flex: 1, height: 1, backgroundColor: colors.divider },
  orText: { ...typography.body, marginHorizontal: 14, color: colors.ink },
  terms: { ...typography.label, color: colors.muted, textAlign: 'center', marginTop: 8 },
  link: { color: colors.red, fontFamily: fonts.medium },
});
