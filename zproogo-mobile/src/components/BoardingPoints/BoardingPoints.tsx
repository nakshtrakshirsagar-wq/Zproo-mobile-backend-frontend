import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Point } from '../../api/endpoints';
import { useBusUi } from '../BusResult/busResultTheme';
import { type, ui as uiFont } from '../../theme/typography';
import { time24 } from '../../utils/format';

const PRIMARY = '#E11D2E';
export type PointTab = 'board' | 'drop';

export type BoardingPointsProps = {
  boarding: Point[];
  dropping: Point[];
  boardingId?: string;
  droppingId?: string;
  onChangeBoarding: (id: string) => void;
  onChangeDropping: (id: string) => void;
  /** Women mode: shows "Safest" / "Well-lit" tags on pickup points. */
  women?: boolean;
  /** Start on this tab (default: boarding). */
  initialTab?: PointTab;
  /** After a boarding point is picked, jump to the dropping tab (default true). */
  autoAdvance?: boolean;
};

/**
 * Boarding & dropping point picker - "Design 1 - Tabs list": two tabs showing the current choice, one list of points with
 * time, name, address and a radio. Stateless about the selection (the parent keeps the ids); it only remembers the open tab.
 *
 *   <BoardingPoints boarding={b} dropping={d} boardingId={bid} droppingId={did} onChangeBoarding={setBid} onChangeDropping={setDid} />
 */
export function BoardingPoints({ boarding, dropping, boardingId, droppingId, onChangeBoarding, onChangeDropping, women, initialTab = 'board', autoAdvance = true }: BoardingPointsProps) {
  const ui = useBusUi();
  const [tab, setTab] = useState<PointTab>(initialTab);
  useEffect(() => setTab(initialTab), [initialTab]);
  const soft = ui.isDark ? 'rgba(225,29,46,0.16)' : '#FDECEE';
  const tabOn = ui.isDark ? 'rgba(225,29,46,0.10)' : '#FFF8F8';

  const list = tab === 'board' ? boarding : dropping;
  const cur = tab === 'board' ? boardingId : droppingId;
  const b = boarding.find((p) => p.id === boardingId), d = dropping.find((p) => p.id === droppingId);

  const pick = (id: string) => {
    if (tab === 'board') { onChangeBoarding(id); if (autoAdvance) setTab('drop'); } else onChangeDropping(id);
  };

  const tabBtn = (key: PointTab, label: string, value?: string) => {
    const on = tab === key;
    return (
      <Pressable key={key} onPress={() => setTab(key)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={`${label}: ${value ?? 'not selected'}`}
        style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 18, backgroundColor: on ? tabOn : ui.surface, borderBottomWidth: 3, borderBottomColor: on ? PRIMARY : 'transparent' }}>
        <Text style={{ ...type('label', 12), letterSpacing: 0.4, textTransform: 'uppercase', color: on ? PRIMARY : ui.muted }}>{label}</Text>
        <Text numberOfLines={1} style={{ ...type('listTitle'), color: ui.ink, marginTop: 3 }}>{value ?? 'Select'}</Text>
      </Pressable>
    );
  };

  return (
    <View style={{ backgroundColor: ui.surface, borderWidth: 1, borderColor: ui.line, borderRadius: 16, overflow: 'hidden' }}>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: ui.line }}>
        {tabBtn('board', 'Boarding point', b?.name)}
        {tabBtn('drop', 'Dropping point', d?.name)}
      </View>
      {list.length === 0 && <Text style={{ ...type('body'), color: ui.muted, padding: 18 }}>No points available.</Text>}
      {list.map((p, i) => {
        const sel = cur === p.id;
        const tag = women && tab === 'board' ? (p.safest ? 'Safest' : p.wellLit ? 'Well-lit' : undefined) : undefined;
        return (
          <Pressable key={p.id} onPress={() => pick(p.id)} accessibilityRole="radio" accessibilityState={{ selected: sel, checked: sel }}
            accessibilityLabel={`${p.name}, ${time24(p.time)}, ${p.address}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 18, backgroundColor: sel ? soft : 'transparent',
              borderBottomWidth: i === list.length - 1 ? 0 : 1, borderBottomColor: ui.line }}>
            <Text style={{ ...uiFont('medium'), fontSize: 14, color: ui.ink, width: 52 }}>{time24(p.time)}</Text>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text numberOfLines={1} style={{ ...type('listTitle'), color: ui.ink, flexShrink: 1 }}>{p.name}</Text>
                {!!tag && <View style={{ paddingVertical: 1, paddingHorizontal: 7, borderRadius: 6, backgroundColor: ui.ratingBg }}><Text style={{ ...type('label', 12), color: ui.ratingFg }}>{tag}</Text></View>}
              </View>
              <Text style={{ ...type('label', 12), color: ui.muted, marginTop: 2, lineHeight: 17 }}>{p.address}</Text>
            </View>
            <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: sel ? PRIMARY : '#C4C8CF', alignItems: 'center', justifyContent: 'center' }}>
              {sel && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: PRIMARY }} />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
