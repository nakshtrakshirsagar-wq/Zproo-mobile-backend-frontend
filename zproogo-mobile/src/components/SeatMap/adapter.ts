import type { BusSeat } from '../../api/endpoints';
import type { SeatMapDeck, SeatMapSeat } from './types';

/** BusSeat[] (API / mock) -> decks for <SeatMap />. Rows / columns are taken from the seats themselves. */
export function toSeatMapDecks(seats: BusSeat[]): SeatMapDeck[] {
  const by = new Map<'LOWER' | 'UPPER', SeatMapSeat[]>();
  seats.forEach((s) => {
    const seat: SeatMapSeat = {
      number: s.id, row: s.row, column: s.col, deck: s.deck, kind: s.sleeper ? 'SLEEPER' : 'SEATER',
      available: s.status === 'AVAILABLE', ladiesOnly: s.ladiesOnly, pricePaise: s.farePaise,
    };
    by.set(s.deck, [...(by.get(s.deck) ?? []), seat]);
  });
  return (['LOWER', 'UPPER'] as const).filter((d) => by.has(d)).map((deck) => {
    const list = by.get(deck)!;
    return { deck, rows: Math.max(...list.map((s) => s.row)), columns: Math.max(...list.map((s) => s.column)) + 1, seats: list };
  });
}
