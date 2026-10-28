import { projects } from '../../projects/registry';
import { distanceToWaterfall } from '../decor/waterfallLayout';
import { CLIFF_PILLARS } from '../island/cliffLayout';
import {
  GRASS_END,
  WATER_LEVEL,
  shoreDistance,
  shoreRadius,
  terrainHeight,
} from '../island/islandShape';
import { PATH_HALF_WIDTH, distanceToPaths } from '../island/paths';
import { between, createRandom } from '../island/random';
import { ROCKS } from '../island/rockLayout';

// Finding free spots for plants: not on a path or the plaza, not at a
// station, not in the waterfall's pond or river, not inside a rock or a cliff.

export type Region = 'grass' | 'beach';

// how far from the middle (0) to the shoreline (1) each region reaches
const REGIONS: Record<Region, [number, number]> = {
  grass: [0.08, GRASS_END - 0.03],
  beach: [GRASS_END + 0.06, 0.93],
};

// is there room for a plant `clearance` wide at this point?
export function isOpenGround(x: number, z: number, clearance: number) {
  if (distanceToPaths(x, z) < PATH_HALF_WIDTH + clearance) return false;
  if (terrainHeight(x, z) < WATER_LEVEL + 0.15) return false;
  if (distanceToWaterfall(x, z) < clearance) return false;
  for (const { meta } of projects) {
    if (Math.hypot(x - meta.position[0], z - meta.position[2]) < 4 + clearance) return false;
  }
  for (const rock of ROCKS) {
    const [rx, , rz] = rock.position;
    if (Math.hypot(x - rx, z - rz) < rock.scale * 1.2 + clearance) return false;
  }
  for (const pillar of CLIFF_PILLARS) {
    const [px, , pz] = pillar.position;
    if (Math.hypot(x - px, z - pz) < pillar.radius * 1.35 + clearance) return false;
  }
  return true;
}

export interface Spot {
  x: number;
  y: number; // height of the ground
  z: number;
  random: () => number; // its own random numbers, for size, colour, rotation
}

// up to `count` free spots in a region, at least `spacing` apart from each
// other; always the same ones for the same seed
export function scatter(
  count: number,
  seed: number,
  region: Region,
  clearance: number,
  spacing: number,
): Spot[] {
  const random = createRandom(seed);
  const [inner, outer] = REGIONS[region];
  const spots: Spot[] = [];

  for (let attempt = 0; attempt < count * 40 && spots.length < count; attempt++) {
    const angle = random() * Math.PI * 2;
    // the square root spreads the points evenly over the area instead of
    // bunching them up in the middle
    const distance = shoreRadius(angle) * Math.sqrt(between(random, inner ** 2, outer ** 2));
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;

    const d = shoreDistance(x, z);
    if (d < inner || d > outer) continue;
    if (!isOpenGround(x, z, clearance)) continue;
    if (spots.some((spot) => Math.hypot(spot.x - x, spot.z - z) < spacing)) continue;

    spots.push({ x, y: terrainHeight(x, z), z, random: createRandom(seed * 1000 + attempt) });
  }
  return spots;
}
