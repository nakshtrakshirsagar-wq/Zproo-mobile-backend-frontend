import React from 'react';
import Svg, { Defs, G, Mask, Path, Rect, Circle, Line } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { iconThemes, IconThemeName } from './iconTheme';
import data from './voyage.json';

/**
 * Reusable "Voyage" icon. Shapes live in ONE place: ./voyage.json
 * (the SVG files and the admin web component are generated from the same file).
 *
 *   <VoyageIcon name="bus" />                       // size 28, auto light/dark theme
 *   <VoyageIcon name="plane" size={48} />
 *   <VoyageIcon name="car" theme="mono" />          // light | dark | mono
 *   <VoyageIcon name="box" color="#fff" accent="#fff" />   // custom colours
 */
export type VoyageName = keyof typeof data.icons;
export const VOYAGE_NAMES = Object.keys(data.icons) as VoyageName[];
export const isVoyage = (n: string): n is VoyageName => n in data.icons;

type El = { t: string; a: Record<string, any>; f?: string; s?: string; sw?: number };
const TAGS: Record<string, any> = { rect: Rect, circle: Circle, path: Path, line: Line };

export type VoyageIconProps = { name: VoyageName; size?: number; color?: string; accent?: string; theme?: IconThemeName };

export function VoyageIcon({ name, size = 28, color, accent, theme }: VoyageIconProps) {
  const { isDark } = useTheme();
  const t = iconThemes[theme ?? (isDark ? 'dark' : 'light')];
  const role = { main: color ?? t.main, accent: accent ?? t.accent } as Record<string, string>;
  const def = data.icons[name] as { cut: El[]; body: El[]; layers: El[] };
  const id = `vy-${name}`;
  const draw = (e: El, i: number, fill?: string) => {
    const Tag = TAGS[e.t];
    return <Tag key={i} {...e.a} fill={fill ?? (e.f ? role[e.f] : 'none')}
      {...(e.s ? { stroke: role[e.s], strokeWidth: e.sw, strokeLinecap: 'round', strokeLinejoin: 'round' } : {})} />;
  };
  return (
    <Svg width={size} height={size} viewBox={data.viewBox}>
      {def.cut.length > 0 && (
        <Defs>
          <Mask id={id} x="0" y="0" width="64" height="64" maskUnits="userSpaceOnUse">
            <Rect x="0" y="0" width="64" height="64" fill="#fff" />
            {def.cut.map((e, i) => draw(e, i, '#000'))}
          </Mask>
        </Defs>
      )}
      {def.body.length > 0 && <G mask={def.cut.length ? `url(#${id})` : undefined}>{def.body.map((e, i) => draw(e, i))}</G>}
      {def.layers.map((e, i) => draw(e, i))}
    </Svg>
  );
}
