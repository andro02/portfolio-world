import { GRASS_END, WATER_LEVEL, shoreRadius, terrainHeight } from '../island/islandShape';
import type { PillarProps } from '../island/Pillar';
import { pillarTopRadius } from '../island/pillarShape';

// Where the waterfall and everything around it stands. Rocks, the cliff ridges
// and the player (pushed by the river) use the functions at the bottom.
//
// At the end of the cliff ridge between the paths to Landfill Detection and
// Fleet Monitoring stand two rocks, a tall one with a lower one in front of it:
// - a spring on top of the tall rock runs over its edge (upper fall)
// - it falls into a small pool on top of the lower rock
// - from there it falls again (lower fall) into a pond surrounded by stones
// - a river leaves the pond on one side and runs down the beach into the sea
//
// Distances along the front of the rocks are measured from the middle of the
// tall rock, in the direction FACE.

const ANGLE = -0.94; // direction of the ridge, seen from the island centre
const BACK_DISTANCE = shoreRadius(ANGLE) * (GRASS_END - 0.03);
const BACK_X = Math.cos(ANGLE) * BACK_DISTANCE;
const BACK_Z = Math.sin(ANGLE) * BACK_DISTANCE;

// the waterfall faces mostly +z, where the camera looks from, and a little
// towards the island centre
const faceX = -Math.cos(ANGLE) * 0.5;
const faceZ = -Math.sin(ANGLE) * 0.5 + 1;
const faceLength = Math.hypot(faceX, faceZ);
export const FACE = { x: faceX / faceLength, z: faceZ / faceLength };
const FACE_ANGLE = Math.atan2(FACE.z, FACE.x);
// rotation around y that turns a model's +z towards FACE
export const FACE_ROTATION = Math.atan2(FACE.x, FACE.z);
// sideways, at a right angle to FACE (towards the sea side)
const SIDE = { x: FACE.z, z: -FACE.x };

// a point `along` in front of the tall rock and `side` to the side of it
function frontPoint(along: number, side = 0) {
  return {
    x: BACK_X + FACE.x * along + SIDE.x * side,
    z: BACK_Z + FACE.z * along + SIDE.z * side,
  };
}

function rock(along: number, side: number, shape: Omit<PillarProps, 'position'>): PillarProps {
  const { x, z } = frontPoint(along, side);
  // sunk into the ground, like the other pillars
  return { ...shape, position: [x, terrainHeight(x, z) - 0.6, z] };
}

export const STEP_ALONG = 2.7; // the lower rock stands this far in front of the tall one

export const BACK_ROCK = rock(0, 0, {
  radius: 2.4,
  height: 8.2,
  rotation: 0.4,
  color: '#8f8a80',
  variant: 0,
  flatTop: true,
});
export const STEP_ROCK = rock(STEP_ALONG, 0, {
  radius: 1.8,
  height: 4.8,
  rotation: 1.3,
  color: '#9a948a',
  variant: 1,
  flatTop: true,
});

export const WATERFALL_PILLARS: PillarProps[] = [
  BACK_ROCK,
  STEP_ROCK,
  // lower rocks on both sides; the river leaves on the side with fewer rocks
  rock(4.2, -3.0, { radius: 1.4, height: 4.4, rotation: 0.9, color: '#7f7a71', variant: 1 }),
  rock(1.0, -3.2, { radius: 1.6, height: 6.2, rotation: 2.1, color: '#a29c90', variant: 2 }),
  rock(0.6, 3.4, { radius: 1.5, height: 6.6, rotation: 3.0, color: '#8a857b', variant: 0 }),
];

const BACK_TOP = BACK_ROCK.position[1] + BACK_ROCK.height;
const STEP_TOP = STEP_ROCK.position[1] + STEP_ROCK.height;

// distance from the middle of a rock to its front at the top
function frontEdge(pillar: PillarProps) {
  return pillarTopRadius(pillar.variant, pillar.radius, pillar.rotation, FACE_ANGLE);
}

// stone slabs stick out a little over the edges the water falls from
const LIP_OVERHANG = 0.35;
const UPPER_FORWARD = 0.5; // how far forward the upper fall lands
const LOWER_FORWARD = 0.7;

export const CASCADE = {
  spring: { along: 0.4, y: BACK_TOP + 0.12, radius: 0.85 },
  upperLip: { along: frontEdge(BACK_ROCK) + LIP_OVERHANG, y: BACK_TOP + 0.1 },
  upperForward: UPPER_FORWARD,
  midPool: {
    along: frontEdge(BACK_ROCK) + LIP_OVERHANG + UPPER_FORWARD + 0.25,
    y: STEP_TOP + 0.14,
    radius: 0.8,
  },
  lowerLip: { along: STEP_ALONG + frontEdge(STEP_ROCK) + LIP_OVERHANG, y: STEP_TOP + 0.12 },
  lowerForward: LOWER_FORWARD,
};

