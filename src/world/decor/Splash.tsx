import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import { FOAM_COLOR } from './water';

// Small drops jumping up and out from one point in arcs, over and over:
// the splash where falling water hits the surface, or the jet of a fountain.

interface SplashProps {
  count?: number;
  spread?: number; // how far from the middle the drops land
  height?: number; // how high the drops jump
  period?: number; // seconds one jump takes
  size?: number;
}

export function Splash({
  count = 10,
  spread = 0.6,
  height = 0.5,
  period = 0.9,
  size = 0.05,
}: SplashProps) {
  const drops = useRef<(Mesh | null)[]>([]);

  // every drop flies in its own direction, a little further or shorter, and
  // starts at its own time, so they don't move all together
  const flights = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => ({
        angle: (index / count) * Math.PI * 2 + ((index * 1.7) % 1),
        distance: spread * (0.6 + ((index * 7) % 5) / 10),
        start: (index * 0.37) % 1,
      })),
    [count, spread],
  );

  useFrame(({ clock }) => {
    drops.current.forEach((drop, index) => {
      if (!drop) return;
      const { angle, distance, start } = flights[index];
      const t = (clock.elapsedTime / period + start) % 1;
      drop.position.set(
        Math.cos(angle) * distance * t,
        height * 4 * t * (1 - t), // a parabola: 0 at the start and the end, `height` in the middle
        Math.sin(angle) * distance * t,
      );
      drop.scale.setScalar(1 - t * 0.6);
    });
  });

  return (
    <group>
      {flights.map((_, index) => (
        <mesh
          key={index}
          ref={(drop) => {
            drops.current[index] = drop;
          }}
        >
          <icosahedronGeometry args={[size, 0]} />
          <meshBasicMaterial color={FOAM_COLOR} />
        </mesh>
      ))}
    </group>
  );
}
