import { useMemo } from 'react';
import { BufferGeometry, DoubleSide, Float32BufferAttribute } from 'three';
import { terrainHeight, WATER_LEVEL } from '../island/islandShape';
import { Pillar } from '../island/Pillar';
import { between, createRandom } from '../island/random';
import { Ripples } from './Ripples';
import { Splash } from './Splash';
import { WATER_COLOR, useFlowTexture } from './water';
import {
  CLIFF,
  CLIFF_BASE_Y,
  FACE_ROTATION,
  LEDGE_TIP,
  POND,
  SOURCE_Y,
  STREAM,
  STREAM_ANGLE,
  STREAM_HALF_WIDTH,
  WATERFALL_PILLARS,
} from './waterfallLayout';

// Waterfall: water runs over a rock ledge, falls into a pond and flows on
// down the beach into the sea. The positions come from waterfallLayout.ts.

const FALL_WIDTH = 1.3;
const ROCK_COLORS = ['#9a978d', '#b3afa3', '#86837a'];

// rocks around the pond, with a gap where the stream leaves it
function placePondRocks() {
  const random = createRandom(11);
  const rocks = [];
  const count = 14;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + between(random, -0.1, 0.1);
    // the stream leaves the pond at STREAM_ANGLE: leave that part open
    const toStream = Math.abs(
      Math.atan2(Math.sin(angle - STREAM_ANGLE), Math.cos(angle - STREAM_ANGLE)),
    );
    if (toStream < 0.45) continue;

    const x = POND.x + Math.cos(angle) * (POND.radius + 0.15);
    const z = POND.z + Math.sin(angle) * (POND.radius + 0.15);
    const size = between(random, 0.35, 0.6);
    rocks.push({
      position: [x, Math.max(terrainHeight(x, z), POND.level - 0.25), z] as [
        number,
        number,
        number,
      ],
      rotation: [random(), random() * Math.PI, random()] as [number, number, number],
      scale: [size * 1.2, size * 0.8, size] as [number, number, number],
      color: ROCK_COLORS[Math.floor(random() * ROCK_COLORS.length)],
    });
  }
  return rocks;
}

// a flat ribbon of water along the stream points, lying a little above the
// ground; its texture runs from the pond towards the sea
function createStreamGeometry() {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // length of the stream, so the texture coordinates can count down towards the sea
  let total = 0;
  for (let i = 1; i < STREAM.length; i++) {
    total += Math.hypot(STREAM[i].x - STREAM[i - 1].x, STREAM[i].z - STREAM[i - 1].z);
  }

  let along = 0;
  STREAM.forEach((point, i) => {
    const previous = STREAM[Math.max(0, i - 1)];
    const next = STREAM[Math.min(STREAM.length - 1, i + 1)];
    if (i > 0) along += Math.hypot(point.x - previous.x, point.z - previous.z);

    // sideways direction at this point
    const dx = next.x - previous.x;
    const dz = next.z - previous.z;
    const length = Math.hypot(dx, dz);
    const sideX = -dz / length;
    const sideZ = dx / length;

    // starts at the pond's level, then follows the ground down to the sea
    const ground = Math.max(terrainHeight(point.x, point.z) + 0.1, WATER_LEVEL + 0.05);
    const blend = Math.min(1, i / 4);
    const y = POND.level * (1 - blend) + ground * blend;

    for (const side of [-1, 1]) {
      positions.push(
        point.x + sideX * STREAM_HALF_WIDTH * side,
        y,
        point.z + sideZ * STREAM_HALF_WIDTH * side,
      );
      uvs.push(side < 0 ? 0 : 1, (total - along) / 2);
    }

    if (i > 0) {
      const a = (i - 1) * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function Waterfall() {
  const pondRocks = useMemo(() => placePondRocks(), []);
  const streamGeometry = useMemo(() => createStreamGeometry(), []);

  const fall = useFlowTexture(1.6, 2, 3);
  const ledgeWater = useFlowTexture(1.2, 2, 1);
  const stream = useFlowTexture(0.6, 1, 1);

  // heights relative to the rock's base, where the waterfall group stands
  const sourceY = SOURCE_Y - CLIFF_BASE_Y;
  const pondY = POND.level - CLIFF_BASE_Y;
  const fallHeight = sourceY + 0.2 - pondY;

  const flowingWater = {
    color: WATER_COLOR,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  } as const;

  return (
    <>
      {WATERFALL_PILLARS.map((pillar, index) => (
        <Pillar key={index} {...pillar} />
      ))}

      {/* everything on the main rock, turned so that +z is the front */}
      <group position={[CLIFF.x, CLIFF_BASE_Y, CLIFF.z]} rotation={[0, FACE_ROTATION, 0]}>
        {/* ledge sticking out of the rock, and the water running over it */}
        <mesh position={[0, sourceY - 0.2, LEDGE_TIP - 0.8]} castShadow receiveShadow>
          <boxGeometry args={[FALL_WIDTH + 0.5, 0.4, 1.6]} />
          <meshStandardMaterial color="#8f8a80" flatShading />
        </mesh>
        <mesh position={[0, sourceY + 0.01, LEDGE_TIP - 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[FALL_WIDTH, 1.2]} />
          <meshStandardMaterial
            {...flowingWater}
            map={ledgeWater}
            alphaMap={ledgeWater}
            opacity={0.9}
          />
        </mesh>

        {/* the falling water, from the end of the ledge down to the pond */}
        <mesh position={[0, pondY + fallHeight / 2, LEDGE_TIP + 0.02]}>
          <planeGeometry args={[FALL_WIDTH, fallHeight]} />
          <meshStandardMaterial {...flowingWater} map={fall} alphaMap={fall} opacity={0.85} />
        </mesh>

        {/* where it hits the pond: foam, drops and rings */}
        <group position={[0, pondY + 0.02, LEDGE_TIP + 0.1]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.75, 8]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.55} depthWrite={false} />
          </mesh>
          <Splash count={12} spread={0.9} height={0.45} period={0.7} size={0.06} />
          <Ripples radius={1.6} startScale={0.35} period={1.8} />
        </group>
      </group>

      {/* pond */}
      <mesh position={[POND.x, POND.level, POND.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[POND.radius, 12]} />
        <meshStandardMaterial color={WATER_COLOR} roughness={0.2} transparent opacity={0.85} />
      </mesh>
      {pondRocks.map((rock, index) => (
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

      {/* stream down to the sea */}
      <mesh geometry={streamGeometry}>
        <meshStandardMaterial
          {...flowingWater}
          map={stream}
          alphaMap={stream}
          opacity={0.9}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>
    </>
  );
}
