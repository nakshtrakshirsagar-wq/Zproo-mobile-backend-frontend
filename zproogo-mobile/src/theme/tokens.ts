/** Zproogo design tokens: logo red + Rose / Ice / Navy palette from the design PDF. */
export const light = {
  brand: '#D90404', brandDark: '#9F1239', rose: '#E11D48', roseLight: '#F43F5E', roseDeep: '#881337',
  ice: '#BAE6FD', iceAccent: '#38BDF8', iceSky: '#7DD3FC',
  bg: '#F3F9FD', surface: '#FFFFFF', chip: '#E6F2FA', border: '#D9E8F3',
  text: '#0B1F3A', navyMid: '#1E3A5F', muted: '#64748B',
  success: '#2E9E6B', successBg: 'rgba(46,158,107,0.12)', warning: '#F2A93B', warningBg: 'rgba(242,169,59,0.15)',
  danger: '#E11D48', dangerBg: 'rgba(225,29,72,0.08)', infoBg: 'rgba(56,189,248,0.12)', info: '#0369A1',
  ladies: '#FFE4EA', ladiesBorder: '#F43F5E', blue: '#0284C7',
  shadow: 'rgba(11,31,58,0.16)', overlay: 'rgba(6,17,31,0.5)',
};
export type Colors = typeof light;
export const dark: Colors = {
  ...light, bg: '#06111F', surface: '#0E2138', chip: '#15294A', border: '#1E3556', text: '#EAF4FB', muted: '#94A3B8',
  info: '#7DD3FC', shadow: 'rgba(0,0,0,0.4)', ladies: '#4A1D2B',
};
export const gradients = {
  button: ['#D90404', '#9F1239'], banner: ['#1E3A5F', '#D90404'], ice: ['#38BDF8', '#D90404'],
};
export const radius = { sm: 9, md: 12, lg: 16, xl: 22, pill: 999 };
export const space = (n: number) => n * 4;
export const font = {
  regular: undefined as string | undefined, // add Poppins to android/app/src/main/assets/fonts and set names here
  size: { xs: 10, sm: 12, md: 14, lg: 16, xl: 20, xxl: 26 },
};
