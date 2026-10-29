import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh, MeshBasicMaterial } from 'three';
import { FOAM_COLOR } from './water';

// White rings that spread out on a water surface and fade, one after another,
// where water falls in. Placed on the surface, lying flat.

interface RipplesProps {
  radius: number; // size of a ring when it has spread out completely
  startScale?: number; // size of a new ring, as a part of `radius`
  count?: number;
  period?: number; // seconds a ring takes to spread out
  opacity?: number;
  color?: string;
}

export function Ripples({
  radius,
  startScale = 0.2,
  count = 3,
  period = 2.4,
  opacity = 0.6,
  color = FOAM_COLOR,
}: RipplesProps) {
  const rings = useRef<(Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    rings.current.forEach((ring, index) => {
      if (!ring) return;
      // every ring is at a different point of the same cycle
      const t = (clock.elapsedTime / period + index / count) % 1;
      ring.scale.setScalar(startScale + (1 - startScale) * t);
      (ring.material as MeshBasicMaterial).opacity = (1 - t) * opacity;
    });
  });

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      {Array.from({ length: count }, (_, index) => (
        <mesh
          key={index}
          ref={(ring) => {
            rings.current[index] = ring;
          }}
        >
          <ringGeometry args={[radius * 0.9, radius, 24]} />
          <meshBasicMaterial color={color} transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
