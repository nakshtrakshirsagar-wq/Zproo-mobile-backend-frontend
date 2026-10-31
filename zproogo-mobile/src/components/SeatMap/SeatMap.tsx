import React, { memo, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { type } from '../../theme/typography';
import { rupees } from '../../utils/format';
import { Armchair, Steering, Woman } from './SeatIcons';
import { SeatUi, useSeatUi } from './seatMapTheme';
import type { DeckName, SeatMapDeck, SeatMapSeat } from './types';

const DECK_LABEL: Record<DeckName, string> = { LOWER: 'Lower deck', UPPER: 'Upper deck' };
const COL_GAP = 4;
const CELL_W = 40; // 2.5rem in the prototype (full size; shrinks when two decks sit side by side)

export type SeatMapProps = {
  decks: SeatMapDeck[];
  /** Seat numbers that are currently selected. */
  selected: string[];
  /** Called when an available seat is tapped. The parent owns the selection (so it can enforce a max, show prices, etc.). */
  onToggle?: (seat: SeatMapSeat) => void;
  /** Hide the legend (e.g. when it is shown somewhere else). */
  showLegend?: boolean;
  /** Display only (no taps) - e.g. to show the seats of an existing booking. */
  readOnly?: boolean;
  /** Pass a different heading for each deck if needed. */
  deckLabels?: Partial<Record<DeckName, string>>;
};

export const seatLabel = (seat: SeatMapSeat, selected: boolean) => {
  const kind = seat.kind === 'SLEEPER' ? 'Sleeper' : 'Seat';
  const state = !seat.available ? 'booked' : selected ? 'selected' : 'available';
  return `${kind} ${seat.number}, ${seat.deck.toLowerCase()} deck, ${rupees(seat.pricePaise)}${seat.ladiesOnly ? ', reserved for women' : ''}, ${state}`;
};

// ---------------------------------------------------------------- one seat
type CellProps = { seat: SeatMapSeat; selected: boolean; onPress?: (s: SeatMapSeat) => void; c: SeatUi; disabled: boolean; cw: number };

const SeaterButton = memo(function SeaterButton({ seat, selected, onPress, c, disabled, cw }: CellProps) {
  const sz = Math.min(32, cw);
  const k = sz / 32;
  const booked = !seat.available;
  const stroke = selected ? c.primary : booked ? c.stone300 : seat.ladiesOnly ? c.pink500 : c.success;
  const fill = selected ? c.primary : booked ? c.bookedFill : 'none';
  const womanColor = booked ? c.pink300 : c.pink500;
  return (
    <Pressable
      onPress={() => onPress?.(seat)} disabled={booked || disabled} accessibilityRole="button" accessibilityLabel={seatLabel(seat, selected)}
      accessibilityState={{ selected, disabled: booked }}
      style={({ pressed }) => ({ width: sz, height: sz, borderRadius: 6, alignItems: 'center', justifyContent: 'center',
        backgroundColor: pressed && !booked && !selected ? (seat.ladiesOnly ? c.pink50 : c.successTint) : 'transparent' })}>
      <Armchair size={sz} stroke={stroke} fill={fill} innerStroke={selected ? c.primaryFg : undefined} />
      {seat.ladiesOnly && !selected && <View style={{ position: 'absolute', top: 8.8 * k, left: 10 * k }}><Woman size={12 * k} color={womanColor} /></View>}
    </Pressable>
  );
});

const BerthButton = memo(function BerthButton({ seat, selected, onPress, c, disabled, cw }: CellProps) {
  const booked = !seat.available;
  const border = selected ? c.primary : booked ? c.stone500 : seat.ladiesOnly ? c.pink400 : c.success;
  const bg = selected ? c.primary : booked ? c.bookedFill : c.card;
  const pill = selected ? 'rgba(255,255,255,0.5)' : booked ? 'rgba(255,255,255,0.7)' : seat.ladiesOnly ? c.pink200 : 'rgba(22,163,74,0.2)';
  const womanColor = booked ? c.pink300 : c.pink500;
  return (
    <Pressable
      onPress={() => onPress?.(seat)} disabled={booked || disabled} accessibilityRole="button" accessibilityLabel={seatLabel(seat, selected)}
      accessibilityState={{ selected, disabled: booked }}
      style={({ pressed }) => ({ width: cw, height: 88, borderRadius: 6, borderWidth: 1.5, borderColor: border, alignItems: 'center', justifyContent: 'center',
        backgroundColor: pressed && !booked && !selected ? (seat.ladiesOnly ? c.pink50 : c.successTint) : bg })}>
      {seat.ladiesOnly && !selected && <Woman size={16} color={womanColor} />}
      <View style={{ position: 'absolute', bottom: 6, width: Math.min(20, cw - 10), height: 6, borderRadius: 9999, backgroundColor: pill }} />
    </Pressable>
  );
});

function SeatCell({ seat, selected, onPress, c, disabled, cw }: CellProps) {
  const Btn = seat.kind === 'SLEEPER' ? BerthButton : SeaterButton;
  return (
    <View style={{ width: cw, alignItems: 'center' }}>
      <Btn seat={seat} selected={selected} onPress={onPress} c={c} disabled={disabled} cw={cw} />
      <Text accessible={false} numberOfLines={1} allowFontScaling={false} style={{ ...type('label', cw < 36 ? 10 : 12), width: cw + 12, textAlign: 'center', marginTop: 2, lineHeight: 15, color: seat.available ? c.muted : c.stone400, fontVariant: ['tabular-nums'] }}>
        {seat.available ? rupees(seat.pricePaise) : 'Sold'}
      </Text>
    </View>
  );
}

function RoofExit({ c, cw }: { c: SeatUi; cw: number }) {
  return (
    <View style={{ width: cw, height: 88, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', gap: 2 }}>
        <Text style={{ fontSize: 7, lineHeight: 8, color: c.stone400 }}>▲</Text>
        <View style={{ borderWidth: 1, borderColor: 'rgba(168,162,158,0.7)', borderRadius: 3, paddingVertical: 2, paddingHorizontal: 2 }}>
          <Text allowFontScaling={false} style={{ ...type('label', cw < 36 ? 9 : 12), lineHeight: 14, textAlign: 'center', color: c.stone500 }}>Roof{'\n'}Exit</Text>
        </View>
        <Text style={{ fontSize: 7, lineHeight: 8, color: c.stone400 }}>▼</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- one deck
type DeckProps = { deck: SeatMapDeck; selected: Set<string>; onToggle?: (s: SeatMapSeat) => void; c: SeatUi; readOnly: boolean; label: string; cw: number; compact: boolean };

function DeckView({ deck, selected, onToggle, c, readOnly, label, cw, compact }: DeckProps) {
  const { rows, byPos, sleeperDeck, aisle } = useMemo(() => {
    const used = new Set(deck.seats.map((s) => s.column));
    return {
      rows: Array.from({ length: deck.rows }, (_, i) => i + 1),
      byPos: new Map(deck.seats.map((s) => [`${s.row}:${s.column}`, s] as const)),
      sleeperDeck: deck.seats.length > 0 && deck.seats.every((s) => s.kind === 'SLEEPER'),
      aisle: Array.from({ length: deck.columns }, (_, i) => i).filter((i) => !used.has(i)),
    };
  }, [deck]);

  return (
    <View accessibilityLabel={label} style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: compact ? 8 : 16, flex: compact ? 1 : undefined }}>
      <Text accessibilityRole="header" numberOfLines={1} style={{ ...type('subHeader', compact ? 15 : 18), color: c.ink, marginBottom: 12, textAlign: compact ? 'center' : 'left' }}>{label}</Text>
      <View style={{ marginTop: 24, borderWidth: 1, borderColor: c.border, borderRadius: compact ? 18 : 28, paddingVertical: 16, paddingHorizontal: compact ? 6 : 12 }}>
        {deck.deck === 'LOWER' && (
          <View pointerEvents="none" style={{ position: 'absolute', top: -40, right: compact ? 4 : 42.4, zIndex: 10, borderRadius: 9999, backgroundColor: c.card }}>
            <Steering color="rgba(107,114,128,0.7)" />
          </View>
        )}
        <View style={{ alignSelf: 'center', rowGap: 8 }}>
          {rows.map((r) => (
            <View key={r} style={{ flexDirection: 'row', columnGap: compact ? COL_GAP : 10 }}>
              {Array.from({ length: deck.columns }, (_, v) => {
                const col = deck.columns - 1 - v; // mirrored: column 0 is on the right (driver side)
                const seat = byPos.get(`${r}:${col}`);
                if (seat) return <SeatCell key={col} seat={seat} selected={selected.has(seat.number)} onPress={onToggle} c={c} disabled={readOnly} cw={cw} />;
                if (sleeperDeck && aisle.includes(col) && r % 2 === 1) return <RoofExit key={col} c={c} cw={cw} />;
                return <View key={col} style={{ width: cw }} />;
              })}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- legend
function Legend({ c, seater }: { c: SeatUi; seater: boolean }) {
  const items: { label: string; tone: 'available' | 'selected' | 'women' | 'booked' }[] = [
    { label: 'Available', tone: 'available' }, { label: 'Selected', tone: 'selected' }, { label: 'Reserved for women', tone: 'women' }, { label: 'Booked', tone: 'booked' },
  ];
  const swatch = (tone: typeof items[number]['tone']) => {
    if (seater) {
      const stroke = tone === 'selected' ? c.primary : tone === 'women' ? c.pink500 : tone === 'booked' ? c.stone300 : c.success;
      return <Armchair size={24} stroke={stroke} fill={tone === 'selected' ? c.primary : tone === 'booked' ? c.bookedFill : 'none'} innerStroke={tone === 'selected' ? c.primaryFg : undefined} />;
    }
    const border = tone === 'selected' ? c.primary : tone === 'women' ? c.pink400 : tone === 'booked' ? c.stone500 : c.success;
    const bg = tone === 'selected' ? c.primary : tone === 'booked' ? c.bookedFill : c.card;
    return <View style={{ width: 14, height: 20, borderRadius: 3, borderWidth: 1.5, borderColor: border, backgroundColor: bg }} />;
  };
  return (
    <View accessibilityLabel="Seat legend" style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 20, rowGap: 8 }}>
      {items.map((it) => (
        <View key={it.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {swatch(it.tone)}
          <Text style={{ ...type('label', 12), lineHeight: 16, color: c.muted }}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------- public component
/**
 * Reusable bus seat map (seater armchairs and sleeper berths, lower / upper deck, steering wheel, roof exits, legend).
 * Stateless: you pass the decks + the selected seat numbers and handle onToggle.
 *
 *   <SeatMap decks={toSeatMapDecks(seats)} selected={sel} onToggle={(s) => toggle(s.number)} />
 */
export function SeatMap({ decks, selected, onToggle, showLegend = true, readOnly = false, deckLabels }: SeatMapProps) {
  const c = useSeatUi();
  const sel = useMemo(() => new Set(selected), [selected]);
  const onlySeater = decks.every((d) => d.seats.every((s) => s.kind === 'SEATER'));
  const [width, setWidth] = useState(0);
  const sideBySide = decks.length > 1;
  // lower + upper deck sit left / right: shrink the seat cells so both fit the screen width
  const cw = useMemo(() => {
    if (!sideBySide || !width) return CELL_W;
    const cols = Math.max(...decks.map((d) => d.columns));
    const deckW = (width - 8) / decks.length;
    const inner = deckW - 18 - 14; // card padding + border, inner box padding + border
    return Math.max(22, Math.min(CELL_W, Math.floor((inner - (cols - 1) * COL_GAP) / cols)));
  }, [sideBySide, width, decks]);
  return (
    <View style={{ gap: 16 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={{ flexDirection: sideBySide ? 'row' : 'column', gap: sideBySide ? 8 : 16, alignItems: 'flex-start' }}>
        {decks.map((d) => <DeckView key={d.deck} deck={d} selected={sel} onToggle={onToggle} c={c} readOnly={readOnly} label={deckLabels?.[d.deck] ?? DECK_LABEL[d.deck]} cw={cw} compact={sideBySide} />)}
      </View>
      {showLegend && <Legend c={c} seater={onlySeater} />}
    </View>
  );
}
