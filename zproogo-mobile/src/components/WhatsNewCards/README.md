# WhatsNewCards

Auto-scrolling "What's new" cards, ported from `What_s_New_Auto-scrolling_Cards.html`.

- 5 gradient cards (Live bus tracking, Smarter seat pick, Share your trip, Instant refunds, Women-first seats)
- seamless right-to-left loop, 30 s per set (linear), 6 % edge fade
- touch / hold anywhere on the row pauses it; letting go resumes from the same spot (HTML: hover / active)
- each card: decorative bubbles, a shine that sweeps every 4.5 s (rests 60 %, sweeps 40 %), emoji tile tilted 8deg,
  white tag pill, round arrow button; press lifts it 4 px and scales to 1.02 (0.25 s)
- phone "reduce motion" on: no animation, plain swipeable row

| File | Role |
| --- | --- |
| `WhatsNewCards.tsx` | main component: the auto-scrolling row |
| `WhatsNewCard.tsx` | one card (look, shine, press lift) |
| `whatsNew.ts` | card text/colours (`DEFAULT_WHATS_NEW`) and types |
| `index.ts` | one import point |

```tsx
import { WhatsNewCards } from '../components/WhatsNewCards';

<WhatsNewCards fadeColor={c.bg} style={{ marginHorizontal: -16 }} />
<WhatsNewCards items={myItems} onPressCard={(item) => ...} loopSeconds={30} />
```
Props: `items`, `onPressCard`, `fadeColor` (screen background), `paused`, `loopSeconds` (default 30), `style`.

Reuses `MotionContext` / `useReduceMotion` from `../OfferCards/useLoop`.
Needs `react-native-linear-gradient` (already in Zproogo).
