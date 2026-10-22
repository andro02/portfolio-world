import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import { BEACH_RADIUS, WATER_LEVEL } from './islandShape';

export function Water() {
  const foam = useRef<Mesh>(null);

  // gently pulse the ring of foam around the island
  useFrame(({ clock }) => {
    if (!foam.current) return;
    const scale = 1 + Math.sin(clock.elapsedTime * 1.2) * 0.012;
    foam.current.scale.set(scale, scale, 1);
  });

  return (
    <>
      {/* planes are vertical by default, so they are rotated to lie flat */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, WATER_LEVEL, 0]}>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color="#4cc3e0" roughness={0.25} metalness={0.05} />
      </mesh>

      <mesh ref={foam} rotation={[-Math.PI / 2, 0, 0]} position={[0, WATER_LEVEL + 0.02, 0]}>
        <ringGeometry args={[BEACH_RADIUS * 0.95, BEACH_RADIUS * 1.12, 64]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.35} />
      </mesh>
    </>
  );
}
