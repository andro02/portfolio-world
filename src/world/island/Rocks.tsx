import { useMemo } from 'react';
import { RigidBody } from '@react-three/rapier';
import { IcosahedronGeometry } from 'three';
import { projects } from '../../projects/registry';
import { distanceToPaths } from './paths';
import { between, createRandom } from './random';
import { shoreRadius, terrainHeight } from './islandShape';
import { applySeeThrough } from '../seeThrough';

const ROCK_COUNT = 45;
const ROCK_COLORS = ['#9a978d', '#b3afa3', '#86837a', '#a8a294'];
const COLLIDER_MIN_SCALE = 0.7; // smaller rocks are decoration the player walks through

interface Rock {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  color: string;
  variant: number;
}

// a few rock shapes: an icosahedron whose corners are pushed in or out; the push
// depends only on the corner's position, so corners shared by faces stay joined
function createRockGeometry(seed: number) {
  const geometry = new IcosahedronGeometry(1, 0);
  const position = geometry.attributes.position;

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const push = 0.75 + 0.5 * Math.abs(Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + seed));
    position.setXYZ(i, x * push, y * push * 0.7, z * push); // a bit flattened
  }

  geometry.computeVertexNormals();
  return geometry;
}

function isFreeSpot(x: number, z: number): boolean {
  const awayFromPaths = distanceToPaths(x, z) > 2;
  const awayFromStations = projects.every(
    ({ meta }) => Math.hypot(x - meta.position[0], z - meta.position[2]) > 4.5,
  );
  return awayFromPaths && awayFromStations;
}

function placeRocks(): Rock[] {
  const random = createRandom(42);
  const rocks: Rock[] = [];

  while (rocks.length < ROCK_COUNT) {
    // anywhere from the middle of the island to just past the shore,
    // so some rocks stand partly in the water
    const angle = random() * Math.PI * 2;
    const distance = shoreRadius(angle) * Math.sqrt(between(random, 0.05, 1.1));
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    if (!isFreeSpot(x, z)) continue;

    // mostly small rocks, now and then a big one
    const scale = random() < 0.15 ? between(random, 1.4, 2.4) : between(random, 0.3, 1.1);

    rocks.push({
      // sunk a little into the ground so they don't look placed on top of it
      position: [x, terrainHeight(x, z) - scale * 0.15, z],
      rotation: [between(random, -0.2, 0.2), random() * Math.PI * 2, between(random, -0.2, 0.2)],
      scale,
      color: ROCK_COLORS[Math.floor(random() * ROCK_COLORS.length)],
      variant: Math.floor(random() * 3),
    });
  }

  return rocks;
}

export function Rocks() {
  const geometries = useMemo(() => [1, 2, 3].map((seed) => createRockGeometry(seed)), []);
  const rocks = useMemo(() => placeRocks(), []);

  return (
    <>
      {rocks.map((rock, index) => {
        const mesh = (
          <mesh
            geometry={geometries[rock.variant]}
            rotation={rock.rotation}
            scale={rock.scale}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial
              color={rock.color}
              flatShading
              onBeforeCompile={applySeeThrough}
            />
          </mesh>
        );

        // only bigger rocks block the player; "hull" makes a collider that wraps
        // the rock's exact shape, like a sheet of plastic wrapped around it
        return rock.scale >= COLLIDER_MIN_SCALE ? (
          <RigidBody key={index} type="fixed" colliders="hull" position={rock.position}>
            {mesh}
          </RigidBody>
        ) : (
          <group key={index} position={rock.position}>
            {mesh}
          </group>
        );
      })}
    </>
  );
}
