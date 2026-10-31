import { useBusUi } from '../BusResult/busResultTheme';

/** Colours of the seat-map prototype (light mode = exact HTML values; dark mode borrows the app surface colours). */
export function useSeatUi() {
  const ui = useBusUi();
  return {
    isDark: ui.isDark,
    primary: '#E11D2E', primaryFg: '#FFFFFF', success: '#16A34A', successTint: 'rgba(22,163,74,0.10)',
    pink50: ui.isDark ? 'rgba(236,72,153,0.16)' : '#FDF2F8', pink200: '#FBCFE8', pink300: '#F9A8D4', pink400: '#F472B6', pink500: '#EC4899',
    stone300: '#D6D3D1', stone400: '#A8A29E', stone500: '#78716C',
    bookedFill: 'rgba(229,231,235,0.4)',
    card: ui.surface, border: ui.line, muted: ui.muted, ink: ui.ink, page: ui.page,
  };
}
export type SeatUi = ReturnType<typeof useSeatUi>;
