import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Sheet } from '../ui';
import { type } from '../../theme/typography';
import { useBusUi } from '../BusResult/busResultTheme';
import { SORT_OPTIONS, SortKey } from './filterConfig';

/** "Sort by" bottom sheet. Picking an option applies it and closes the sheet. */
export function BusSortSheet({ visible, value, onPick, onClose }: { visible: boolean; value: SortKey; onPick: (k: SortKey) => void; onClose: () => void }) {
  const ui = useBusUi();
  return (
    <Sheet visible={visible} onClose={onClose} title="Sort by">
      {SORT_OPTIONS.map((o) => (
        <Pressable key={o.key} onPress={() => { onPick(o.key); onClose(); }} accessibilityRole="radio" accessibilityState={{ selected: value === o.key }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 }}>
          <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: value === o.key ? 6 : 2, borderColor: value === o.key ? ui.red : ui.line }} />
          <Text style={{ ...type(value === o.key ? 'listTitle' : 'body'), color: ui.ink }}>{o.label}</Text>
        </Pressable>
      ))}
    </Sheet>
  );
}
