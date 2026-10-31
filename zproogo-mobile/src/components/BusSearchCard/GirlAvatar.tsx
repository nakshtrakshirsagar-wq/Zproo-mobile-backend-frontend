import React from 'react';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

/**
 * The little "girl" face used for Booking for women (long dark hair with a centre parting,
 * soft smile, rosy cheeks). Pure SVG so it stays sharp at every size and needs no image file.
 * `bg` is the soft peach disc behind the face; pass `bg="transparent"` for the face only.
 */
export function GirlAvatar({ size = 52, bg = '#FDE8DE' }: { size?: number; bg?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="Women">
      <Circle cx="50" cy="50" r="50" fill={bg} />
      {/* long hair behind the face + shoulders */}
      <Path d="M26 50 C24 26 36 15 50 15 C64 15 76 26 74 50 L75 80 C75 86 70 88 66 86 L34 86 C30 88 25 86 25 80 Z" fill="#1B1B1F" />
      {/* neck */}
      <Path d="M43 70 H57 V82 C57 86 43 86 43 82 Z" fill="#EFC6A3" />
      {/* face */}
      <Ellipse cx="50" cy="53" rx="21" ry="24" fill="#F7D6B8" />
      {/* hair on top: centre parting with side sweeps */}
      <Path d="M28 52 C26 30 38 20 50 20 C62 20 74 30 72 52 C70 42 64 34 52 30 C50 36 44 42 28 52 Z" fill="#1B1B1F" />
      <Path d="M50 20 C50 28 49 31 47 33" stroke="#2C2C33" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* ears */}
      <Ellipse cx="29.5" cy="55" rx="2.6" ry="4" fill="#F0C7A3" />
      <Ellipse cx="70.5" cy="55" rx="2.6" ry="4" fill="#F0C7A3" />
      {/* eyes */}
      <Ellipse cx="41" cy="55" rx="2.4" ry="3" fill="#2B2B30" />
      <Ellipse cx="59" cy="55" rx="2.4" ry="3" fill="#2B2B30" />
      <Circle cx="41.8" cy="54" r="0.8" fill="#fff" />
      <Circle cx="59.8" cy="54" r="0.8" fill="#fff" />
      {/* brows */}
      <Path d="M36.5 49 Q41 46.5 45.5 49" stroke="#3A2A22" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <Path d="M54.5 49 Q59 46.5 63.5 49" stroke="#3A2A22" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {/* cheeks + nose + smile */}
      <Ellipse cx="36" cy="63" rx="4" ry="2.6" fill="#F4A9A0" opacity={0.55} />
      <Ellipse cx="64" cy="63" rx="4" ry="2.6" fill="#F4A9A0" opacity={0.55} />
      <Path d="M49 59 Q50 61 51 59" stroke="#D9A07F" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <Path d="M43.5 66.5 Q50 72 56.5 66.5" stroke="#B5524A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </Svg>
  );
}
