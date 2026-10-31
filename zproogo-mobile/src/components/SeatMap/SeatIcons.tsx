import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

/** Armchair (seater) - paths copied from the HTML prototype (32x32, stroke 1.7). */
export function Armchair({ size = 32, stroke, fill = 'none', innerStroke }: { size?: number; stroke: string; fill?: string; innerStroke?: string }) {
  const common = { fill: 'none', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Path {...common} fill={fill} stroke={stroke} d="M6 11.6H4.3a3.5 3.5 0 0 0-3.5 3.5v12.6a3.5 3.5 0 0 0 3.5 3.5h23.4a3.5 3.5 0 0 0 3.5-3.5V15.1a3.5 3.5 0 0 0-3.5-3.5H26" />
      <Path {...common} fill={fill} stroke={stroke} d="M2.6 12.5V4a3 3 0 0 1 3-3h20.8a3 3 0 0 1 3 3v8.5" />
      <Path {...common} fill={fill} stroke={innerStroke ?? stroke} d="M6 11.6v10.8A2.6 2.6 0 0 0 8.6 25h14.8a2.6 2.6 0 0 0 2.6-2.6V11.6" />
    </Svg>
  );
}

/** "Reserved for women" marker. */
export function Woman({ size = 12, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Circle cx={12} cy={4.6} r={2.8} />
      <Path d="M12 8.6c-2.1 0-3.6 1.5-4.1 4l-1.6 6.2h3.2V22h5V18.8h3.2l-1.6-6.2c-.5-2.5-2-4-4.1-4z" />
    </Svg>
  );
}

export function Steering({ size = 32, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round">
      <Circle cx={16} cy={16} r={12.5} />
      <Circle cx={16} cy={16} r={3.2} fill={color} stroke="none" />
      <Path d="M3.8 14.2c4.2 1 8.4 1.4 9.2 1.8M28.2 14.2c-4.2 1-8.4 1.4-9.2 1.8M16 19.5V28" />
    </Svg>
  );
}
