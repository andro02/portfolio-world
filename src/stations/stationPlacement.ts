import type { ProjectMeta } from '../projects/types';

// Every station faces the plaza in the middle of the island, where its path
// comes from. These helpers are shared by the station itself and by the
// player's teleport.

// rotation around y that turns a station's front (local +z) towards the plaza
export function stationFacing(meta: ProjectMeta) {
  const [x, , z] = meta.position;
  return Math.atan2(-x, -z);
}

// a point `distance` in front of a station, on the side of the plaza
export function inFrontOfStation(meta: ProjectMeta, distance: number) {
  const [x, , z] = meta.position;
  const length = Math.hypot(x, z);
  return { x: x - (x / length) * distance, z: z - (z / length) * distance };
}
