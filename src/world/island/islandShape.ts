// Shared dimensions and outline of the island, used by the terrain, the water
// and the invisible walls so that all of them line up.

export const GRASS_RADIUS = 30;
export const BEACH_RADIUS = 36;
export const WATER_LEVEL = -0.4;

// how far the shoreline is from a perfect circle at a given angle (around 1.0),
// a few overlapping sine waves give a natural looking, irregular outline
export function rimScale(angle: number): number {
  return 1 + 0.04 * Math.sin(angle * 3 + 0.6) + 0.025 * Math.sin(angle * 7 + 2.1);
}
