# TravelBanner

Native port of `banner-with-bus.html` (Home header image).

- Bus photo: `src/assets/banner-bus.jpg` (cover, anchored at 60% like the HTML).
- Brand gradient overlay: red → purple → navy.
- Intro timeline (ms): "Dream It," fades up @500 (1300) · "Travel It." slides in with skew + overshoot @1800 (1000) · accent bar grows @2900 (1000) · paragraph fades up @3200 (1200).
- Tap the banner to replay (the HTML "Replay" button). Pass a changing `playKey` to replay from code.
- Respects the phone's "reduce motion" setting (shows the final state, no animation).
- Uses only `Animated` with the native driver - no new packages.
