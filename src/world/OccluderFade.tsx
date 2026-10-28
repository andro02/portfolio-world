import { useFrame } from '@react-three/fiber';
import { Mesh, Raycaster, Vector3, type Material, type Object3D } from 'three';
import { occluderOf, occluders } from './occluders';
import { playerWorldPosition } from './player/playerState';

// Makes rocks, cliffs, trees and palms see-through while they hide the player.
//
// Every frame a few rays go from the camera to the player (to the middle of
// the fox and to its head). Every object a ray hits on the way stands in front
// of the player, so it fades to FADED_OPACITY, all of it (every mesh of a tree,
// not only the part the ray hit); everything else fades back to fully solid.

const FADED_OPACITY = 0.3;
const FADE_SPEED = 8;
// points on the player the rays go to, relative to the middle of the fox
const TARGET_OFFSETS = [new Vector3(0, 0, 0), new Vector3(0, 0.6, 0)];
// the rays stop a little before the player, so an object the fox is standing
// right in front of doesn't count
const STOP_BEFORE = 0.3;

const raycaster = new Raycaster();
const target = new Vector3();
const rayDirection = new Vector3();

// current opacity of every object that is not fully solid
const opacities = new Map<Object3D, number>();

function setMaterialOpacity(material: Material, opacity: number) {
  const solid = opacity >= 0.99;
  // switching between solid and transparent changes how three.js draws the
  // object (transparent objects are drawn after solid ones and blended with
  // what's behind them), so it only happens when needed
  if (material.transparent === solid) {
    material.transparent = !solid;
    // a see-through object doesn't hide what is drawn after it (e.g. the water)
    material.depthWrite = solid;
    material.needsUpdate = true;
  }
  material.opacity = solid ? 1 : opacity;
}

// sets the opacity of every mesh that makes up an occluder
function setOpacity(occluder: Object3D, opacity: number) {
  occluder.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const materials: Material[] = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) setMaterialOpacity(material, opacity);
  });

  if (opacity >= 0.99) opacities.delete(occluder);
  else opacities.set(occluder, opacity);
}

export function OccluderFade() {
  useFrame(({ camera }, delta) => {
    const candidates = [...occluders];
    const hidingPlayer = new Set<Object3D>();

    for (const offset of TARGET_OFFSETS) {
      target.copy(playerWorldPosition).add(offset);
      rayDirection.subVectors(target, camera.position);
      const distance = rayDirection.length();
      raycaster.set(camera.position, rayDirection.normalize());
      raycaster.far = Math.max(distance - STOP_BEFORE, 0);

      // true: also test the meshes inside registered groups
      for (const hit of raycaster.intersectObjects(candidates, true)) {
        const occluder = occluderOf(hit.object);
        if (occluder) hidingPlayer.add(occluder);
      }
    }

    // ease every affected object towards its target opacity
    const changing = new Set([...hidingPlayer, ...opacities.keys()]);
    for (const occluder of changing) {
      const current = opacities.get(occluder) ?? 1;
      const goal = hidingPlayer.has(occluder) ? FADED_OPACITY : 1;
      setOpacity(occluder, current + (goal - current) * (1 - Math.exp(-FADE_SPEED * delta)));
    }
  });

  return null;
}
