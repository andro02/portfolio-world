import type { Mesh } from 'three';

// Objects that can hide the player from the camera (rocks, cliffs). While one
// of them is between the camera and the player, the OccluderFade component
// makes it see-through.
export const occluders = new Set<Mesh>();

// use as the ref of a mesh: <mesh ref={registerOccluder}>
// React calls it with the mesh when the mesh appears, and calls the returned
// function when it disappears
export function registerOccluder(mesh: Mesh | null) {
  if (!mesh) return;
  occluders.add(mesh);
  return () => {
    occluders.delete(mesh);
  };
}
