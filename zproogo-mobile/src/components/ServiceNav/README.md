# ServiceNav (one self-contained folder)

| File | Role |
| --- | --- |
| `ServiceNav.tsx` | **Main component** - the 4 + 3 icon navbar |
| `VoyageIcon.tsx` | **Sub-component** - draws one icon (light / dark / mono) |
| `services.ts` | List of the 7 services (label, icon, screen) |
| `iconTheme.ts` | Icon colours per theme |
| `voyage.json` | Icon shapes (single source) |
| `index.ts` | `import { ServiceNav, VoyageIcon, SERVICES } from '../components/ServiceNav'` |

Needs only the app's existing `theme/ThemeProvider` and `react-native-svg`.
To copy it to another project, copy this folder.
