import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';

/** false when the phone has "reduce motion" on: every ambient animation stops. */
export const MotionContext = createContext(true);

export function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let on = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => on && setReduce(!!v)).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduce(!!v));
    return () => { on = false; sub.remove(); };
  }, []);
  return reduce;
}

type Opts = {
  /** full cycle in ms */
  duration: number;
  /** wait before starting (CSS animation-delay) */
  delay?: number;
  /** start part-way through the cycle, 0..1 (CSS negative animation-delay) */
  phase?: number;
  /** 0 -> 1 -> 0 each cycle (CSS keyframes 0% / 50% / 100%) */
  pingpong?: boolean;
  easing?: (t: number) => number;
};

export const EASE = Easing.inOut(Easing.quad);

/** Looping 0..1 value, runs on the native thread. Same idea as a CSS `animation: ... infinite`. */
export function useLoop({ duration, delay = 0, phase = 0, pingpong = false, easing = Easing.linear }: Opts) {
  const motion = useContext(MotionContext);
  const v = useRef(new Animated.Value(phase)).current;
  useEffect(() => {
    if (!motion) { v.setValue(0); return undefined; }
    let anim: Animated.CompositeAnimation;
    if (pingpong) {
      const half = duration / 2;
      v.setValue(0);
      anim = Animated.sequence([
        Animated.delay(delay),
        Animated.loop(Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: half, easing, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: half, easing, useNativeDriver: true }),
        ])),
      ]);
    } else {
      v.setValue(phase);
      anim = Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: Math.max(1, duration * (1 - phase)), easing, useNativeDriver: true }),
        Animated.loop(Animated.sequence([
          Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(v, { toValue: 1, duration, easing, useNativeDriver: true }),
        ])),
      ]);
    }
    anim.start();
    return () => anim.stop();
  }, [motion, duration, delay, phase, pingpong]); // eslint-disable-line react-hooks/exhaustive-deps
  return v;
}

/** CSS `steps(2)` blink: bright, dim, dark, dim. */
export const stepBlink = (v: Animated.Value) =>
  v.interpolate({ inputRange: [0, 0.2499, 0.25, 0.4999, 0.5, 0.7499, 0.75, 1], outputRange: [1, 1, 0.575, 0.575, 0.15, 0.15, 0.575, 0.575] });
