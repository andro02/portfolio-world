import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { Vector3 } from 'three';
import type { Control } from './controls';

const SPEED = 6;
const JUMP_VELOCITY = 5;
const CAMERA_OFFSET = new Vector3(0, 10, 12);

// reused every frame to avoid allocating new objects 60 times per second
const direction = new Vector3();
const playerPosition = new Vector3();
const cameraPosition = new Vector3();

export function Player() {
  const body = useRef<RapierRigidBody>(null);
  const [, getKeys] = useKeyboardControls<Control>();

  useFrame((state, delta) => {
    if (!body.current) return;

    const { forward, backward, left, right, jump } = getKeys();

    // build movement direction from pressed keys (x: left/right, z: forward/backward)
    direction.set(Number(right) - Number(left), 0, Number(backward) - Number(forward));
    if (direction.lengthSq() > 0) direction.normalize().multiplyScalar(SPEED);

    // simplified ground check, will be replaced with a raycast later
    const velocity = body.current.linvel();
    const grounded = Math.abs(velocity.y) < 0.05;

    body.current.setLinvel(
      { x: direction.x, y: jump && grounded ? JUMP_VELOCITY : velocity.y, z: direction.z },
      true,
    );

    // smoothly follow the player with the camera (frame-rate independent lerp)
    playerPosition.copy(body.current.translation());
    cameraPosition.copy(playerPosition).add(CAMERA_OFFSET);
    state.camera.position.lerp(cameraPosition, 1 - Math.exp(-5 * delta));
    state.camera.lookAt(playerPosition);
  });

  return (
    <RigidBody
      ref={body}
      colliders={false}
      enabledRotations={[false, false, false]}
      position={[0, 2, 0]}
    >
      <CapsuleCollider args={[0.5, 0.5]} />
      <mesh castShadow>
        <capsuleGeometry args={[0.5, 1, 8, 16]} />
        <meshStandardMaterial color="#f2a65a" />
      </mesh>
    </RigidBody>
  );
}
