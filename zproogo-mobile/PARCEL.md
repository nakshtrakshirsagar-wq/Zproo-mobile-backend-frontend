# Parcel delivery (Zproogo mobile)

Same-city delivery from the "Parcel delivery & Bike rental" design PDF (parcel screens P1-P9). Bike rental is not part of this delivery.

## Where things are
`src/features/parcel/`
- `parcelRules.ts` - vehicles, prices, service areas, coupons and **every validator / input sanitiser** (pure functions, unit-tested)
- `parcelService.ts` - mock backend (quote, create order, driver assignment, tracking, cancel, refund). Same function names/types a real API would have
- `parcelStore.ts` - the order being created (not saved) + saved addresses and orders (saved in encrypted MMKV)
- `ParcelBooking.tsx` - P1 Send a parcel, P2 Pickup / Drop location & contact, P3 Choose vehicle, P4 Goods & add-ons, P5 Review & pay
- `ParcelOrder.tsx` - one screen that shows P6 Finding a driver, P6b No driver found, P7 Driver assigned, P8 Live tracking, P9 Delivered + proof (plus scheduled and cancelled), and the My parcel orders list

Entry points: Home > **Parcel** tab and the "Send anything across Pune" card; My Trips > **Parcels** tab.

## Validation rules
| Field | Rule |
|---|---|
| Sender / receiver name | letters only (space . ' - allowed), 2-60 chars; digits and symbols are blocked while typing and rejected |
| Mobile | digits only, exactly 10, must start with **7, 8 or 9**, not all the same digit |
| Receiver mobile | must differ from sender unless "I am the receiver" is ticked |
| House / flat / floor | 2-80 chars, letters, digits and `, . / # ( ) & ' -` only |
| Pickup / drop | both required, not the same place, 0.3-50 km apart |
| Schedule | date + time required, at least 60 min ahead, up to 7 days |
| Goods type | required; "Other" needs a description in words (not only digits) |
| Weight | required, must fit the chosen vehicle (2-wheeler 20 kg, 3-wheeler 500, Mini truck 750, Pickup 1250) |
| Goods value (Rs) | digits only, whole number, 1-25,000; above 10,000 needs Goods protection |
| Note for driver | max 150 chars, `<` `>` blocked |
| Helpers | 0-3, not available on a 2-wheeler |
| Prohibited items | must be confirmed |
| Coupon | 4-30 chars A-Z 0-9 - _ ; valid codes: `PARCEL50`, `FIRSTSEND` |
| UPI ID | `name@bank` format |
| Wallet | balance must cover the total |
| Tip / rating | tip only from Rs 10/20/30, needs a rating, rating 1-5 |

## Demo behaviour (mock mode)
- Pickup or drop in **Wakad**: no driver accepts the first time (P6b). "Add Rs 30 tip and retry" finds one. "Switch vehicle" and "Schedule for later" also work.
- Otherwise: finding driver (6 s) -> driver arriving (20 s) -> at pickup (10 s) -> in transit (30 s) -> delivered. Change `PARCEL_TIMING` in `parcelService.ts` to speed up or slow down.
- Cancel is free until a driver is assigned, then Rs 30 is kept. Not possible once in transit.
- Payments, wallet debit, call/chat with the driver and the proof-of-delivery photo are simulated.

## Connecting the real backend
Replace the bodies in `parcelService.ts` (`quoteRoute`, order create/advance/cancel/rate) and the `create` / `tick` actions in `parcelStore.ts` with `Api.*` calls. Screens and validation do not change.

## Not included
- "Add photos of goods" (P4): needs a native image picker (e.g. react-native-image-picker) which has to be added and built on your machine.
- Backend `zproogo-api` and admin panel are unchanged (no parcel module yet).
