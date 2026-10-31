import { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * Smooth right-to-left marquee for the Offers / What's new rows.
 *  - runs on the NATIVE thread (useNativeDriver: true), so JS work, card animations and
 *    vertical scrolling of Home can no longer make it stutter;
 *  - the position is computed from time (linear motion), so pause / resume is instant and exact:
 *    no async reads, no jump back when the finger lifts;
 *  - the row is two identical copies; when it reaches one copy's width it restarts from 0, which is invisible.
 * Returns the translateX value plus hold() / release() for press-to-pause.
 */
export function useAutoScroll({ setW, speed, disabled }: { setW: number; speed: number; disabled?: boolean }) {
  const x = useRef(new Animated.Value(0)).current;
  const pos = useRef(0);          // current offset, 0 .. -setW
  const startedAt = useRef(0);    // when the current run began (ms)
  const startPos = useRef(0);     // offset at that moment
  const running = useRef(false);
  const holding = useRef(false);

  const snapshot = useCallback(() => {
    if (!running.current) return;
    const travelled = ((Date.now() - startedAt.current) / 1000) * speed;
    pos.current = Math.max(-setW, startPos.current - travelled);
  }, [setW, speed]);

  const stop = useCallback(() => {
    snapshot();
    running.current = false;
    x.stopAnimation();
    x.setValue(pos.current);
  }, [snapshot, x]);

  const run = useCallback(() => {
    if (disabled || holding.current || running.current || setW <= 0 || speed <= 0) return;
    if (pos.current <= -setW) pos.current = 0;
    startPos.current = pos.current;
    startedAt.current = Date.now();
    running.current = true;
    const remaining = setW + pos.current;
    Animated.timing(x, { toValue: -setW, duration: Math.max(1, (remaining / speed) * 1000), easing: Easing.linear, useNativeDriver: true }).start(({ finished }) => {
      if (!finished) return;
      running.current = false;
      pos.current = 0;
      x.setValue(0);
      run();
    });
  }, [disabled, setW, speed, x]);

  const hold = useCallback(() => { holding.current = true; stop(); }, [stop]);
  const release = useCallback(() => { holding.current = false; run(); }, [run]);

  useEffect(() => {
    if (disabled) { stop(); return undefined; }
    run();
    return () => stop();
  }, [disabled, run, stop]);

  return { x, hold, release };
}
