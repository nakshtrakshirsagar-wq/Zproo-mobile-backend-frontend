# RateUs

"Enjoying our app?" card, ported from `Rate_Us.html`.

- red phone art with a white screen and a gold star badge
- three review bubbles ("Great ride!", "Easy booking", "Clean & on time") slide in from the right, stay, then fade out to the left, staggered by 0.7 s, looping every 6 s (same timing as the HTML)
- "Rate Now" button: shows "Thanks! Opening the store…" and opens the Play Store page
- phone "reduce motion" on: bubbles stay still

| File | Role |
| --- | --- |
| `RateUs.tsx` | main card: text, button, message |
| `ReviewArt.tsx` | sub-component: the phone art + animated bubbles |
| `index.ts` | one import point |

```tsx
import { RateUs } from '../components/RateUs';
<RateUs />                                   // opens market://details?id=com.zproogo.app
<RateUs storeUrl="https://..." />            // custom link
<RateUs onRate={() => ...} />                // custom action
```
Needs your app's `theme/ThemeProvider` (`c.surface`, `c.text`, `c.muted`).
