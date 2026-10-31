# BusServiceNav

Scrollable service navbar for the Bus page, ported from `Voyage_Icons.html`: single row, snaps cell by cell,
dividers between cells, ring under each label that turns red for the selected service, edge fades only where more icons exist.
Uses the same `VoyageIcon` + `SERVICES` as Home's `ServiceNav` (which is unchanged).

```tsx
<BusServiceNav value="BUS" onChange={(key) => ...} />   // props: items, cellWidth (84), iconSize (44), style
```
