# Voyage icons (reusable)

Bus · Train · Flight(plane) · Hotel · Cab(car) · Parcel(box) · Bike

**Single source of truth:** `src/components/ServiceNav/voyage.json` (shapes). Colours: `src/components/ServiceNav/iconTheme.ts`.
Everything else is generated/shared from it.

## Mobile
```tsx
import { VoyageIcon, SERVICES } from '../components/ServiceNav';
<VoyageIcon name="bus" />                      // auto light/dark
<VoyageIcon name="plane" size={48} theme="mono" />
<VoyageIcon name="box" color="#fff" accent="#fff" />
SERVICES.map(s => <VoyageIcon key={s.key} name={s.icon} />)   // service list
<Icon name="bus" />                            // old Icon component also uses it
```
## Admin / web
```tsx
import { VoyageIcon } from './components/VoyageIcon';
<VoyageIcon name="hotel" size={32} theme="dark" />
```
Or use the plain files in `voyage/{light,dark,mono}/*.svg`.

## Add or change an icon
1. Edit `voyage.json` (add a key under `icons`; layers: `cut` = transparent holes, `body` = masked main shapes, `layers` = extra shapes with `f`/`s` = `main|accent`).
2. Run `npm run icons` in `zproogo-mobile` - rebuilds all SVGs and syncs the admin app.
3. Use it as `<VoyageIcon name="yourname" />`.

## ServiceNav (reusable header bar)
`components/ServiceNav/ServiceNav.tsx` - 4 icons on the first row, the rest centred below.
```tsx
import { ServiceNav, SERVICES } from '../components/ServiceNav';
<ServiceNav value="BUS" onChange={(key) => ...} />                       // all 7 services
<ServiceNav items={SERVICES.filter(s => s.key !== 'BIKE')} perRow={3} iconSize={36} onChange={...} />
```
Props: `value`, `onChange`, `items`, `perRow`, `iconSize`, `hideDash`, `style`. Service list lives in `components/ServiceNav/services.ts`.
