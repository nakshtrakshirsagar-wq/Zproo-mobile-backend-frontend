# OfferCards

Auto-scrolling offer cards, ported from `Offer_Cards.html`:
Flights, Bus, Trains, Cabs, Hotels, Bike rentals, Parcels - each with its own shape, colours and small animations
(flying plane + clouds, spinning wheels + moving road, speed lines, twinkling windows + sparkles, scrolling checker band,
moving packing tape, pulsing promo chips). Seamless right-to-left loop; press a card to pause and lift it.
Phone "reduce motion" turns all animation off and shows a plain swipeable row.

## Files
| File | Role |
| --- | --- |
| `OfferCards.tsx` | main component: the auto-scrolling row |
| `OfferCard.tsx` | one card (shape, background, text, code chip) |
| `cardIcons.tsx` | the 7 animated icons |
| `cardFx.tsx` | background effects (clouds, streaks, sparkles, road, checker, tape) |
| `useLoop.ts` | small animation helper (looping values, reduce-motion) |
| `offers.ts` | card text (`DEFAULT_OFFERS`) and types |
| `index.ts` | one import point |

## Use
```tsx
import { OfferCards } from '../components/OfferCards';

<OfferCards fadeColor={c.bg} onPressOffer={(o) => navigation.navigate('Offers')} style={{ marginHorizontal: -16 }} />
```
Props: `offers` (custom list, see `offers.ts`), `onPressOffer`, `fadeColor` (screen background; edge fade + ticket notches),
`paused`, `speed` (px/s, default 57), `style`.

Needs: `react-native-svg` and `react-native-linear-gradient` (both already in Zproogo).
