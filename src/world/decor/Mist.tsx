import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh, MeshBasicMaterial } from 'three';

// Soft white puffs that rise, grow and fade where a waterfall hits the water.

interface MistProps {
  count?: number;
  spread?: number; // how far the puffs drift from the middle
  rise?: number; // how high they rise before they disappear
  size?: number;
  period?: number; // seconds one puff lives
  opacity?: number;
  color?: string;
}

export function Mist({
  count = 9,
  spread = 1,
  rise = 1.4,
  size = 0.35,
  period = 3.2,
  opacity = 0.14,
  color = '#ffffff',
}: MistProps) {
  const puffs = useRef<(Mesh | null)[]>([]);

  const paths = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => ({
        angle: (index / count) * Math.PI * 2 + ((index * 2.3) % 1),
        start: (index * 0.41) % 1,
      })),
    [count],
  );

  useFrame(({ clock }) => {
    puffs.current.forEach((puff, index) => {
      if (!puff) return;
      const { angle, start } = paths[index];
      const t = (clock.elapsedTime / period + start) % 1;
      puff.position.set(Math.cos(angle) * spread * t, rise * t, Math.sin(angle) * spread * t);
      puff.scale.setScalar(size * (0.6 + t));
      // fades in quickly and out slowly
      (puff.material as MeshBasicMaterial).opacity = opacity * Math.sin(Math.PI * Math.sqrt(t));
    });
  });

  return (
    <group>
      {paths.map((_, index) => (
        <mesh
          key={index}
          ref={(puff) => {
            puffs.current[index] = puff;
          }}
        >
          <icosahedronGeometry args={[1, 1]} />
          <meshBasicMaterial color={color} transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
