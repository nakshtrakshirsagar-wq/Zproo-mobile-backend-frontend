import { TextStyle } from 'react-native';

/**
 * redBus-style typography hierarchy.
 *   Montserrat -> punchy headers          Inter -> UI, lists, tickets, body copy
 *
 * Font files live in  android/app/src/main/assets/fonts  (Android) and are linked on iOS with
 * `npx react-native-asset` (see src/assets/fonts/README.md). If the files are missing the app
 * simply falls back to the system font, so nothing crashes.
 */
export const FONT = {
  headBold: 'Montserrat-Bold',      // 700
  headMedium: 'Montserrat-Medium',  // 500
  uiRegular: 'Inter-Regular',       // 400
  uiMedium: 'Inter-Medium',         // 500
  uiSemi: 'Inter-SemiBold',         // 600 (buttons, emphasis)
} as const;

/** Set to false only while the .ttf files are not installed yet; keeps weights visible with the system font. */
export const FONTS_INSTALLED = true;

type Role = 'header' | 'subHeader' | 'body' | 'label' | 'listTitle' | 'listDetail' | 'emphasis' | 'button' | 'input';

/** Role -> style. Sizes follow the table: Header 24-28, Sub-header 18-20, Body 14-16, Label 12-13, List 14. */
const ROLE: Record<Role, { family: string; size: number; weight: TextStyle['fontWeight'] }> = {
  header:     { family: FONT.headBold,   size: 26, weight: '700' },
  subHeader:  { family: FONT.headMedium, size: 18, weight: '500' },
  body:       { family: FONT.uiRegular,  size: 14, weight: '400' },
  label:      { family: FONT.uiRegular,  size: 12, weight: '400' },
  listTitle:  { family: FONT.uiMedium,   size: 14, weight: '500' },
  listDetail: { family: FONT.uiRegular,  size: 14, weight: '400' },
  emphasis:   { family: FONT.uiSemi,     size: 14, weight: '600' },
  // Bus booking screens: buttons = Inter Medium 16, typed text in inputs = Inter Regular 16 (Body 14-16)
  button:     { family: FONT.uiMedium,   size: 16, weight: '500' },
  input:      { family: FONT.uiRegular,  size: 16, weight: '400' },
};

/** Spread into a StyleSheet / style object: `{ ...type('listTitle') }` (optionally override the size). */
export function type(role: Role, size?: number): TextStyle {
  const r = ROLE[role];
  return FONTS_INSTALLED
    ? { fontFamily: r.family, fontSize: size ?? r.size }
    : { fontSize: size ?? r.size, fontWeight: r.weight };
}

/** Font family for a given weight in the Inter (UI) family, for places that only need the family. */
export const ui = (weight: 'regular' | 'medium' | 'semi' = 'regular'): TextStyle =>
  FONTS_INSTALLED
    ? { fontFamily: weight === 'regular' ? FONT.uiRegular : weight === 'medium' ? FONT.uiMedium : FONT.uiSemi }
    : { fontWeight: weight === 'regular' ? '400' : weight === 'medium' ? '500' : '600' };

/** Montserrat family for headers. */
export const head = (weight: 'bold' | 'medium' = 'bold'): TextStyle =>
  FONTS_INSTALLED
    ? { fontFamily: weight === 'bold' ? FONT.headBold : FONT.headMedium }
    : { fontWeight: weight === 'bold' ? '700' : '500' };
