import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COUNTRIES, Country } from './countries';
import { colors, typography } from './theme';

type Props = { visible: boolean; selected: Country; onSelect: (c: Country) => void; onClose: () => void };

export default function CountryPickerModal({ visible, selected, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.code.toLowerCase() === q);
  }, [query]);

  const close = () => { setQuery(''); onClose(); };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close} transparent={false}>
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Text style={[typography.subHeader, { color: colors.ink }]}>Select country</Text>
          <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
            <Text style={styles.close}>{'\u2715'}</Text>
          </Pressable>
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search country or code"
          placeholderTextColor={colors.placeholder}
          style={styles.search}
          autoCorrect={false}
        />
        <FlatList
          data={data}
          keyExtractor={(c) => c.code}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={styles.empty}>No country found</Text>}
          renderItem={({ item }) => {
            const active = item.code === selected.code;
            return (
              <Pressable onPress={() => { setQuery(''); onSelect(item); }} style={[styles.row, active && styles.rowActive]}>
                <Text style={styles.flag}>{item.flag}</Text>
                <Text style={[typography.listTitle, styles.name]}>{item.name}</Text>
                <Text style={[typography.listDetail, { color: colors.muted }]}>{item.dial}</Text>
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  close: { fontSize: 20, color: colors.ink },
  search: { ...typography.body, marginHorizontal: 20, marginBottom: 8, paddingHorizontal: 14, height: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.divider, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  rowActive: { backgroundColor: colors.bg },
  flag: { fontSize: 22, marginRight: 14 },
  name: { flex: 1, color: colors.ink },
  empty: { ...typography.body, textAlign: 'center', marginTop: 30, color: colors.muted },
});
