import { useFrame } from '@react-three/fiber';
import { FrontSide, Mesh, MeshDepthMaterial, type Material } from 'three';

// How every object in the world draws itself into the shadow map.
//
// By default three.js uses an object's back faces (the side facing away from the
// sun). Near the ground those faces are at the same height as the ground or even
// below it (rocks and pillars are sunk into it), so the shadow test can't tell
// them apart, and a thin unshadowed line appears where an object touches the
// ground. Using the front faces fixes that; the polygon offset pushes them a
// little away from the sun, so sunlit surfaces don't get speckled with their
// own shadow.
const depthMaterial = new MeshDepthMaterial({
  side: FrontSide,
  polygonOffset: true,
  polygonOffsetFactor: 2,
  polygonOffsetUnits: 2,
});

function applyFrontFaceShadows(mesh: Mesh) {
  mesh.customDepthMaterial = depthMaterial;
  const materials: Material[] = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const material of materials) material.shadowSide = FrontSide;
}

// applies the setting to every shadow casting mesh in the scene, including ones
// added later (new stations, models that load asynchronously)
export function ShadowCasters() {
  useFrame(({ scene }) => {
    scene.traverse((object) => {
      if (
        object instanceof Mesh &&
        object.castShadow &&
        object.customDepthMaterial !== depthMaterial
      ) {
        applyFrontFaceShadows(object);
      }
    });
  });

  return null;
}
