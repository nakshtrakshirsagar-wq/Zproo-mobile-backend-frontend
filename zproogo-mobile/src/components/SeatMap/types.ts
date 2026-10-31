/** Shape the SeatMap component understands (same as the HTML prototype). Use toSeatMapDecks() to build it from the API's BusSeat list. */
export type SeatKind = 'SEATER' | 'SLEEPER';
export type DeckName = 'LOWER' | 'UPPER';

export type SeatMapSeat = {
  /** Label shown to the passenger and sent to the server, e.g. "2A" or "L3C". */
  number: string;
  row: number;       // 1-based
  column: number;    // 0-based; a column with no seats is the aisle
  deck: DeckName;
  kind: SeatKind;
  available: boolean;
  ladiesOnly: boolean;
  pricePaise: number;
};

export type SeatMapDeck = { deck: DeckName; rows: number; columns: number; seats: SeatMapSeat[] };
