import { useFrame } from '@react-three/fiber';
import { Raycaster, Vector3, type Mesh, type MeshStandardMaterial } from 'three';
import { occluders } from './occluders';
import { playerWorldPosition } from './player/playerState';

// Makes rocks and cliffs see-through while they hide the player.
//
// Every frame a few rays go from the camera to the player (to the middle of
// the fox and to its head). Every object a ray hits on the way stands in front
// of the player, so it fades to FADED_OPACITY; everything else fades back to
// fully solid.

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
const opacities = new Map<Mesh, number>();

function setOpacity(mesh: Mesh, opacity: number) {
  const material = mesh.material as MeshStandardMaterial;
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

  if (solid) opacities.delete(mesh);
  else opacities.set(mesh, opacity);
}

export function OccluderFade() {
  useFrame(({ camera }, delta) => {
    const meshes = [...occluders];
    const hidingPlayer = new Set<Mesh>();

    for (const offset of TARGET_OFFSETS) {
      target.copy(playerWorldPosition).add(offset);
      rayDirection.subVectors(target, camera.position);
      const distance = rayDirection.length();
      raycaster.set(camera.position, rayDirection.normalize());
      raycaster.far = Math.max(distance - STOP_BEFORE, 0);

      for (const hit of raycaster.intersectObjects(meshes, false)) {
        hidingPlayer.add(hit.object as Mesh);
      }
    }

    // ease every affected object towards its target opacity
    const changing = new Set([...hidingPlayer, ...opacities.keys()]);
    for (const mesh of changing) {
      const current = opacities.get(mesh) ?? 1;
      const goal = hidingPlayer.has(mesh) ? FADED_OPACITY : 1;
      setOpacity(mesh, current + (goal - current) * (1 - Math.exp(-FADE_SPEED * delta)));
    }
  });

  return null;
}
