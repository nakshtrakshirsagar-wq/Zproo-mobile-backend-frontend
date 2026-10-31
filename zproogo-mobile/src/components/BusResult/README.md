# Bus results

`features/bus/BusResults.tsx` is opened by the **Search buses** button (Home, Bus page, Bus search).

| Piece | Where |
|---|---|
| Result card (reusable): `<BusResultCard trip onSelect women />` | `components/BusResult/BusResultCard.tsx` |
| Route map (+ "Open in Maps") | `components/BusResult/RouteMap.tsx` |
| Amenities panel | `components/BusResult/AmenityGrid.tsx` |
| Sort + Filter bar, quick chips | `components/BusFilters/BusFilterBar.tsx` |
| Filter bottom sheet (draft + "Show N buses") | `components/BusFilters/BusFilterSheet.tsx` |
| Filter / sort rules (pure, unit-tested) | `components/BusFilters/applyFilters.ts`, `__tests__/busFilters.test.ts` |

Some filters read optional `BusTrip` fields (`busMake`, `boardingPoints`, `droppingPoints`, `freeCancellation`, `hasDeal`).
If the API does not send them, those options are dimmed and the Boarding / Dropping sections are hidden.
