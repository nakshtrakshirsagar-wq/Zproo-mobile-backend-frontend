# SeatMap

Reusable bus seat map (seater armchairs + sleeper berths, lower / upper deck, steering wheel, roof exits, legend).
Visuals are a 1:1 port of `bus-seat-map-zproo.html`; text uses the Montserrat / Inter hierarchy from `theme/typography.ts`.

```tsx
import { SeatMap, toSeatMapDecks } from '../../components/SeatMap';

<SeatMap
  decks={toSeatMapDecks(seats)}          // seats: BusSeat[] from Api.busSeats()
  selected={selected}                    // string[] of seat numbers
  onToggle={(seat) => toggle(seat.number)}
/>
```

| Prop | Meaning |
| --- | --- |
| `decks` | `SeatMapDeck[]` (see `types.ts`). `toSeatMapDecks()` builds it from the API's `BusSeat[]`. |
| `selected` | Selected seat numbers. The parent owns the selection (max seats, total price, ...). |
| `onToggle` | Called with the tapped (available) seat. |
| `showLegend` | Default `true`. |
| `readOnly` | Display only, no taps. |
| `deckLabels` | Override "Lower deck" / "Upper deck". |

Used by `features/bus/SeatLayout.tsx`. Grid rule: `column` 0 is on the right (driver side); a column without seats is the aisle
(sleeper decks get a "Roof Exit" marker in the aisle on odd rows).
