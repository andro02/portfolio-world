// Shape of the island: the coastline and the height of the terrain at any point.
// The terrain mesh, its collider, the invisible walls and the stations all use
// these functions, so everything lines up.

export const ISLAND_RADIUS = 34; // average distance from the centre to the shoreline
export const WATER_LEVEL = -0.4;
export const TERRAIN_SIZE = 160; // side of the square terrain mesh (island and sea floor)

export const GRASS_END = 0.72; // grass covers the island up to 72% of the way to the shore
const PLATEAU_HEIGHT = 0.3;
export const SEA_FLOOR_DEPTH = -6;

// distance from the centre to the shoreline in a given direction; several sine
// waves of different frequencies give an irregular outline with bays and capes
export function shoreRadius(angle: number): number {
  return (
    ISLAND_RADIUS *
    (1 +
      0.12 * Math.sin(angle * 2 + 0.5) +
      0.07 * Math.sin(angle * 3 + 2.3) +
      0.04 * Math.sin(angle * 5 + 4.1) +
      0.025 * Math.sin(angle * 9 + 1.2))
  );
}

// 0 in the centre of the island, 1 on the shoreline, above 1 out at sea
export function shoreDistance(x: number, z: number): number {
  return Math.hypot(x, z) / shoreRadius(Math.atan2(z, x));
}

export function terrainHeight(x: number, z: number): number {
  const d = shoreDistance(x, z);

  if (d <= GRASS_END) {
    // gentle hills that flatten out towards the beach
    const hills = 0.35 * Math.sin(x * 0.18) * Math.cos(z * 0.15) + 0.2 * Math.sin((x + z) * 0.31);
    const fade = 1 - smoothstep(GRASS_END - 0.2, GRASS_END, d);
    return PLATEAU_HEIGHT + Math.max(0, hills) * fade;
  }

  if (d <= 1) {
    // beach sloping down to the water
    const t = smoothstep(GRASS_END, 1, d);
    return PLATEAU_HEIGHT + (WATER_LEVEL - PLATEAU_HEIGHT) * t;
  }

  // sea floor getting deeper away from the island
  return Math.max(SEA_FLOOR_DEPTH, WATER_LEVEL - (d - 1) * 12);
}

// 0 below `edge0`, 1 above `edge1`, smooth in between
export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
