import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BusTrip } from '../../api/endpoints';
import { Icon } from '../Icon';
import { duration } from '../../utils/format';
import { FONT, type } from '../../theme/typography';
import { useBusUi } from '../BusResult/busResultTheme';
import { FilterSection } from './FilterSection';
import { RangeSlider } from './RangeSlider';
import { applyFilters, FilterMeta, optionHasMatch } from './applyFilters';
import {
  AC_OPTIONS, BusFilters, ListField, makeEmptyFilters, MAKE_OPTIONS, POPULAR_OPTIONS, RATING_OPTIONS, SEAT_TYPE_OPTIONS, SEATS_OPTIONS, SLOT_TILES,
} from './filterConfig';

type Props = {
  visible: boolean;
  /** All buses of the search (before filtering) - used for the live result count and to dim options with no match. */
  trips: BusTrip[];
  meta: FilterMeta;
  applied: BusFilters;
  onApply: (f: BusFilters) => void;
  onClose: () => void;
};

const inr = (rupees: number) => '₹ ' + Math.round(rupees).toLocaleString('en-IN');

/**
 * Filter page that slides up from the bottom. Changes are kept in a draft and only applied with the
 * button at the bottom ("Show N buses"); closing the sheet discards them.
 */
export function BusFilterSheet({ visible, trips, meta, applied, onApply, onClose }: Props) {
  const ui = useBusUi();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<BusFilters>(applied);
  useEffect(() => { if (visible) setDraft(applied); }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const count = useMemo(() => applyFilters(trips, draft).length, [trips, draft]);
  const toggle = (field: ListField, key: string) => setDraft((d) => ({ ...d, [field]: d[field].includes(key) ? d[field].filter((x) => x !== key) : [...d[field], key] }));
  const n = (field: ListField) => draft[field].length;

  const renderChecks = (field: ListField, options: { key: string; label: string }[]) => (
    <View>
      {options.map((o) => {
        const on = draft[field].includes(o.key);
        const dead = !on && !optionHasMatch(trips, field, o.key);
        return (
          <Pressable key={o.key} onPress={() => !dead && toggle(field, o.key)} accessibilityRole="checkbox" accessibilityState={{ checked: on, disabled: dead }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, opacity: dead ? 0.4 : 1 }}>
            <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: on ? ui.red : '#9CA3AF', backgroundColor: on ? ui.red : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {on && <Icon name="check" size={12} color="#fff" strokeWidth={3} />}
            </View>
            <Text style={{ ...type('body'), color: ui.ink, flex: 1 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderTiles = (field: 'depSlots' | 'arrSlots') => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {SLOT_TILES.map((t) => {
        const on = draft[field].includes(t.key);
        return (
          <Pressable key={t.key} onPress={() => toggle(field, t.key)} accessibilityRole="button" accessibilityState={{ selected: on }}
            style={{ width: '48%', borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', borderColor: on ? ui.red : ui.line, backgroundColor: on ? ui.redTint : 'transparent' }}>
            <Text style={{ fontFamily: FONT.uiSemi, fontSize: 13, color: on ? ui.redDark : ui.ink }}>{t.title}</Text>
            <Text style={{ ...type('label'), color: on ? ui.redDark : ui.muted }}>{t.sub}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const fareVal = draft.fareMax ?? meta.fareMax, durVal = draft.durationMax ?? meta.durMax;
  const fareOn = draft.fareMax !== null && draft.fareMax < meta.fareMax, durOn = draft.durationMax !== null && draft.durationMax < meta.durMax;
  const asOptions = (a: string[]) => a.map((k) => ({ key: k, label: k }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(6,17,31,0.5)' }} onPress={onClose} accessibilityLabel="Close filters" />
        <View style={{ height: '88%', backgroundColor: ui.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' }}>
          {/* header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
            <Text style={{ ...type('subHeader'), color: ui.ink, flex: 1 }}>Filters</Text>
            <Pressable onPress={() => setDraft(makeEmptyFilters())} hitSlop={10} accessibilityRole="button">
              <Text style={{ fontFamily: FONT.uiSemi, fontSize: 13, color: ui.red }}>Clear all</Text>
            </Pressable>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close" style={{ marginLeft: 16 }}><Icon name="x" size={20} color={ui.muted} /></Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
            <FilterSection title="Popular filters" count={n('popular')} defaultOpen>{renderChecks('popular', POPULAR_OPTIONS)}</FilterSection>

            {meta.fareMax > meta.fareMin && (
              <FilterSection title="Fare" count={fareOn ? 1 : 0} defaultOpen>
                <Text style={{ fontFamily: FONT.uiSemi, fontSize: 14, color: ui.ink, marginBottom: 2 }}>Up to {inr(fareVal)}</Text>
                <RangeSlider min={meta.fareMin} max={meta.fareMax} step={10} value={fareVal} color={ui.red} trackColor={ui.line}
                  onChange={(v) => setDraft((d) => ({ ...d, fareMax: v >= meta.fareMax ? null : v }))} />
              </FilterSection>
            )}

            <FilterSection title="A/C type" count={n('acTypes')} defaultOpen>{renderChecks('acTypes', AC_OPTIONS)}</FilterSection>
            <FilterSection title="Seat type" count={n('seatTypes')} defaultOpen>{renderChecks('seatTypes', SEAT_TYPE_OPTIONS)}</FilterSection>
            <FilterSection title="Departure time" count={n('depSlots')} defaultOpen>{renderTiles('depSlots')}</FilterSection>
            <FilterSection title="Arrival time" count={n('arrSlots')}>{renderTiles('arrSlots')}</FilterSection>

            {meta.durMax > meta.durMin && (
              <FilterSection title="Journey duration" count={durOn ? 1 : 0}>
                <Text style={{ fontFamily: FONT.uiSemi, fontSize: 14, color: ui.ink, marginBottom: 2 }}>Up to {duration(durVal)}</Text>
                <RangeSlider min={meta.durMin} max={meta.durMax} step={5} value={durVal} color={ui.red} trackColor={ui.line}
                  onChange={(v) => setDraft((d) => ({ ...d, durationMax: v >= meta.durMax ? null : v }))} />
              </FilterSection>
            )}

            {!!meta.operators.length && <FilterSection title="Bus operators" count={n('operators')} defaultOpen>{renderChecks('operators', asOptions(meta.operators))}</FilterSection>}
            <FilterSection title="User rating" count={n('ratings')}>{renderChecks('ratings', RATING_OPTIONS)}</FilterSection>
            <FilterSection title="Bus make" count={n('makes')}>{renderChecks('makes', MAKE_OPTIONS)}</FilterSection>
            {!!meta.boarding.length && <FilterSection title="Boarding points" count={n('boarding')}>{renderChecks('boarding', asOptions(meta.boarding))}</FilterSection>}
            {!!meta.dropping.length && <FilterSection title="Dropping points" count={n('dropping')}>{renderChecks('dropping', asOptions(meta.dropping))}</FilterSection>}
            <FilterSection title="Amenities" count={n('amenities')}>{renderChecks('amenities', meta.amenities)}</FilterSection>
            <FilterSection title="Seats available" count={n('seats')}>{renderChecks('seats', SEATS_OPTIONS)}</FilterSection>
          </ScrollView>

          {/* bottom button */}
          <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12), borderTopWidth: 1, borderTopColor: ui.line, backgroundColor: ui.surface }}>
            <Pressable disabled={count === 0} onPress={() => { onApply(draft); onClose(); }} accessibilityRole="button"
              style={({ pressed }) => ({ height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: count === 0 ? '#9CA3AF' : ui.red, opacity: pressed ? 0.85 : 1 })}>
              <Text style={{ fontFamily: FONT.uiSemi, fontSize: 15, color: '#fff' }}>{count === 0 ? 'No buses match' : `Show ${count} ${count === 1 ? 'bus' : 'buses'}`}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
