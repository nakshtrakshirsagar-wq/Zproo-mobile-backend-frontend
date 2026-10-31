import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts } from './theme';

type Props = { onPress: () => void; loading?: boolean; disabled?: boolean };

export default function GoogleButton({ onPress, loading, disabled }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel="Sign in with Google"
      style={({ pressed }) => [styles.btn, (pressed || disabled) && { opacity: 0.7 }]}
    >
      {loading ? (
        <ActivityIndicator color={colors.ink} />
      ) : (
        <>
          <Image source={require('../../assets/onboarding/google-g.png')} style={styles.icon} />
          <Text style={styles.text}>Sign in with Google</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { height: 46, borderRadius: 23, borderWidth: 1.5, borderColor: colors.inputBorder, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  icon: { width: 22, height: 22, marginRight: 12 },
  text: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
});
