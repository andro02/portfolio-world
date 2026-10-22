import { RigidBody } from '@react-three/rapier';

export function Terrain() {
  return (
    // fixed body: takes part in collisions but never moves
    <RigidBody type="fixed" colliders="cuboid">
      <mesh receiveShadow position={[0, -0.5, 0]}>
        <boxGeometry args={[100, 1, 100]} />
        <meshStandardMaterial color="#7cb26a" />
      </mesh>
    </RigidBody>
  );
}
