import React from 'react';
import Svg, { Path } from 'react-native-svg';

/** Down chevron (same path as the HTML mock-up). `open` flips it up. */
export function Chevron({ size = 16, color, open, strokeWidth = 2.4 }: { size?: number; color: string; open?: boolean; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}
