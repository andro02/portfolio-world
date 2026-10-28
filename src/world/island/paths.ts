import { CatmullRomCurve3, Vector3 } from 'three';
import { projects } from '../../projects/registry';
import { between, createRandom } from './random';

export const PLAZA_RADIUS = 5.5; // open area in the centre with the fountain, where the player starts
export const PATH_HALF_WIDTH = 0.9;
const STOP_BEFORE_STATION = 2.2; // paths end in front of the station, not inside it

type Point = { x: number; z: number };

// one winding path from the plaza to every station; each path gets its own
// random bends from a seeded generator, so they differ but never change
function createPath(target: Point, seed: number): Point[] {
  const random = createRandom(seed);
  const length = Math.hypot(target.x, target.z);
  const dirX = target.x / length;
  const dirZ = target.z / length;

  const start = PLAZA_RADIUS - 0.5;
  const end = length - STOP_BEFORE_STATION;
  const bend = between(random, 1.5, 4) * (random() < 0.5 ? -1 : 1);

  // control points along the straight line, pushed sideways by a sine-shaped bend
  // plus a bit of noise; the curve through them gives a natural looking path
  const controls: Vector3[] = [];
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const along = start + (end - start) * t;
    const side =
      Math.sin(t * Math.PI) * bend + (i > 0 && i < steps ? between(random, -0.8, 0.8) : 0);
    controls.push(new Vector3(dirX * along - dirZ * side, 0, dirZ * along + dirX * side));
  }

  return new CatmullRomCurve3(controls).getPoints(40).map((point) => ({ x: point.x, z: point.z }));
}

export const PATHS: Point[][] = projects.map(({ meta }, index) =>
  createPath({ x: meta.position[0], z: meta.position[2] }, 1000 + index * 17),
);

// rectangle around each path, used to skip paths that are far away
const BOUNDS = PATHS.map((path) => ({
  minX: Math.min(...path.map((p) => p.x)),
  maxX: Math.max(...path.map((p) => p.x)),
  minZ: Math.min(...path.map((p) => p.z)),
  maxZ: Math.max(...path.map((p) => p.z)),
}));

// distance from a point to the segment between a and b
function distanceToSegment(x: number, z: number, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - (a.x + t * dx), z - (a.z + t * dz));
}

// distance to the nearest path or the edge of the plaza (0 inside the plaza);
// paths whose rectangle is further away than the nearest distance found so far
// can't be closer, so they are skipped
export function distanceToPaths(x: number, z: number): number {
  let nearest = Math.max(0, Math.hypot(x, z) - PLAZA_RADIUS);
  for (let p = 0; p < PATHS.length; p++) {
    const { minX, maxX, minZ, maxZ } = BOUNDS[p];
    const outside = Math.hypot(Math.max(minX - x, 0, x - maxX), Math.max(minZ - z, 0, z - maxZ));
    if (outside >= nearest) continue;

    const path = PATHS[p];
    for (let i = 1; i < path.length; i++) {
      nearest = Math.min(nearest, distanceToSegment(x, z, path[i - 1], path[i]));
    }
  }
  return nearest;
}
