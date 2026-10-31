import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { VoyageIcon, isVoyage } from './ServiceNav';

/** Line icons (24x24, stroke) - same set as the HTML prototype. */
export const PATHS = {
  back: 'M15 18l-6-6 6-6', chev: 'M9 18l6-6-6-6', bell: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
  user: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
  users: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8',
  swap: 'M7 4v16M7 4L3 8M7 4l4 4M17 20V4M17 20l-4-4M17 20l4-4', pin: 'M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0zM12 13a3 3 0 100-6 3 3 0 000 6z',
  cal: 'M3 6a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2zM16 2v4M8 2v4M3 10h18', search: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3',
  heart: 'M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21l7.8-7.8 1-1.1a5.5 5.5 0 000-7.5z',
  filter: 'M22 3H2l8 9.5V19l4 2v-8.5z', sort: 'M3 6h18M6 12h12M10 18h4', wifi: 'M5 12.5a10 10 0 0114 0M8.5 16a5 5 0 017 0M2 9a15 15 0 0120 0M12 20h.01',
  plug: 'M9 2v6M15 2v6M6 8h12v4a6 6 0 01-12 0zM12 18v4', cctv: 'M2 7l14-4 2 6-14 4zM6 12l1 4M7 16H3v4M18 9l4 1',
  plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', share: 'M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13',
  download: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3', check: 'M20 6L9 17l-5-5',
  wallet: 'M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 14h.01M18 7V5a2 2 0 00-2-2H5a3 3 0 00-3 3',
  help: 'M12 22a10 10 0 100-20 10 10 0 000 20zM9.1 9a3 3 0 015.8 1c0 2-3 3-3 3M12 17h.01',
  phone: 'M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z',
  chat: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z', moon: 'M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z',
  globe: 'M12 22a10 10 0 100-20 10 10 0 000 20zM2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20', lock: 'M5 11h14v10H5zM8 11V7a4 4 0 018 0v4',
  info: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-4M12 8h.01', card: 'M2 5h20v14H2zM2 10h20', clock: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2',
  ticket: 'M3 7a2 2 0 012-2h14a2 2 0 012 2v3a2 2 0 000 4v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 000-4z',
  tag: 'M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L2 12V2h10l8.6 8.6a2 2 0 010 2.8zM7 7h.01',
  logout: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  bus: 'M4 6a3 3 0 013-3h10a3 3 0 013 3v11H4zM4 11h16M7 17v3M17 17v3M8 14h.01M16 14h.01',
  car: 'M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M3 17v-4a2 2 0 012-2h14a2 2 0 012 2v4zM5 17v2M19 17v2M7 14h.01M17 14h.01',
  target: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 16a4 4 0 100-8 4 4 0 000 8zM12 2v3M12 19v3M2 12h3M19 12h3',
  luggage: 'M7 7h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2zM9 7V4h6v3M9 11v6M15 11v6',
  plane: 'M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z',
  hotel: 'M3 21V7l9-4 9 4v14M9 21v-6h6v6M8 10h.01M12 10h.01M16 10h.01', mail: 'M4 4h16v16H4zM22 6l-10 7L2 6',
  train: 'M4 15V6a4 4 0 014-4h8a4 4 0 014 4v9a3 3 0 01-3 3H7a3 3 0 01-3-3zM4 11h16M8 18l-2 3M16 18l2 3M8 15h.01M16 15h.01',
  home: 'M3 10l9-7 9 7v10a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10',
  wheel: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 15a3 3 0 100-6 3 3 0 000 6zM2 12h7M15 12h7M12 15v7',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z', x: 'M18 6L6 18M6 6l12 12', map: 'M1 6v16l7-4 8 4 7-4V2l-7 4-8-4zM8 2v16M16 6v16',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0114.8-3.4L23 10M1 14l4.7 4.4A9 9 0 0020.5 15',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', alert: 'M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0zM12 9v4M12 17h.01',
  bank: 'M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3', navi: 'M3 11l19-9-9 19-2-8-8-2z',
  copy: 'M9 9h13v13H9zM5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1', grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  zap: 'M13 2L3 14h9l-1 8 10-12h-9z', passport: 'M5 2h14a1 1 0 011 1v18a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1zM12 14a3 3 0 100-6 3 3 0 000 6zM8 18h8',
  coffee: 'M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4zM6 1v3M10 1v3M14 1v3', gift: 'M20 12v10H4V12M2 7h20v5H2zM12 22V7',
  waves: 'M2 12c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M2 18c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2',
  food: 'M3 2v7a3 3 0 003 3v10M6 2v20M9 2v7a3 3 0 01-3 3M18 15V2a5 5 0 00-5 5v6h5v9', umbrella: 'M23 12a11 11 0 00-22 0zM12 12v8a2 2 0 004 0',
  bag: 'M6 7h12l1 14H5zM9 7V5a3 3 0 016 0v2', star: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z',
  box: 'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8', truck: 'M1 3h15v13H1zM16 8h4l3 3v5h-7zM5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  bike: 'M5.5 18a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM18.5 18a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM12 18l-3-7h5l2 7M14 11h3M9 11L8 8H6',
  google: 'M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.5a4.7 4.7 0 01-2 3.1v2.6h3.3c1.9-1.8 3-4.4 3-7.6zM12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.6c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3v2.6A10 10 0 0012 22zM6.4 13.9a6 6 0 010-3.8V7.5H3a10 10 0 000 9zM12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 003 7.5l3.4 2.6C7.2 7.8 9.4 6 12 6z',
};
export type IconName = keyof typeof PATHS;

const BRAND = '#D90404';
export function Icon({ name, size = 18, color = '#0B1F3A', fill, strokeWidth = 2 }: { name: IconName; size?: number; color?: string; fill?: string; strokeWidth?: number }) {
  // bus / train / plane / hotel / car / box / bike use the solid two-tone "voyage" set
  if (isVoyage(name)) return color === BRAND
    ? <VoyageIcon name={name} size={Math.round(size * 1.2)} /> // theme-aware red/navy (light) or rose/ice (dark)
    : <VoyageIcon name={name} size={Math.round(size * 1.2)} color={color} accent={color} />;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill ?? 'none'} stroke={name === 'google' ? 'none' : color}
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d={PATHS[name]} fill={name === 'google' ? color : fill} />
    </Svg>
  );
}
