# BusOfferCards

Bus page offer cards, ported from `Bus_Offer_Cards_Option3.2.html`: 6 rich-gradient cards (First ride, Women travellers,
Sleeper buses, Round trip, Students, Zero fee), each with a shaking bus + spinning wheels, speed lines, a moving white
road and pulsing / copyable promo chips.

The row is STILL (no auto-scroll): swipe sideways with a finger to see all cards. Press a card to lift it.
Tap a code chip to copy it ("Copied!" + toast). Edit the card text in `busOffers.ts`. Home's `OfferCards` is untouched.

```tsx
<BusOfferCards fadeColor={c.bg} onPressOffer={() => navigation.navigate('Offers')} style={{ marginHorizontal: -16 }} />
```

## Typography (Montserrat + Inter, from `theme/typography.ts`)
tag / small / chip = Inter Medium (list title) · desc = Inter Regular 13 (label) · big offer number = Montserrat Bold (header).
