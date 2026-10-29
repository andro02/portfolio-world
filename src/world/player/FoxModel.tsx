import { useRef, type Ref } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils, type Group } from 'three';
import { footstep } from '../../audio/ambience';
import { surfaceAt } from '../surface';
import { playerMotion, playerWorldPosition } from './playerState';

// The player character: a low-poly fox built from simple shapes, animated in
// code. The model stands on y = 0 and looks towards +z.
//
// Animations, all blended smoothly into each other:
// - walking: legs swing in diagonal pairs, the body bobs, the tail sways
// - standing: slow breathing, looking around, an ear twitch now and then
// - in the air: legs stretched out, nose follows the direction of the jump
// - landing: a short squash
// Turning towards the direction of movement is done by the Player component,
// which turns the whole physics body together with its colliders.

const ORANGE = '#e8803a';
const WHITE = '#fbf1e2';
const DARK = '#3a2a22';

// height of the middle of the body; the body tilts and bobs around this point
const BODY_Y = 0.5;
const HIP_Y = 0.42; // height where the legs are attached
const LEG_X = 0.13;
const LEG_Z = 0.27;

const WALK_STRIDE = 2.2; // leg swing speed per unit of movement speed

// how long the fox has to be in the air before it shows the jump pose, so
// small bumps while walking downhill don't make it flicker
const AIR_POSE_DELAY = 0.1;
const LANDING_MIN_AIR_TIME = 0.25;

// exponential smoothing that behaves the same at any frame rate
function damp(current: number, target: number, speed: number, delta: number) {
  return MathUtils.lerp(current, target, 1 - Math.exp(-speed * delta));
}

function Leg({ ref, x, z }: { ref: Ref<Group>; x: number; z: number }) {
  return (
    <group ref={ref} position={[x, HIP_Y - BODY_Y, z]}>
      <mesh position={[0, -0.12, 0]} castShadow>
        <boxGeometry args={[0.11, 0.24, 0.12]} />
        <meshStandardMaterial color={ORANGE} flatShading />
      </mesh>
      {/* dark "socks" */}
      <mesh position={[0, -0.33, 0]} castShadow>
        <boxGeometry args={[0.1, 0.18, 0.11]} />
        <meshStandardMaterial color={DARK} flatShading />
      </mesh>
    </group>
  );
}

function Ear({ side }: { side: 1 | -1 }) {
  return (
    <group position={[side * 0.12, 0.17, -0.02]} rotation={[0, 0, -side * 0.28]}>
      <mesh position={[0, 0.11, 0]} castShadow>
        <coneGeometry args={[0.09, 0.22, 4]} />
        <meshStandardMaterial color={ORANGE} flatShading />
      </mesh>
      {/* dark tip, a bit wider than the ear at that height so it doesn't flicker */}
      <mesh position={[0, 0.166, 0]}>
        <coneGeometry args={[0.05, 0.11, 4]} />
        <meshStandardMaterial color={DARK} flatShading />
      </mesh>
    </group>
  );
}

