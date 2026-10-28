import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import {
  CapsuleCollider,
  CoefficientCombineRule,
  RigidBody,
  useRapier,
  type RapierRigidBody,
} from '@react-three/rapier';
import { Vector3, type Group } from 'three';
import type { Control } from './controls';
import { useGameStore } from '../../store/useGameStore';
import { DEFAULT_ZOOM } from './cameraZoom';
import { FoxModel } from './FoxModel';
import { playerMotion, playerWorldPosition } from './playerState';
import { useScrollZoom } from './useScrollZoom';

const SPEED = 6;
const JUMP_VELOCITY = 5;

// camera position relative to the player at the two ends of the zoom range:
// close up it is low and looks from the side, zoomed out it looks from above
const CAMERA_CLOSE = new Vector3(0, 1.8, 4.2);
const CAMERA_FAR = new Vector3(0, 16, 18);
const KEY_ZOOM_SPEED = 0.8; // zoom change per second while + or - is held

// size of the physics capsule around the fox: total height is
// 2 * (half height + radius) = 1.2, a bit taller than the fox's back
const CAPSULE_HALF_HEIGHT = 0.2;
const CAPSULE_RADIUS = 0.4;
// distance from the centre of the capsule to its bottom (half height + radius)
const FEET_OFFSET = CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS;
// how far below the feet the ground may be and still count as standing on it
const GROUND_TOLERANCE = 0.2;
// the fox is drawn a bit bigger than it is modelled, so it reads well from far away
const MODEL_SCALE = 1.2;

// reused every frame to avoid allocating new objects 60 times per second
const direction = new Vector3();
const playerPosition = new Vector3();
const cameraPosition = new Vector3();
const lookTarget = new Vector3();
const cameraOffset = new Vector3();

export function Player() {
  const body = useRef<RapierRigidBody>(null);
  const model = useRef<Group>(null);
  const [, getKeys] = useKeyboardControls<Control>();
  const { world, rapier } = useRapier();
  const zoom = useRef(DEFAULT_ZOOM); // current zoom, eased towards the one in the store
  useScrollZoom();

  useFrame((state, delta) => {
    if (!body.current || !model.current) return;

    const { forward, backward, left, right, jump, zoomIn, zoomOut } = getKeys();
    const store = useGameStore.getState();

    // ignore movement input while a project panel is open
    const isPanelOpen = store.openProject !== null;

    // zoom with the keyboard while + or - is held
    if (!isPanelOpen && zoomIn !== zoomOut) {
      store.setZoom(store.zoom + (zoomIn ? -1 : 1) * KEY_ZOOM_SPEED * delta);
    }

    // build movement direction from pressed keys (x: left/right, z: forward/backward)
    if (isPanelOpen) direction.set(0, 0, 0);
    else direction.set(Number(right) - Number(left), 0, Number(backward) - Number(forward));
    if (direction.lengthSq() > 0) direction.normalize().multiplyScalar(SPEED);

    // ground check: cast a short ray straight down from the centre of the player;
    // it ignores the player's own body and trigger zones of the stations
    const velocity = body.current.linvel();
    const ray = new rapier.Ray(body.current.translation(), { x: 0, y: -1, z: 0 });
    const groundHit = world.castRay(
      ray,
      FEET_OFFSET + GROUND_TOLERANCE,
      true,
      rapier.QueryFilterFlags.EXCLUDE_SENSORS,
      undefined,
      undefined,
      body.current,
    );
    // not while already moving up, so holding space doesn't extend the jump
    const grounded = groundHit !== null && velocity.y < 1;
    const canJump = jump && grounded && !isPanelOpen;
    const verticalVelocity = canJump ? JUMP_VELOCITY : velocity.y;

    body.current.setLinvel({ x: direction.x, y: verticalVelocity, z: direction.z }, true);

    // tell the fox model how the player moves, so it can pick its animation
    playerMotion.velocity.set(direction.x, verticalVelocity, direction.z);
    playerMotion.grounded = grounded && !canJump;

    // follow the position of the visible model, not of the physics body: physics
    // runs in fixed steps of 1/60 s, so the body jumps forward in small steps,
    // while the model is interpolated between them and moves smoothly
    model.current.getWorldPosition(playerPosition);
    playerWorldPosition.copy(playerPosition);

    // ease the zoom towards the level picked by the player
    zoom.current += (useGameStore.getState().zoom - zoom.current) * (1 - Math.exp(-8 * delta));
    cameraOffset.lerpVectors(CAMERA_CLOSE, CAMERA_FAR, zoom.current);

    // smoothly move the camera and the point it looks at (frame-rate independent lerp);
    // close up the camera looks a bit higher, at the fox's head instead of its middle
    const follow = 1 - Math.exp(-5 * delta);
    cameraPosition.copy(playerPosition).add(cameraOffset);
    state.camera.position.lerp(cameraPosition, follow);
    playerPosition.y += (1 - zoom.current) * 0.3;
    lookTarget.lerp(playerPosition, follow);
    state.camera.lookAt(lookTarget);
  });

  return (
    <RigidBody
      ref={body}
      name="player"
      colliders={false}
      enabledRotations={[false, false, false]}
      position={[0, 2, 0]}
    >
      {/* no friction: movement is controlled by setting the velocity directly, and
          friction would make the player stick to walls when jumping against them */}
      <CapsuleCollider
        args={[CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS]}
        friction={0}
        frictionCombineRule={CoefficientCombineRule.Min}
      />
      {/* the group is at the centre of the capsule, the fox stands on its bottom */}
      <group ref={model}>
        <group position={[0, -FEET_OFFSET, 0]} scale={MODEL_SCALE}>
          <FoxModel />
        </group>
      </group>
    </RigidBody>
  );
}