// the pond: its back touches the lower rock, the lower fall lands near its back
const POND_RADIUS = 2.7;
const POND_ALONG = CASCADE.lowerLip.along + LOWER_FORWARD + POND_RADIUS - 1.1;
const pondCenter = frontPoint(POND_ALONG);

// the ground under the pond isn't flat: the water surface is just above the
// highest point anywhere in the pond, so no ground pokes out of the water; a
// stone wall goes from the rim down into the ground at the lowest point
function pondGround() {
  let highest = -Infinity;
  let lowestEdge = Infinity;
  for (const part of [0, 0.25, 0.5, 0.75, 1]) {
    const distance = POND_RADIUS * part;
    const samples = part === 0 ? 1 : 24;
    for (let i = 0; i < samples; i++) {
      const angle = (i / samples) * Math.PI * 2;
      const height = terrainHeight(
        pondCenter.x + Math.cos(angle) * distance,
        pondCenter.z + Math.sin(angle) * distance,
      );
      highest = Math.max(highest, height);
      if (part === 1) lowestEdge = Math.min(lowestEdge, height);
    }
  }
  return { level: highest + 0.1, lowestEdge };
}

const { level, lowestEdge } = pondGround();

export const POND = {
  ...pondCenter,
  along: POND_ALONG,
  radius: POND_RADIUS,
  level, // water surface
  lowestEdge, // lowest ground under the rim
};

// the river leaves the pond on the side, turned a bit back towards the sea,
// and turns little by little towards the sea; it bends a bit from side to side
export const STREAM_HALF_WIDTH = 0.85;
export const STREAM_EXIT_ANGLE = Math.atan2(SIDE.z, SIDE.x) - 0.6;
const STREAM_STEP = 0.6;

function createStream() {
  const points: { x: number; z: number }[] = [];
  let heading = STREAM_EXIT_ANGLE;
  let x = POND.x + Math.cos(heading) * (POND_RADIUS - 0.4);
  let z = POND.z + Math.sin(heading) * (POND_RADIUS - 0.4);

  for (let i = 0; i < 80; i++) {
    points.push({ x, z });
    if (terrainHeight(x, z) < WATER_LEVEL - 0.3) break;

    // turn a little towards "straight out to sea" from where the river is now
    const outward = Math.atan2(z, x);
    const turn = Math.atan2(Math.sin(outward - heading), Math.cos(outward - heading));
    heading += turn * 0.16 + Math.sin(i * 0.5) * 0.06;
    x += Math.cos(heading) * STREAM_STEP;
    z += Math.sin(heading) * STREAM_STEP;
  }
  return points;
}

export const STREAM = createStream();

type Point = { x: number; z: number };

// nearest point on the segment between a and b: how far along it (0..1) and
// how far from it
function toSegment(x: number, z: number, a: Point, b: Point) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
  return { t, distance: Math.hypot(x - (a.x + t * dx), z - (a.z + t * dz)) };
}

// distance from a point to the nearest part of the waterfall area (rocks,
// pond or river); 0 or less means inside it
export function distanceToWaterfall(x: number, z: number): number {
  let nearest = Math.hypot(x - POND.x, z - POND.z) - POND_RADIUS - 0.4;
  for (const pillar of WATERFALL_PILLARS) {
    const [px, , pz] = pillar.position;
    nearest = Math.min(nearest, Math.hypot(x - px, z - pz) - pillar.radius * 1.3);
  }
  for (let i = 1; i < STREAM.length; i++) {
    const { distance } = toSegment(x, z, STREAM[i - 1], STREAM[i]);
    nearest = Math.min(nearest, distance - STREAM_HALF_WIDTH - 0.4);
  }
  return nearest;
}

// distance from a point to the middle line of the river
export function distanceToStream(x: number, z: number): number {
  let nearest = Infinity;
  for (let i = 1; i < STREAM.length; i++) {
    nearest = Math.min(nearest, toSegment(x, z, STREAM[i - 1], STREAM[i]).distance);
  }
  return nearest;
}

// direction the river flows at a point (a vector of length 1), or null when
// the point is not in the river
export function streamFlowAt(x: number, z: number): Point | null {
  let best: { distance: number; index: number } | null = null;
  for (let i = 1; i < STREAM.length; i++) {
    const { distance } = toSegment(x, z, STREAM[i - 1], STREAM[i]);
    if (distance < STREAM_HALF_WIDTH && (!best || distance < best.distance)) {
      best = { distance, index: i };
    }
  }
  if (!best) return null;

  const a = STREAM[best.index - 1];
  const b = STREAM[best.index];
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  return { x: (b.x - a.x) / length, z: (b.z - a.z) / length };
}
