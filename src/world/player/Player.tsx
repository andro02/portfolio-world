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
import { Vector3, type Mesh } from 'three';
import type { Control } from './controls';
import { useGameStore } from '../../store/useGameStore';
import { playerWorldPosition } from './playerState';
import { useScrollZoom } from './useScrollZoom';

const SPEED = 6;
const JUMP_VELOCITY = 5;

// camera position relative to the player at the two ends of the zoom range:
// close up it is low and looks from the side, zoomed out it looks from above
const CAMERA_CLOSE = new Vector3(0, 2.2, 5);
const CAMERA_FAR = new Vector3(0, 16, 18);
const DEFAULT_ZOOM = 0.6; // roughly the previous fixed camera

// distance from the centre of the capsule to its bottom (half height + radius)
const FEET_OFFSET = 1;
// how far below the feet the ground may be and still count as standing on it
const GROUND_TOLERANCE = 0.2;

// reused every frame to avoid allocating new objects 60 times per second
const direction = new Vector3();
const playerPosition = new Vector3();
const cameraPosition = new Vector3();
const lookTarget = new Vector3();
const cameraOffset = new Vector3();

export function Player() {
  const body = useRef<RapierRigidBody>(null);
  const model = useRef<Mesh>(null);
  const [, getKeys] = useKeyboardControls<Control>();
  const { world, rapier } = useRapier();
  const targetZoom = useScrollZoom(DEFAULT_ZOOM);
  const zoom = useRef(DEFAULT_ZOOM);

  useFrame((state, delta) => {
    if (!body.current || !model.current) return;

    const { forward, backward, left, right, jump } = getKeys();

    // ignore movement input while a project panel is open
    const isPanelOpen = useGameStore.getState().openProject !== null;

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

    body.current.setLinvel(
      { x: direction.x, y: canJump ? JUMP_VELOCITY : velocity.y, z: direction.z },
      true,
    );

    // follow the position of the visible model, not of the physics body: physics
    // runs in fixed steps of 1/60 s, so the body jumps forward in small steps,
    // while the model is interpolated between them and moves smoothly
    model.current.getWorldPosition(playerPosition);
    playerWorldPosition.copy(playerPosition);

    // ease the zoom towards the level picked with the mouse wheel
    zoom.current += (targetZoom.current - zoom.current) * (1 - Math.exp(-8 * delta));
    cameraOffset.lerpVectors(CAMERA_CLOSE, CAMERA_FAR, zoom.current);

    // smoothly move the camera and the point it looks at (frame-rate independent lerp);
    // close up the camera looks a bit higher, at the upper body instead of the middle
    const follow = 1 - Math.exp(-5 * delta);
    cameraPosition.copy(playerPosition).add(cameraOffset);
    state.camera.position.lerp(cameraPosition, follow);
    playerPosition.y += (1 - zoom.current) * 0.5;
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
        args={[0.5, 0.5]}
        friction={0}
        frictionCombineRule={CoefficientCombineRule.Min}
      />
      <mesh ref={model} castShadow>
        <capsuleGeometry args={[0.5, 1, 8, 16]} />
        <meshStandardMaterial color="#f2a65a" />
      </mesh>
    </RigidBody>
  );
}
