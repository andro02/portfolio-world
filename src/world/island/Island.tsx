import { useMemo } from 'react';
import { CylinderCollider, RigidBody } from '@react-three/rapier';
import { CylinderGeometry } from 'three';
import { BEACH_RADIUS, GRASS_RADIUS, rimScale } from './islandShape';

const SAND_COLOR = '#f2d49b';
const GRASS_COLOR = '#8cc152';

// a cylinder whose rim follows the island outline instead of a perfect circle
function createLayerGeometry(topRadius: number, bottomRadius: number, height: number) {
  const geometry = new CylinderGeometry(topRadius, bottomRadius, height, 64, 1);
  const position = geometry.attributes.position;

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const scale = rimScale(Math.atan2(z, x));
    position.setX(i, x * scale);
    position.setZ(i, z * scale);
  }

  geometry.computeVertexNormals();
  return geometry;
}

export function Island() {
  // sand reaches down into the sea, grass is a thin layer on top of it
  const sand = useMemo(() => createLayerGeometry(BEACH_RADIUS, BEACH_RADIUS + 2, 4), []);
  const grass = useMemo(() => createLayerGeometry(GRASS_RADIUS, GRASS_RADIUS + 0.5, 0.4), []);

  return (
    <RigidBody type="fixed" colliders={false}>
      {/* the walkable surface: a flat disc whose top is at y = 0 */}
      <CylinderCollider args={[2, BEACH_RADIUS]} position={[0, -2, 0]} />

      <mesh geometry={sand} position={[0, -2, 0]} receiveShadow>
        <meshStandardMaterial color={SAND_COLOR} flatShading />
      </mesh>

      {/* slightly above the sand so the two surfaces don't flicker */}
      <mesh geometry={grass} position={[0, -0.18, 0]} receiveShadow>
        <meshStandardMaterial color={GRASS_COLOR} flatShading />
      </mesh>
    </RigidBody>
  );
}
