import { GRASS_END, WATER_LEVEL, shoreRadius, terrainHeight } from '../island/islandShape';
import type { PillarProps } from '../island/Pillar';

// Where the waterfall and everything around it stands. Rocks and the cliff
// ridges use distanceToWaterfall to keep out of its way.
//
// A tall rock stands at the end of the cliff ridge between the paths to
// Landfill Detection and Fleet Monitoring. Water falls from a ledge on it into
// a pond in front of it, and a stream runs from the pond down the beach into
// the sea.

const ANGLE = -0.94; // direction of the ridge, seen from the island centre
const CLIFF_DISTANCE = shoreRadius(ANGLE) * (GRASS_END - 0.02);

export const CLIFF = {
  x: Math.cos(ANGLE) * CLIFF_DISTANCE,
  z: Math.sin(ANGLE) * CLIFF_DISTANCE,
  radius: 2.3,
  height: 7.5,
};
// the rock is sunk into the ground, like the other pillars
export const CLIFF_BASE_Y = terrainHeight(CLIFF.x, CLIFF.z) - 0.6;

// the waterfall faces mostly +z, where the camera looks from, and a little
// towards the island centre
const faceX = -Math.cos(ANGLE) * 0.5;
const faceZ = -Math.sin(ANGLE) * 0.5 + 1;
const faceLength = Math.hypot(faceX, faceZ);
export const FACE = { x: faceX / faceLength, z: faceZ / faceLength };
// rotation around y that turns a model's +z towards FACE
export const FACE_ROTATION = Math.atan2(FACE.x, FACE.z);
// sideways, at a right angle to FACE
const SIDE = { x: FACE.z, z: -FACE.x };

// the main rock and two lower ones next to it, framing the pond
export const WATERFALL_PILLARS: PillarProps[] = [
  {
    position: [CLIFF.x, CLIFF_BASE_Y, CLIFF.z],
    radius: CLIFF.radius,
    height: CLIFF.height,
    rotation: 0.4,
    color: '#8f8a80',
    variant: 0,
  },
  ...[
    { side: 2.9, forward: 1.1, radius: 1.5, height: 5.2, color: '#a29c90', variant: 1 },
    { side: -2.8, forward: 0.9, radius: 1.4, height: 4.3, color: '#7f7a71', variant: 2 },
  ].map(({ side, forward, radius, height, color, variant }) => {
    const x = CLIFF.x + SIDE.x * side + FACE.x * forward;
    const z = CLIFF.z + SIDE.z * side + FACE.z * forward;
    return {
      position: [x, terrainHeight(x, z) - 0.6, z] as [number, number, number],
      radius,
      height,
      rotation: side,
      color,
      variant,
    };
  }),
];

// the water comes out of a crack this far below the top of the main rock
export const SOURCE_Y = CLIFF_BASE_Y + CLIFF.height - 1.8;
// the ledge it runs over sticks out of the rock's front
export const LEDGE_TIP = CLIFF.radius * 1.15 + 0.9; // distance from the rock's middle

const POND_RADIUS = 2.2;
const POND_DISTANCE = LEDGE_TIP + POND_RADIUS - 0.9; // the water falls near the back of the pond
const pondX = CLIFF.x + FACE.x * POND_DISTANCE;
const pondZ = CLIFF.z + FACE.z * POND_DISTANCE;

// the ground under the pond isn't flat: the water surface is at the highest
// point of its edge, and the rocks around the pond hide the gap below it
function pondLevel() {
  let highest = terrainHeight(pondX, pondZ);
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    highest = Math.max(
      highest,
      terrainHeight(pondX + Math.cos(angle) * POND_RADIUS, pondZ + Math.sin(angle) * POND_RADIUS),
    );
  }
  return highest + 0.08;
}

export const POND = { x: pondX, z: pondZ, radius: POND_RADIUS, level: pondLevel() };

// the stream leaves the pond turned away from the rocks, towards the beach
export const STREAM_ANGLE = Math.atan2(pondZ, pondX) + 0.5;
export const STREAM_HALF_WIDTH = 0.55;
const STREAM_STEP = 0.6;

// points along the middle of the stream, from the edge of the pond until the
// ground is under the sea; it bends a little from side to side
function createStream() {
  const points: { x: number; z: number }[] = [];
  const directionX = Math.cos(STREAM_ANGLE);
  const directionZ = Math.sin(STREAM_ANGLE);

  for (let i = 0; i < 60; i++) {
    const along = POND_RADIUS - 0.3 + i * STREAM_STEP;
    const side = Math.sin(i * 0.45) * 0.6 * Math.min(1, i / 4);
    const x = pondX + directionX * along - directionZ * side;
    const z = pondZ + directionZ * along + directionX * side;
    points.push({ x, z });
    if (terrainHeight(x, z) < WATER_LEVEL - 0.25) break;
  }
  return points;
}

export const STREAM = createStream();

// distance from a point to the segment between a and b
function distanceToSegment(
  x: number,
  z: number,
  a: { x: number; z: number },
  b: { x: number; z: number },
) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - (a.x + t * dx), z - (a.z + t * dz));
}

// distance from a point to the nearest part of the waterfall area (rocks,
// pond or stream); 0 or less means inside it
export function distanceToWaterfall(x: number, z: number): number {
  let nearest = Math.hypot(x - pondX, z - pondZ) - POND_RADIUS;
  for (const pillar of WATERFALL_PILLARS) {
    const [px, , pz] = pillar.position;
    nearest = Math.min(nearest, Math.hypot(x - px, z - pz) - pillar.radius * 1.3);
  }
  for (let i = 1; i < STREAM.length; i++) {
    nearest = Math.min(
      nearest,
      distanceToSegment(x, z, STREAM[i - 1], STREAM[i]) - STREAM_HALF_WIDTH,
    );
  }
  return nearest;
}
