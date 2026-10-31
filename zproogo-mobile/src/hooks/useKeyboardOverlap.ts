import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardEvent, Platform, TextInput, View } from 'react-native';

/**
 * Keyboard handling that behaves like this:
 *  - Not at the end of the page: the keyboard simply slides up over the page (nothing moves),
 *    unless the field you are typing in would be hidden - then the page scrolls just enough.
 *  - At the end of the page: the keyboard comes from below, the page gets extra room at the bottom
 *    and moves up so the field you are typing in stays visible above the keyboard.
 *
 * It measures how much of `wrapRef` the keyboard really covers, so it works whether Android resizes the window
 * (adjustResize) or not (edge-to-edge on Android 15), and on iOS.
 */
export function useKeyboardOverlap(wrapRef: React.RefObject<View | null>) {
  const [overlap, setOverlap] = useState(0);
  const kbTop = useRef<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e: KeyboardEvent) => {
      kbTop.current = e.endCoordinates.screenY;
      // wait a moment so a resized window (adjustResize / KeyboardAvoidingView) has settled, then measure the real overlap
      later(() => {
        try {
          const w: any = wrapRef.current;
          if (typeof w?.measureInWindow !== 'function') return;
          w.measureInWindow((_x: number, y: number, _w: number, h: number) => {
            if (![y, h].every(Number.isFinite)) return;
            setOverlap(Math.max(0, Math.round(y + h - (kbTop.current ?? y + h))));
          });
        } catch { /* keyboard padding is a nicety; never crash */ }
      }, Platform.OS === 'ios' ? 0 : 120);
    });
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => { kbTop.current = null; setOverlap(0); });
    return () => { show.remove(); hide.remove(); timers.current.forEach(clearTimeout); };
  }, [wrapRef]);

  /**
   * Scrolls the focused input into view ONLY if the keyboard (or the footer) would hide it.
   * `scrollY` is the current scroll offset, `scrollTo` scrolls the ScrollView, `bottomInset` is e.g. the footer height.
   */
  const ensureVisible = useCallback((scrollY: number, scrollTo: (y: number) => void, bottomInset = 0) => {
    later(() => {
      try {
        const input: any = (TextInput as any).State?.currentlyFocusedInput?.();
        const wrap: any = wrapRef.current;
        if (typeof input?.measureInWindow !== 'function' || typeof wrap?.measureInWindow !== 'function') return;
        wrap.measureInWindow((_wx: number, wy: number, _ww: number, wh: number) => {
          const visibleBottom = Math.min(wy + wh, kbTop.current ?? Infinity) - bottomInset - 16;
          input.measureInWindow((_ix: number, iy: number, _iw: number, ih: number) => {
            if (![wy, wh, iy, ih].every(Number.isFinite)) return;
            const bottom = iy + ih;
            if (bottom > visibleBottom) scrollTo(Math.max(0, scrollY + (bottom - visibleBottom) + 12));
            else if (iy < wy + 8) scrollTo(Math.max(0, scrollY - (wy + 8 - iy) - 12));
          });
        });
      } catch { /* never crash on focus */ }
    }, 220);
  }, [wrapRef]);

  return { overlap, ensureVisible };
}
