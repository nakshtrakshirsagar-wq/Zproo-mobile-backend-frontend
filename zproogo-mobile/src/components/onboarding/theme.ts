import { FONT } from '../../theme/typography';

/** Colours used by the onboarding + login screen (light design, same on light/dark phones). */
export const colors = {
  red: '#DC2149',
  skip: '#E5232F',
  ink: '#0F1F3D',
  muted: '#5B6478',
  bg: '#F3F8FE',
  inputBorder: '#2B2F3A',
  placeholder: '#8A93A6',
  divider: '#C9D3E0',
  error: '#D92D20',
};

/** Montserrat for headers, Inter for UI text - same font files the rest of the app already uses. */
export const fonts = {
  headerBold: FONT.headBold,
  subHeaderMedium: FONT.headMedium,
  regular: FONT.uiRegular,
  medium: FONT.uiMedium,
};

// NB: no fontWeight next to these families (each family name already is one weight's font file).
export const typography = {
  header: { fontFamily: fonts.headerBold, fontSize: 26, lineHeight: 32 },
  subHeader: { fontFamily: fonts.subHeaderMedium, fontSize: 19, lineHeight: 25 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 17 },
  listTitle: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  listDetail: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
} as const;
