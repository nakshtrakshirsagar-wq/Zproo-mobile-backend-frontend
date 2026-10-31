import React from 'react';
import { Text, View } from 'react-native';
import { ui } from '../theme/typography';
import { useToast } from '../utils/toast';

export function ToastHost() {
  const { msg, kind } = useToast();
  if (!msg) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 20, right: 20, bottom: 90, alignItems: 'center' }}>
      <View style={{ backgroundColor: kind === 'error' ? '#BE123C' : kind === 'success' ? '#1F7A52' : '#0B1F3A', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12, elevation: 6 }}>
        <Text style={{ color: '#fff', ...ui('medium'), fontSize: 13, textAlign: 'center' }}>{msg}</Text>
      </View>
    </View>
  );
}
