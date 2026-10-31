import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { SecurityNative } from './native';

/** Blocks screenshots / screen recording while the screen is focused (OTP, payment, passport, wallet, tickets). */
export function useSecureScreen() {
  useFocusEffect(useCallback(() => {
    SecurityNative?.setSecure(true);
    return () => SecurityNative?.setSecure(false);
  }, []));
}
