import { useMemo } from 'react';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { DoubleSide } from 'three';
import { terrainHeight } from '../island/islandShape';
import { STONE } from '../surfaceTags';
import { between, createRandom } from '../island/random';
import { WATER_COLOR } from './water';
import { FACE, POND, STREAM_EXIT_ANGLE } from './waterfallLayout';

// The pond under the waterfall: water surrounded by an unbroken stone rim,
// open only where the river leaves it, with rocks on the rim, reeds, water
// lilies and bushes around it. The rim is a solid wall that the player has to
// jump over, and it reaches down into the ground all the way around, so the
// pond never floats above a slope.

const STONE_COLORS = ['#9a978d', '#b3afa3', '#86837a', '#a8a294'];
const BUSH_COLORS = ['#5f9a3a', '#6fae45', '#4f8a33'];
const RIM_TUBE = 0.42; // thickness of the rim
const OUTLET_WIDTH = 0.75; // angle of the opening where the river leaves
const RIM_RADIUS = POND.radius + 0.1;
const RIM_Y = POND.level - 0.05; // middle of the rim's tube
const RIM_TOP = RIM_Y + RIM_TUBE;
const WALL_BOTTOM = POND.lowestEdge - 0.4; // a bit under the lowest ground at the rim
const WALL_SEGMENTS = 20; // the solid wall is made of this many straight pieces

// angles are like Math.atan2(z, x) around the middle of the pond
const FRONT_ANGLE = Math.atan2(FACE.z, FACE.x);

// shortest difference between two angles, in -PI..PI
function angleBetween(a: number, b: number) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

function onRim(angle: number, extra = 0) {
  const distance = POND.radius + extra;
  const x = POND.x + Math.cos(angle) * distance;
  const z = POND.z + Math.sin(angle) * distance;
  return { x, z, y: terrainHeight(x, z) };
}

function placeRimRocks() {
  const random = createRandom(21);
  const rocks = [];
  const count = 22;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + between(random, -0.05, 0.05);
    if (Math.abs(angleBetween(angle, STREAM_EXIT_ANGLE)) < OUTLET_WIDTH / 2 + 0.05) continue;
    const { x, z } = onRim(angle, between(random, 0.05, 0.25));
    const size = between(random, 0.35, 0.6);
    rocks.push({
      position: [x, POND.level + 0.05, z] as [number, number, number],
      rotation: [random(), random() * Math.PI, random()] as [number, number, number],
      scale: [size * 1.2, size * 0.75, size] as [number, number, number],
      color: STONE_COLORS[Math.floor(random() * STONE_COLORS.length)],
    });
  }
  // two bigger rocks on both sides of the outlet
  for (const side of [-1, 1]) {
    const { x, z } = onRim(STREAM_EXIT_ANGLE + side * (OUTLET_WIDTH / 2 + 0.12), 0.2);
    rocks.push({
      position: [x, POND.level + 0.1, z] as [number, number, number],
      rotation: [0.3, side, 0.2] as [number, number, number],
      scale: [0.75, 0.6, 0.65] as [number, number, number],
      color: STONE_COLORS[2],
    });
  }
  return rocks;
}

// reeds: clumps of thin green spikes just inside the rim
const REED_ANGLES = [FRONT_ANGLE + 1.0, FRONT_ANGLE + 2.2, FRONT_ANGLE - 0.5];

// water lilies floating in the front half of the pond
const LILIES = [
  { angle: FRONT_ANGLE + 0.4, distance: 1.5, flower: true },
  { angle: FRONT_ANGLE - 0.3, distance: 1.9, flower: false },
  { angle: FRONT_ANGLE + 1.1, distance: 1.8, flower: false },
  { angle: FRONT_ANGLE + 0.9, distance: 1.1, flower: false },
];

// bushes outside the rim, away from the rocks and from the river
const BUSH_ANGLES = [FRONT_ANGLE + 0.6, FRONT_ANGLE + 1.4, FRONT_ANGLE + 2.1, FRONT_ANGLE - 0.25];

