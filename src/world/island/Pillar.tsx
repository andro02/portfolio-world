import { RigidBody } from '@react-three/rapier';
import { ROCK } from '../surfaceTags';
import { registerOccluder } from '../occluders';
import { pillarGeometry } from './pillarShape';

// A tall rock column, used by the cliff ridges and the waterfall.

export interface PillarProps {
  position: [number, number, number]; // middle of the base
  radius: number;
  height: number;
  rotation: number; // around the y axis
  color: string;
  variant: number; // 0 .. PILLAR_VARIANTS - 1
  flatTop?: boolean; // for rocks that have something standing on them
}

export function Pillar({
  position,
  radius,
  height,
  rotation,
  color,
  variant,
  flatTop = false,
}: PillarProps) {
  return (
    // the collider wraps the exact shape of the pillar ("hull")
    <RigidBody type="fixed" colliders="hull" position={position} userData={ROCK}>
      <mesh
        ref={registerOccluder}
        geometry={pillarGeometry(variant, flatTop)}
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
