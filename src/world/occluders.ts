import type { Object3D } from 'three';

// Objects that can hide the player from the camera (rocks, cliffs, trees,
// palms). While one of them is between the camera and the player, the
// OccluderFade component makes it see-through, as a whole: a tree is one
// occluder, so its trunk and its crown fade together.
export const occluders = new Set<Object3D>();

// use as the ref of a mesh or of a group holding a whole object:
// <group ref={registerOccluder}>. React calls it with the object when it
// appears, and calls the returned function when it disappears
export function registerOccluder(object: Object3D | null) {
  if (!object) return;
  occluders.add(object);
  return () => {
    occluders.delete(object);
  };
}

// the registered occluder that a mesh belongs to (the mesh itself, or the
// group around it), or null if it isn't part of one
export function occluderOf(object: Object3D): Object3D | null {
  for (let current: Object3D | null = object; current; current = current.parent) {
    if (occluders.has(current)) return current;
  }
  return null;
}