export function FoxModel() {
  const squash = useRef<Group>(null); // landing squash, scales from the feet
  const body = useRef<Group>(null); // bobbing and tilting
  const head = useRef<Group>(null);
  const ears = useRef<Group>(null);
  const tail = useRef<Group>(null);
  const frontLeft = useRef<Group>(null);
  const frontRight = useRef<Group>(null);
  const backLeft = useRef<Group>(null);
  const backRight = useRef<Group>(null);

  // animation state that changes every frame; refs, so changing it doesn't re-render
  const anim = useRef({
    walk: 0,
    air: 0,
    airTime: 0,
    phase: 0,
    squash: 0,
    pitch: 0,
  });

  useFrame(({ clock }, delta) => {
    if (!squash.current || !body.current) return;
    const a = anim.current;
    const t = clock.elapsedTime;
    const { velocity, grounded } = playerMotion;
    const speed = Math.hypot(velocity.x, velocity.z);

    // air time, landing
    if (grounded) {
      if (a.airTime > LANDING_MIN_AIR_TIME) {
        a.squash = 1;
        // a heavier step on landing
        footstep(surfaceAt(playerWorldPosition.x, playerWorldPosition.z), 1.6);
      }
      a.airTime = 0;
    } else {
      a.airTime += delta;
    }
    const inAir = a.airTime > AIR_POSE_DELAY;

    // how much of each animation is shown, from 0 to 1
    a.walk = damp(a.walk, speed > 0.5 && !inAir ? 1 : 0, 10, delta);
    a.air = damp(a.air, inAir ? 1 : 0, 12, delta);
    a.squash = damp(a.squash, 0, 9, delta);

    // walking: the faster the fox moves, the faster the legs swing
    const previousPhase = a.phase;
    a.phase += speed * WALK_STRIDE * delta;
    // a step every half swing: that's when one diagonal pair of legs lands
    if (a.walk > 0.5 && Math.floor(a.phase / Math.PI) !== Math.floor(previousPhase / Math.PI)) {
      footstep(surfaceAt(playerWorldPosition.x, playerWorldPosition.z));
    }
    const swing = Math.sin(a.phase) * 0.75 * a.walk;
    const stretch = 0.65 * a.air; // front legs forward, back legs back
    if (frontLeft.current) frontLeft.current.rotation.x = swing - stretch;
    if (backRight.current) backRight.current.rotation.x = swing + stretch;
    if (frontRight.current) frontRight.current.rotation.x = -swing - stretch;
    if (backLeft.current) backLeft.current.rotation.x = -swing + stretch;

    // body: bobs twice per stride, breathes while standing, tilts with the jump
    const bob = Math.abs(Math.sin(a.phase)) * 0.05 * a.walk;
    const breathe = Math.sin(t * 2.4) * 0.012 * (1 - a.walk);
    body.current.position.y = BODY_Y + bob + breathe;
    const jumpPitch = MathUtils.clamp(-velocity.y * 0.06, -0.4, 0.4) * a.air;
    a.pitch = damp(a.pitch, jumpPitch, 10, delta);
    body.current.rotation.x = a.pitch;

    // landing squash: shorter and wider for a moment
    squash.current.scale.set(1 + a.squash * 0.12, 1 - a.squash * 0.2, 1 + a.squash * 0.12);

    // head: looks around slowly while standing, nods a little while walking
    if (head.current) {
      head.current.rotation.y = Math.sin(t * 0.6) * 0.35 * (1 - a.walk) * (1 - a.air);
      head.current.rotation.x = Math.sin(a.phase * 2) * 0.05 * a.walk;
    }

    // ears: a quick twitch every few seconds
    if (ears.current) {
      const twitch = t % 3.7 < 0.2 ? Math.sin(((t % 3.7) / 0.2) * Math.PI) : 0;
      ears.current.rotation.x = -twitch * 0.35;
    }

    // tail: swings with the steps, lazily while standing, streams back in the air
    if (tail.current) {
      tail.current.rotation.y =
        Math.sin(t * 2) * 0.18 * (1 - a.walk) + Math.sin(a.phase) * 0.3 * a.walk;
      tail.current.rotation.x = 0.55 - 0.35 * a.air;
    }
  });

  return (
    <group ref={squash}>
      <group ref={body} position={[0, BODY_Y, 0]}>
        {/* body: a capsule lying along z */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.22, 0.5, 2, 7]} />
          <meshStandardMaterial color={ORANGE} flatShading />
        </mesh>

        {/* white chest */}
        <mesh position={[0, -0.06, 0.3]} scale={[1, 1.1, 0.9]}>
          <icosahedronGeometry args={[0.17, 0]} />
          <meshStandardMaterial color={WHITE} flatShading />
        </mesh>

        <group ref={head} position={[0, 0.3, 0.44]} scale={1.15}>
          <mesh scale={[1.05, 0.9, 1]} castShadow>
            <sphereGeometry args={[0.24, 6, 4]} />
            <meshStandardMaterial color={ORANGE} flatShading />
          </mesh>

          {/* white cheeks */}
          {([1, -1] as const).map((side) => (
            <mesh key={side} position={[side * 0.1, -0.08, 0.12]} scale={[0.9, 0.75, 1]}>
              <icosahedronGeometry args={[0.11, 0]} />
              <meshStandardMaterial color={WHITE} flatShading />
            </mesh>
          ))}

          {/* snout pointing forward, with a white chin and a dark nose */}
          <mesh position={[0, -0.05, 0.27]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <coneGeometry args={[0.12, 0.28, 5]} />
            <meshStandardMaterial color={ORANGE} flatShading />
          </mesh>
          <mesh position={[0, -0.1, 0.22]} scale={[0.9, 0.45, 1.3]}>
            <icosahedronGeometry args={[0.1, 0]} />
            <meshStandardMaterial color={WHITE} flatShading />
          </mesh>
          <mesh position={[0, -0.05, 0.41]}>
            <icosahedronGeometry args={[0.045, 0]} />
            <meshStandardMaterial color={DARK} flatShading />
          </mesh>

          {/* eyes */}
          {([1, -1] as const).map((side) => (
            <mesh key={side} position={[side * 0.1, 0.05, 0.19]}>
              <icosahedronGeometry args={[0.042, 0]} />
              <meshStandardMaterial color={DARK} roughness={0.3} />
            </mesh>
          ))}

          <group ref={ears}>
            <Ear side={1} />
            <Ear side={-1} />
          </group>
        </group>

        <Leg ref={frontLeft} x={LEG_X} z={LEG_Z} />
        <Leg ref={frontRight} x={-LEG_X} z={LEG_Z} />
        <Leg ref={backLeft} x={LEG_X} z={-LEG_Z} />
        <Leg ref={backRight} x={-LEG_X} z={-LEG_Z} />

        {/* bushy tail with a white tip, attached at the back and pointing up and back */}
        <group ref={tail} position={[0, 0.08, -0.42]} rotation={[0.55, 0, 0]}>
          <mesh position={[0, 0, -0.3]} scale={[1, 1, 2.1]} castShadow>
            <sphereGeometry args={[0.15, 6, 4]} />
            <meshStandardMaterial color={ORANGE} flatShading />
          </mesh>
          <mesh position={[0, 0, -0.6]} scale={[1, 1, 1.4]} castShadow>
            <sphereGeometry args={[0.11, 6, 4]} />
            <meshStandardMaterial color={WHITE} flatShading />
          </mesh>
        </group>
      </group>
    </group>
  );
}
