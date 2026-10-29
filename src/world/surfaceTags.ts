import type { Surface } from './surface';

// Things the fox can climb onto (rocks, cliffs, the pond's rim) say what they
// are made of themselves: their physics body carries it in userData, and the
// player's ground check reads it. surfaceAt (surface.ts) only knows the ground.
export interface SurfaceTag {
  surface: Surface;
}

export const ROCK: SurfaceTag = { surface: 'rock' };
export const STONE: SurfaceTag = { surface: 'stone' };

export function taggedSurface(userData: unknown): Surface | null {
  if (typeof userData === 'object' && userData !== null && 'surface' in userData) {
    return (userData as SurfaceTag).surface;
  }
  return null;
}
