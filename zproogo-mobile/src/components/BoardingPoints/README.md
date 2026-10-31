# BoardingPoints

Boarding / dropping picker - port of "Design 1 - Tabs list" from `boarding-dropping-designs.html`.
Two tabs (current choice shown under each title) + one list (time, name, address, radio). Picking a boarding point jumps to the dropping tab.

```tsx
<BoardingPoints boarding={pts.boarding} dropping={pts.dropping}
  boardingId={b} droppingId={d} onChangeBoarding={setB} onChangeDropping={setD} women={women} />
```
Used by `features/bus/BoardingDropping.tsx`. Pair it with `components/BookingSteps` for the "Select seats / Board/Drop point / Passenger Info" tabs.
