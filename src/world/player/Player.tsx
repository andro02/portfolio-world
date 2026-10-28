import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import {
  BallCollider,
  CapsuleCollider,
  CoefficientCombineRule,
  RigidBody,
  useRapier,
  type RapierRigidBody,
} from '@react-three/rapier';
import { MathUtils, Quaternion, Vector3, type Group } from 'three';
import type { Control } from './controls';
import { useGameStore } from '../../store/useGameStore';
import { DEFAULT_ZOOM } from './cameraZoom';
import { FoxModel } from './FoxModel';
import { playerMotion, playerWorldPosition } from './playerState';
import { useScrollZoom } from './useScrollZoom';
import { FOUNTAIN_RADIUS } from '../decor/plazaLayout';
import { streamFlowAt } from '../decor/waterfallLayout';

const SPEED = 6;
const JUMP_VELOCITY = 5;
const TURN_SPEED = 12;
// at the start the fox looks away from the camera, towards the island
const START_HEADING = Math.PI;
// in front of the fountain in the middle of the plaza, looking at it
const START_POSITION: [number, number, number] = [0, 1.5, FOUNTAIN_RADIUS + 2.4];
// speed at which the river carries the fox along; slower than walking, so
// the fox can still walk upstream
const RIVER_SPEED = 2.2;

// camera position relative to the player at the two ends of the zoom range:
// close up it is low and looks from the side, zoomed out it looks from above
const CAMERA_CLOSE = new Vector3(0, 1.8, 4.2);
const CAMERA_FAR = new Vector3(0, 16, 18);
const KEY_ZOOM_SPEED = 0.8; // zoom change per second while + or - is held

// The fox is long, so one round collider doesn't fit it. It gets three:
// - an upright capsule in the middle, which stands on the ground
// - a ball around the head and a ball around the hips, a little above the
//   ground so they don't catch on slopes
// The colliders turn together with the fox (see heading below), so the head
// ball is always where the head is. Only the tip of the fluffy tail is left out.
const CAPSULE_HALF_HEIGHT = 0.2;
const CAPSULE_RADIUS = 0.4;
const HEAD_COLLIDER = { position: [0, 0.3, 0.72] as const, radius: 0.32 };
const HIPS_COLLIDER = { position: [0, 0.05, -0.45] as const, radius: 0.3 };

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
const UP = new Vector3(0, 1, 0);
const rotation = new Quaternion();

// shortest signed difference between two angles, in -PI..PI
function angleDifference(from: number, to: number) {
  return MathUtils.euclideanModulo(to - from + Math.PI, Math.PI * 2) - Math.PI;
}

// the same friction settings for every collider of the fox
const noFriction = { friction: 0, frictionCombineRule: CoefficientCombineRule.Min };

export function Player() {
  const body = useRef<RapierRigidBody>(null);
  const model = useRef<Group>(null);
  const [, getKeys] = useKeyboardControls<Control>();
  const { world, rapier } = useRapier();
  const zoom = useRef(DEFAULT_ZOOM); // current zoom, eased towards the one in the store
  const heading = useRef(START_HEADING); // direction the fox is facing, around the y axis
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

    // turn the body (and with it the colliders and the model) towards the
    // direction of movement, smoothly and the short way around
    if (direction.lengthSq() > 0) {
      const target = Math.atan2(direction.x, direction.z);
      const turn = angleDifference(heading.current, target);
      heading.current += turn * (1 - Math.exp(-TURN_SPEED * delta));
    }
    body.current.setRotation(rotation.setFromAxisAngle(UP, heading.current), true);

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

    // standing in the river: the water carries the fox downstream
    const { x, z } = body.current.translation();
    const flow = grounded ? streamFlowAt(x, z) : null;
    const carryX = flow ? flow.x * RIVER_SPEED : 0;
    const carryZ = flow ? flow.z * RIVER_SPEED : 0;

    body.current.setLinvel(
      { x: direction.x + carryX, y: verticalVelocity, z: direction.z + carryZ },
      true,
    );

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
      position={START_POSITION}
      rotation={[0, START_HEADING, 0]}
    >
      {/* no friction: movement is controlled by setting the velocity directly, and
          friction would make the player stick to walls when jumping against them */}
      <CapsuleCollider args={[CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS]} {...noFriction} />
      <BallCollider
        args={[HEAD_COLLIDER.radius]}
        position={HEAD_COLLIDER.position}
        {...noFriction}
      />
      <BallCollider
        args={[HIPS_COLLIDER.radius]}
        position={HIPS_COLLIDER.position}
        {...noFriction}
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
