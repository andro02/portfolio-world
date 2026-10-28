import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import { FOAM_COLOR } from './water';

// A thin arc of water from one point to another, drawn as a row of drops that
// keep moving along the arc, like the jets of a fountain.

type Point = [number, number, number];

interface JetProps {
  from: Point;
  to: Point;
  height: number; // how high the arc rises above the straight line
  count?: number;
  period?: number; // seconds a drop takes from start to end
  size?: number;
}

export function Jet({ from, to, height, count = 14, period = 1.1, size = 0.045 }: JetProps) {
  const drops = useRef<(Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    drops.current.forEach((drop, index) => {
      if (!drop) return;
      // the drops are evenly spread along the arc and all move forward together
      const t = (clock.elapsedTime / period + index / count) % 1;
      const lift = height * 4 * t * (1 - t);
      drop.position.set(
        from[0] + (to[0] - from[0]) * t,
        from[1] + (to[1] - from[1]) * t + lift,
        from[2] + (to[2] - from[2]) * t,
      );
    });
  });

  return (
    <group>
      {Array.from({ length: count }, (_, index) => (
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