export function Pond() {
  const rimRocks = useMemo(() => placeRimRocks(), []);

  // three.js draws a torus as a ring in its own x-y plane, from angle 0 to
  // `arc`; lying flat, its angle a ends up at the world angle -a. The ring is
  // turned so that the gap is centred on the river's outlet.
  const rimArc = Math.PI * 2 - OUTLET_WIDTH;
  const rimStart = -(STREAM_EXIT_ANGLE + Math.PI * 2 - OUTLET_WIDTH / 2);

  // the rim goes from just past one side of the outlet all the way round to
  // the other side (angles like Math.atan2(z, x))
  const firstAngle = STREAM_EXIT_ANGLE + OUTLET_WIDTH / 2;
  const lastAngle = STREAM_EXIT_ANGLE + Math.PI * 2 - OUTLET_WIDTH / 2;
  const segmentAngle = (lastAngle - firstAngle) / WALL_SEGMENTS;
  const segmentLength = 2 * RIM_RADIUS * Math.sin(segmentAngle / 2) + 0.05;

  return (
    <group>
      {/* water */}
      <mesh position={[POND.x, POND.level, POND.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[POND.radius, 16]} />
        <meshStandardMaterial color={WATER_COLOR} roughness={0.15} transparent opacity={0.88} />
      </mesh>

      {/* solid wall under the rim: straight pieces of wall following the circle,
          from below the ground up to the top of the rim */}
      <RigidBody type="fixed" colliders={false} position={[POND.x, 0, POND.z]} userData={STONE}>
        {Array.from({ length: WALL_SEGMENTS }, (_, index) => {
          const angle = firstAngle + (index + 0.5) * segmentAngle;
          return (
            <CuboidCollider
              key={index}
              args={[segmentLength / 2, (RIM_TOP - WALL_BOTTOM) / 2, RIM_TUBE]}
              position={[
                Math.cos(angle) * RIM_RADIUS,
                (RIM_TOP + WALL_BOTTOM) / 2,
                Math.sin(angle) * RIM_RADIUS,
              ]}
              // turns the piece so it runs along the circle
              rotation={[0, -(angle + Math.PI / 2), 0]}
            />
          );
        })}
      </RigidBody>

      {/* stone wall from the rim down into the ground, so the pond sits on the
          ground even where it slopes away; an open tube with the outlet left out.
          three.js measures the angle of a cylinder from +z, so a world angle a
          is the cylinder angle PI / 2 - a */}
      <mesh position={[POND.x, (RIM_Y + WALL_BOTTOM) / 2, POND.z]} castShadow receiveShadow>
        <cylinderGeometry
          args={[
            RIM_RADIUS,
            RIM_RADIUS + 0.15,
            RIM_Y - WALL_BOTTOM,
            24,
            1,
            true,
            Math.PI / 2 - lastAngle,
            lastAngle - firstAngle,
          ]}
        />
        <meshStandardMaterial color={STONE_COLORS[2]} flatShading side={DoubleSide} />
      </mesh>

      {/* unbroken stone rim, open only at the outlet */}
      <group position={[POND.x, RIM_Y, POND.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh rotation={[0, 0, rimStart]} castShadow receiveShadow>
          <torusGeometry args={[RIM_RADIUS, RIM_TUBE, 5, 24, rimArc]} />
          <meshStandardMaterial color={STONE_COLORS[0]} flatShading />
        </mesh>
      </group>

      {rimRocks.map((rock, index) => (
        <mesh
          key={index}
          position={rock.position}
          rotation={rock.rotation}
          scale={rock.scale}
          castShadow
          receiveShadow
        >
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={rock.color} flatShading />
        </mesh>
      ))}

      {REED_ANGLES.map((angle, clump) => {
        const x = POND.x + Math.cos(angle) * (POND.radius - 0.35);
        const z = POND.z + Math.sin(angle) * (POND.radius - 0.35);
        return (
          <group key={clump} position={[x, POND.level, z]}>
            {[0, 1, 2, 3, 4].map((index) => {
              const height = 0.6 + ((index * 3 + clump) % 4) * 0.12;
              return (
                <mesh
                  key={index}
                  position={[
                    Math.cos(index * 2.4) * 0.15,
                    height / 2,
                    Math.sin(index * 2.4) * 0.15,
                  ]}
                  rotation={[Math.sin(index) * 0.15, 0, Math.cos(index) * 0.15]}
                  castShadow
                >
                  <coneGeometry args={[0.03, height, 4]} />
                  <meshStandardMaterial color={index % 2 ? '#6c9a3a' : '#7fae45'} flatShading />
                </mesh>
              );
            })}
          </group>
        );
      })}

      {LILIES.map(({ angle, distance, flower }, index) => (
        <group
          key={index}
          position={[
            POND.x + Math.cos(angle) * distance,
            POND.level + 0.012,
            POND.z + Math.sin(angle) * distance,
          ]}
          rotation={[0, index * 1.7, 0]}
        >
          {/* a round leaf with a notch cut out of it */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.28, 10, 0.4, Math.PI * 2 - 0.5]} />
            <meshStandardMaterial color="#4f9a3c" />
          </mesh>
          {flower && (
            <mesh position={[0.05, 0.07, 0]}>
              <coneGeometry args={[0.1, 0.14, 5]} />
              <meshStandardMaterial color="#f28cb1" flatShading />
            </mesh>
          )}
        </group>
      ))}

      {BUSH_ANGLES.map((angle, index) => {
        const { x, y, z } = onRim(angle, 1.1);
        return (
          <group key={index} position={[x, y, z]}>
            {[
              [0, 0.3, 0, 0.42],
              [0.32, 0.22, 0.1, 0.3],
              [-0.25, 0.2, 0.2, 0.28],
            ].map(([bx, by, bz, size], leaf) => (
              <mesh
                key={leaf}
                position={[bx, by, bz]}
                scale={[1, 0.85, 1]}
                castShadow
                receiveShadow
              >
                <icosahedronGeometry args={[size, 0]} />
                <meshStandardMaterial
                  color={BUSH_COLORS[(index + leaf) % BUSH_COLORS.length]}
                  flatShading
                />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}
