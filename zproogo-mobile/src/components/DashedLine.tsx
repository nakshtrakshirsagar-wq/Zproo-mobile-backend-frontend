import React from 'react';
import Svg, { Line } from 'react-native-svg';

/** Horizontal dashed line (React Native cannot draw a reliable one-sided dashed border on Android). */
export function DashedLine({ color, dash = 4, gap = 4, thickness = 1 }: { color: string; dash?: number; gap?: number; thickness?: number }) {
  return (
    <Svg width="100%" height={thickness}>
      <Line x1="0" y1={thickness / 2} x2="100%" y2={thickness / 2} stroke={color} strokeWidth={thickness} strokeDasharray={`${dash} ${gap}`} />
    </Svg>
  );
}
