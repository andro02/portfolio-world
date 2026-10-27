import { CuboidCollider } from '@react-three/rapier';
import type { StationModelProps } from '../projects/types';

// plain pedestal used by projects that don't have their own station model yet
export function DefaultPedestal({ highlighted }: StationModelProps) {
  return (
    <>
      <CuboidCollider args={[1, 0.75, 1]} position={[0, 0.75, 0]} />
      <mesh castShadow receiveShadow position={[0, 0.75, 0]}>
        <boxGeometry args={[2, 1.5, 2]} />
        <meshStandardMaterial color={highlighted ? '#ffd166' : '#e9e4d8'} />
      </mesh>
    </>
  );
}
