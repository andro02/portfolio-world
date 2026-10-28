import { projects } from '../../projects/registry';
import { distanceToWaterfall } from '../decor/waterfallLayout';
import { shoreRadius, terrainHeight } from './islandShape';
import { distanceToPaths } from './paths';
import { between, createRandom } from './random';

// Where the rocks lie. Kept apart from the Rocks component so other things
// (the plants) can keep out of their way.

const ROCK_COUNT = 45;
const ROCK_COLORS = ['#9a978d', '#b3afa3', '#86837a', '#a8a294'];
export const ROCK_COLLIDER_MIN_SCALE = 0.7; // smaller rocks are decoration the player walks through

export interface Rock {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  color: string;
  variant: number;
}

function isFreeSpot(x: number, z: number): boolean {
  const awayFromPaths = distanceToPaths(x, z) > 2;
  const awayFromStations = projects.every(
    ({ meta }) => Math.hypot(x - meta.position[0], z - meta.position[2]) > 4.5,
  );
  const awayFromWaterfall = distanceToWaterfall(x, z) > 1.5;
  return awayFromPaths && awayFromStations && awayFromWaterfall;
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

export const ROCKS = placeRocks();
