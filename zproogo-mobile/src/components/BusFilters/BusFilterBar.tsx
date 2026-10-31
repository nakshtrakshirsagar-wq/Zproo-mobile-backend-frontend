import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Icon } from '../Icon';
import { FONT } from '../../theme/typography';
import { useBusUi } from '../BusResult/busResultTheme';
import type { BusFilters } from './filterConfig';

type Props = {
  filters: BusFilters;
  activeCount: number;
  onOpenFilter: () => void;
  onOpenSort: () => void;
  /** Quick chips flip the same state the filter sheet edits. */
  onQuick: (chip: 'ac' | 'sleeper' | 'seater' | 'night') => void;
  sortLabel?: string;
};

const QUICK = [
  { key: 'ac', label: 'AC', on: (f: BusFilters) => f.acTypes.includes('ac') },
  { key: 'sleeper', label: 'Sleeper', on: (f: BusFilters) => f.seatTypes.includes('Sleeper') },
  { key: 'seater', label: 'Seater', on: (f: BusFilters) => f.seatTypes.includes('Seater') },
  { key: 'night', label: 'Night', on: (f: BusFilters) => f.depSlots.includes('night') },
] as const;

/** Row under the header: Sort + Filters buttons, then the quick chips (AC / Sleeper / Seater / Night). */
export function BusFilterBar({ filters, activeCount, onOpenFilter, onOpenSort, onQuick, sortLabel }: Props) {
  const ui = useBusUi();
  const btn = (icon: 'sort' | 'filter', label: string, onPress: () => void, on?: boolean, badge?: number) => (
    <Pressable key={label} onPress={onPress} accessibilityRole="button"
      style={{ height: 34, paddingHorizontal: 14, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: on ? 1.5 : 1, borderColor: on ? ui.red : ui.line, backgroundColor: on ? ui.redTint : ui.surface }}>
      <Icon name={icon} size={14} color={on ? ui.red : ui.body} />
      <Text style={{ fontFamily: FONT.uiMedium, fontSize: 13, color: on ? ui.red : ui.body }}>{label}</Text>
      {!!badge && <View style={{ backgroundColor: ui.red, borderRadius: 9, minWidth: 18, height: 18, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: FONT.uiSemi, fontSize: 11, color: '#fff' }}>{badge}</Text></View>}
    </Pressable>
  );
  return (
    <View style={{ paddingTop: 16 }}>
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16 }}>
        {btn('sort', sortLabel ?? 'Sort', onOpenSort, !!sortLabel && sortLabel !== 'Sort')}
        {btn('filter', 'Filter', onOpenFilter, activeCount > 0, activeCount)}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingTop: 12 }}>
        {QUICK.map((q) => {
          const on = q.on(filters);
          return (
            <Pressable key={q.key} onPress={() => onQuick(q.key)} accessibilityRole="button" accessibilityState={{ selected: on }}
              style={{ height: 34, paddingHorizontal: 16, borderRadius: 999, justifyContent: 'center', borderWidth: on ? 1.5 : 1, borderColor: on ? ui.red : ui.line, backgroundColor: on ? ui.redTint : ui.surface }}>
              <Text style={{ fontFamily: FONT.uiMedium, fontSize: 13, color: on ? ui.red : ui.body }}>{q.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
