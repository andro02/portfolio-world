import { projects } from '../projects/registry';
import { FOUNTAIN_RADIUS } from './decor/plazaLayout';
import { POND, STREAM_HALF_WIDTH, distanceToStream } from './decor/waterfallLayout';
import { GRASS_END, WATER_LEVEL, shoreDistance, terrainHeight } from './island/islandShape';
import { PATH_HALF_WIDTH, distanceToPaths } from './island/paths';

// What the ground is made of at a point on the island, for the sound of the
// fox's steps.

export type Surface = 'grass' | 'sand' | 'dirt' | 'stone' | 'water';

const PAVING_RADIUS = FOUNTAIN_RADIUS + 1.6; // the paved circle around the fountain
const STATION_FLOOR_RADIUS = 1.85;

export function surfaceAt(x: number, z: number): Surface {
  const fromCentre = Math.hypot(x, z);
  // inside the fountain's basin (the fox can only get there by jumping in)
  if (fromCentre < FOUNTAIN_RADIUS) return 'water';
  if (fromCentre < PAVING_RADIUS) return 'stone';

  if (Math.hypot(x - POND.x, z - POND.z) < POND.radius) return 'water';
  if (distanceToStream(x, z) < STREAM_HALF_WIDTH) return 'water';
  // shallow sea along the beach
  if (terrainHeight(x, z) < WATER_LEVEL + 0.02) return 'water';

  for (const { meta } of projects) {
    if (Math.hypot(x - meta.position[0], z - meta.position[2]) < STATION_FLOOR_RADIUS) {
      return 'stone';
    }
  }

  // the paths and the plaza are packed earth
  if (distanceToPaths(x, z) <= PATH_HALF_WIDTH) return 'dirt';
  if (shoreDistance(x, z) > GRASS_END - 0.02) return 'sand';
  return 'grass';
}
