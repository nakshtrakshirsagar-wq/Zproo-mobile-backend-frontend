import React from 'react';
import LinearGradient from 'react-native-linear-gradient';

// Smooth vertical fade drawn as ONE native gradient (no stacked strips, so no horizontal seam lines).
// `from="bottom"` is darkest at the bottom edge, `from="top"` at the top edge.
const STOPS = 16;

type Props = { from?: 'top' | 'bottom'; height: number; rgb?: [number, number, number]; maxOpacity?: number };

export default function FadeOverlay({ from = 'bottom', height, rgb = [10, 20, 40], maxOpacity = 0.85 }: Props) {
  const colors: string[] = [];
  const locations: number[] = [];
  // eased (smoothstep) opacity from the dark edge (t = 0) to fully transparent (t = 1)
  for (let i = 0; i < STOPS; i += 1) {
    const t = i / (STOPS - 1);
    const u = 1 - t;
    const opacity = maxOpacity * u * u * (3 - 2 * u);
    colors.push(`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${opacity.toFixed(3)})`);
    locations.push(t);
  }
  return (
    <LinearGradient
      pointerEvents="none"
      colors={colors}
      locations={locations}
      start={{ x: 0, y: from === 'bottom' ? 1 : 0 }}
      end={{ x: 0, y: from === 'bottom' ? 0 : 1 }}
      style={{ position: 'absolute', left: 0, right: 0, height, [from]: 0 }}
    />
  );
}
