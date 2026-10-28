import { RigidBody } from '@react-three/rapier';
import { CylinderGeometry } from 'three';
import { registerOccluder } from '../occluders';

// A tall rock column, used by the cliff ridges and the waterfall.

// a cylinder with few sides whose corners are pushed in and out a little, and
// whose top is uneven; the sides stay vertical, so the player can't climb them
function createPillarGeometry(seed: number) {
  const geometry = new CylinderGeometry(1, 1.1, 1, 7, 2);
  geometry.translate(0, 0.5, 0); // base at y = 0, top at y = 1
  const position = geometry.attributes.position;

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const angle = Math.atan2(z, x);
    const push = 1 + 0.18 * Math.sin(angle * 3 + seed * 1.7);
    const topBump = y > 0.99 ? 0.12 * Math.sin(angle * 2 + seed) : 0;
    position.setXYZ(i, x * push, y + topBump, z * push);
  }

  geometry.computeVertexNormals();
  return geometry;
}

// a few shapes shared by all pillars; every pillar picks one with `variant`
export const PILLAR_VARIANTS = 3;
const geometries = Array.from({ length: PILLAR_VARIANTS }, (_, index) =>
  createPillarGeometry(index + 1),
);

export interface PillarProps {
  position: [number, number, number]; // middle of the base
  radius: number;
  height: number;
  rotation: number; // around the y axis
  color: string;
  variant: number; // 0 .. PILLAR_VARIANTS - 1
}

export function Pillar({ position, radius, height, rotation, color, variant }: PillarProps) {
  return (
    // the collider wraps the exact shape of the pillar ("hull")
    <RigidBody type="fixed" colliders="hull" position={position}>
      <mesh
        ref={registerOccluder}
        geometry={geometries[variant]}
        scale={[radius, height, radius]}
        rotation={[0, rotation, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={color} flatShading />
      </mesh>
    </RigidBody>
  );
}
