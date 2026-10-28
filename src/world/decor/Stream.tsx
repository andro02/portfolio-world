import { useMemo } from 'react';
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute } from 'three';
import { WATER_LEVEL, terrainHeight } from '../island/islandShape';
import { between, createRandom } from '../island/random';
import { Ripples } from './Ripples';
import { FOAM_COLOR, WATER_COLOR, useFlowTexture } from './water';
import { POND, STREAM, STREAM_HALF_WIDTH } from './waterfallLayout';

// The river from the pond to the sea: a ribbon of flowing water lying on the
// ground, foamy along its banks, with low stone edges and pebbles on both
// banks, a few rocks in the water, and foam where it meets the sea.

const PEBBLE_COLORS = ['#a8a294', '#8f8b82', '#bdb7aa'];
const LIFT = 0.1; // the water lies this much above the ground

// a point of the river with its sideways direction and height
interface RiverPoint {
  x: number;
  z: number;
  sideX: number;
  sideZ: number;
  y: number;
  along: number; // distance from the pond
}

function riverPoints(): RiverPoint[] {
  let along = 0;
  return STREAM.map((point, i) => {
    const previous = STREAM[Math.max(0, i - 1)];
    const next = STREAM[Math.min(STREAM.length - 1, i + 1)];
    if (i > 0) along += Math.hypot(point.x - previous.x, point.z - previous.z);
    const dx = next.x - previous.x;
    const dz = next.z - previous.z;
    const length = Math.hypot(dx, dz);
    // starts at the pond's level, then follows the ground down to the sea
    const ground = Math.max(terrainHeight(point.x, point.z) + LIFT, WATER_LEVEL + 0.05);
    const blend = Math.min(1, i / 4);
    return {
      x: point.x,
      z: point.z,
      sideX: -dz / length,
      sideZ: dx / length,
      y: POND.level * (1 - blend) + ground * blend,
      along,
    };
  });
}

// three vertices across the river (bank, middle, bank) at every point; the
// banks are coloured almost white for foam, the middle in the water colour
function createRiverGeometry(points: RiverPoint[]) {
  const positions: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const total = points[points.length - 1].along;
  const water = new Color(WATER_COLOR);
  const foam = new Color(WATER_COLOR).lerp(new Color(FOAM_COLOR), 0.65);

  points.forEach((point, i) => {
    [-1, 0, 1].forEach((side) => {
      positions.push(
        point.x + point.sideX * STREAM_HALF_WIDTH * side,
        point.y,
        point.z + point.sideZ * STREAM_HALF_WIDTH * side,
      );
      const color = side === 0 ? water : foam;
      colors.push(color.r, color.g, color.b);
      // the texture coordinate along the river counts down towards the sea,
      // so the texture, which moves towards lower values, flows to the sea
      uvs.push((side + 1) / 2, (total - point.along) / 2);
    });

    if (i > 0) {
      const a = (i - 1) * 3; // first vertex of the previous row
      const b = i * 3;
      indices.push(a, a + 1, b, a + 1, b + 1, b, a + 1, a + 2, b + 1, a + 2, b + 2, b + 1);
    }
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// low stone edges along both banks, from the water's edge down into the
// ground; where the river starts higher than the ground (at the pond) they
// fill the gap under the water, so it never floats
function createBankGeometry(points: RiverPoint[]) {
  const positions: number[] = [];
  const indices: number[] = [];
  for (const side of [-1, 1]) {
    const start = positions.length / 3;
    points.forEach((point, i) => {
      const x = point.x + point.sideX * STREAM_HALF_WIDTH * side;
      const z = point.z + point.sideZ * STREAM_HALF_WIDTH * side;
      positions.push(x, point.y + 0.02, z, x, terrainHeight(x, z) - 0.3, z);
      if (i > 0) {
        const a = start + (i - 1) * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    });
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// pebbles along both banks, skipping the start (the pond's rim is there) and
// the part that is already in the sea
function placePebbles(points: RiverPoint[]) {
  const random = createRandom(31);
  const pebbles = [];
  for (let i = 3; i < points.length; i++) {
    const point = points[i];
    if (point.y <= WATER_LEVEL + 0.06) break;
    for (const side of [-1, 1]) {
      if (random() < 0.25) continue;
      const offset = STREAM_HALF_WIDTH + between(random, 0.05, 0.3);
      const x = point.x + point.sideX * offset * side;
      const z = point.z + point.sideZ * offset * side;
      const size = between(random, 0.1, 0.24);
      pebbles.push({
        position: [x, terrainHeight(x, z) + size * 0.3, z] as [number, number, number],
        rotation: [random(), random() * Math.PI, random()] as [number, number, number],
        scale: [size * 1.3, size * 0.7, size] as [number, number, number],
        color: PEBBLE_COLORS[Math.floor(random() * PEBBLE_COLORS.length)],
      });
    }
  }
  return pebbles;
}

// a few rocks standing in the water, part of the way down
const ROCKS_IN_WATER = [
  { at: 0.3, side: 0.35, size: 0.32 },
  { at: 0.55, side: -0.4, size: 0.26 },
  { at: 0.78, side: 0.2, size: 0.3 },
];

export function Stream() {
  const points = useMemo(() => riverPoints(), []);
  const geometry = useMemo(() => createRiverGeometry(points), [points]);
  const pebbles = useMemo(() => placePebbles(points), [points]);
  const banks = useMemo(() => createBankGeometry(points), [points]);
  const flow = useFlowTexture(0.7, 1, 1);
  const mouth = points[points.length - 1];

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          vertexColors
          map={flow}
          alphaMap={flow}
          transparent
          opacity={0.92}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>

      <mesh geometry={banks} receiveShadow>
        <meshStandardMaterial color={PEBBLE_COLORS[1]} flatShading side={DoubleSide} />
      </mesh>

      {pebbles.map((pebble, index) => (
        <mesh
          key={index}
          position={pebble.position}
          rotation={pebble.rotation}
          scale={pebble.scale}
          castShadow
          receiveShadow
        >
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={pebble.color} flatShading />
        </mesh>
      ))}

      {ROCKS_IN_WATER.map(({ at, side, size }, index) => {
        const point = points[Math.floor(at * (points.length - 1))];
        const x = point.x + point.sideX * side;
        const z = point.z + point.sideZ * side;
        return (
          <mesh
            key={index}
            position={[x, point.y, z]}
            rotation={[index, index * 1.3, 0.3]}
            scale={[size * 1.2, size * 0.8, size]}
            castShadow
          >
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={PEBBLE_COLORS[index % 3]} flatShading />
          </mesh>
        );
      })}

      {/* foam where the river meets the sea */}
      <group position={[mouth.x, WATER_LEVEL + 0.12, mouth.z]}>
        <Ripples radius={1.6} startScale={0.3} period={2} />
      </group>
    </group>
  );
}
