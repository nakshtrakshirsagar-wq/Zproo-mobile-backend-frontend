import { useTheme } from '../../theme/ThemeProvider';

/**
 * Colours of the "Search results (red hero)" design. Light mode uses the exact values from the HTML;
 * dark mode falls back to the app theme so the page stays readable.
 */
export function useBusUi() {
  const { c, isDark } = useTheme();
  return {
    isDark,
    red: '#D9141E', redTint: isDark ? 'rgba(217,20,30,0.20)' : '#FDECEC', redDark: isDark ? '#FF8A8F' : '#B80F18',
    ink: isDark ? c.text : '#111827', body: isDark ? c.text : '#374151', muted: isDark ? c.muted : '#6B7280',
    line: isDark ? c.border : '#E5E7EB', dash: isDark ? c.border : '#D1D5DB',
    page: isDark ? c.bg : '#FFFFFF', surface: isDark ? c.surface : '#FFFFFF', chipBg: isDark ? c.chip : '#F3F4F6',
    ratingBg: isDark ? 'rgba(74,222,128,0.16)' : '#E8F6EC', ratingFg: isDark ? '#4ADE80' : '#15803D',
    warnBg: isDark ? 'rgba(251,191,36,0.16)' : '#FEF3E2', warnFg: isDark ? '#FBBF24' : '#B45309',
    shadow: 'rgba(17,24,39,0.08)',
  };
}
export type BusUi = ReturnType<typeof useBusUi>;
