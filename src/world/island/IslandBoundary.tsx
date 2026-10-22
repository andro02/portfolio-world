import { useMemo } from 'react';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { BEACH_RADIUS, rimScale } from './islandShape';

const WALL_COUNT = 48;
const SHORE_MARGIN = 1; // keeps the player this far from the water's edge

// invisible walls just inside the shoreline that stop the player from
// walking into the sea
export function IslandBoundary() {
  const walls = useMemo(
    () =>
      Array.from({ length: WALL_COUNT }, (_, index) => {
        const angle = (index / WALL_COUNT) * Math.PI * 2;
        const radius = BEACH_RADIUS * rimScale(angle) - SHORE_MARGIN;
        const length = (2 * Math.PI * radius) / WALL_COUNT;
        return { angle, radius, length };
      }),
    [],
  );

  return (
    <RigidBody type="fixed" colliders={false}>
      {walls.map(({ angle, radius, length }) => (
        <CuboidCollider
          key={angle}
          // half sizes: thin across the shore, tall, slightly longer than the gap
          args={[0.5, 3, length * 0.6]}
          position={[Math.cos(angle) * radius, 2, Math.sin(angle) * radius]}
          // turn the wall so it runs along the shoreline
          rotation={[0, -angle, 0]}
        />
      ))}
    </RigidBody>
  );
}
