/** Icon themes for the Voyage icon set. `main` = body colour, `accent` = detail colour, `cut` = SVG-file background hint. */
export type IconTheme = { main: string; accent: string };

export const iconThemes = {
  light: { main: '#D90404', accent: '#1B2A5C' }, // red + navy (matches the design screenshot)
  dark: { main: '#F43F5E', accent: '#EAF4FB' },  // brighter rose + ice white for dark surfaces
  mono: { main: '#0B1F3A', accent: '#0B1F3A' },  // single colour (tab bars, disabled, on coloured chips)
} as const satisfies Record<string, IconTheme>;

export type IconThemeName = keyof typeof iconThemes;
