import { useMemo } from 'react';
import { RigidBody } from '@react-three/rapier';
import { CylinderGeometry } from 'three';
import { projects } from '../../projects/registry';
import { GRASS_END, shoreRadius, terrainHeight } from './islandShape';
import { distanceToPaths } from './paths';
import { between, createRandom } from './random';
import { applySeeThrough } from '../seeThrough';

const CLIFF_COLORS = ['#8f8a80', '#a29c90', '#7f7a71'];
const START_RADIUS = 7; // first pillars stand a little away from the plaza
const SPACING = 2.4; // distance between pillars along a ridge
const CLEARANCE = 1.5; // free space kept between a pillar and the nearest path

interface Pillar {
  position: [number, number, number];
  radius: number;
  height: number;
  rotation: number;
  color: string;
  variant: number;
}

// a tall rock column: a cylinder with few sides whose corners are pushed in and
// out a little, and whose top is uneven; the sides stay vertical, so the player
// can't climb them
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

// ridges of pillars between every two neighbouring paths, from near the plaza
// to where the beach starts, so the paths become the natural way around
function placePillars(): Pillar[] {
  const random = createRandom(7);
  const pillars: Pillar[] = [];

  const angles = projects
    .map(({ meta }) => Math.atan2(meta.position[2], meta.position[0]))
    .sort((a, b) => a - b);

  angles.forEach((angle, index) => {
    const next =
      angles[(index + 1) % angles.length] + (index === angles.length - 1 ? Math.PI * 2 : 0);
    const ridgeAngle = (angle + next) / 2;
    const end = shoreRadius(ridgeAngle) * (GRASS_END + 0.05);

    for (let along = START_RADIUS; along < end; along += SPACING) {
      // wander a little to the sides so the ridge isn't a straight line
      const side = between(random, -1.2, 1.2);
      const x = Math.cos(ridgeAngle) * along - Math.sin(ridgeAngle) * side;
      const z = Math.sin(ridgeAngle) * along + Math.cos(ridgeAngle) * side;
      const radius = between(random, 1.2, 2.1);

      if (distanceToPaths(x, z) < radius + CLEARANCE) continue;

      pillars.push({
        // sunk into the ground so uneven terrain never shows a gap under it
        position: [x, terrainHeight(x, z) - 0.6, z],
        radius,
        height: between(random, 3.5, 6.5),
        rotation: random() * Math.PI * 2,
        color: CLIFF_COLORS[Math.floor(random() * CLIFF_COLORS.length)],
        variant: Math.floor(random() * 3),
      });
    }
  });

  return pillars;
}

export function Cliffs() {
  const geometries = useMemo(() => [1, 2, 3].map((seed) => createPillarGeometry(seed)), []);
  const pillars = useMemo(() => placePillars(), []);

  return (
    <>
      {pillars.map((pillar, index) => (
        // the collider wraps the exact shape of the pillar ("hull")
        <RigidBody key={index} type="fixed" colliders="hull" position={pillar.position}>
          <mesh
            geometry={geometries[pillar.variant]}
            scale={[pillar.radius, pillar.height, pillar.radius]}
            rotation={[0, pillar.rotation, 0]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial
              color={pillar.color}
              flatShading
              onBeforeCompile={applySeeThrough}
            />
          </mesh>
        </RigidBody>
      ))}
    </>
  );
}
