// Camera zoom level: 0 is a close-up, 1 is an overview of the island.
export const DEFAULT_ZOOM = 0.6;

export function clampZoom(zoom: number): number {
  return Math.min(1, Math.max(0, zoom));
}
