import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Object3D, Vector3, type DirectionalLight } from 'three';
import { playerWorldPosition } from './player/playerState';

const SUN_DIRECTION = new Vector3(25, 35, 15).normalize(); // from the ground towards the sun
const SUN_DISTANCE = 60;

// Shadows are drawn into a square texture (the shadow map) that covers the area
// around the player instead of the whole island: the same number of pixels on
// a smaller area gives much sharper shadows.
const SHADOW_MAP_SIZE = 2048;
const SHADOW_HALF_SIZE = 28; // covered area: 56 x 56 units
// the camera looks towards -z, so most of what is visible is in front of the player
const SHADOW_CENTER_OFFSET = new Vector3(0, 0, -8);
const TEXEL = (2 * SHADOW_HALF_SIZE) / SHADOW_MAP_SIZE; // world size of one shadow map pixel

// axes of the shadow map as seen from the sun, used to snap its position
const sunForward = SUN_DIRECTION.clone().negate();
const sunRight = new Vector3().crossVectors(sunForward, new Vector3(0, 1, 0)).normalize();
const sunUp = new Vector3().crossVectors(sunRight, sunForward).normalize();

const center = new Vector3();

export function Sun() {
  const light = useRef<DirectionalLight>(null);
  // the point the light shines at; created once and added to the scene below
  const [target] = useState(() => new Object3D());

  useFrame(() => {
    if (!light.current) return;

    center.copy(playerWorldPosition).add(SHADOW_CENTER_OFFSET);

    // move the shadow area only in whole shadow map pixels; otherwise the
    // pixels shift a little every frame and shadow edges flicker while walking
    const right = center.dot(sunRight);
    const up = center.dot(sunUp);
    center
      .addScaledVector(sunRight, Math.round(right / TEXEL) * TEXEL - right)
      .addScaledVector(sunUp, Math.round(up / TEXEL) * TEXEL - up);

    target.position.copy(center);
    target.updateMatrixWorld();
    light.current.position.copy(center).addScaledVector(SUN_DIRECTION, SUN_DISTANCE);
  });

  return (
    <>
      <primitive object={target} />
      <directionalLight
        ref={light}
        target={target}
        castShadow
        intensity={1.6}
        color="#fff0d4"
        shadow-mapSize={[SHADOW_MAP_SIZE, SHADOW_MAP_SIZE]}
        shadow-camera-left={-SHADOW_HALF_SIZE}
        shadow-camera-right={SHADOW_HALF_SIZE}
        shadow-camera-top={SHADOW_HALF_SIZE}
        shadow-camera-bottom={-SHADOW_HALF_SIZE}
        shadow-camera-near={SUN_DISTANCE - 40}
        shadow-camera-far={SUN_DISTANCE + 40}
        // blur radius in shadow map pixels: softens the edges instead of stair steps
        shadow-radius={3}
        // small offsets that prevent stripes and speckles on surfaces facing the
        // sun; kept small so the shadow still starts right where an object meets
        // the ground
        shadow-bias={-0.001}
        shadow-normalBias={0.015}
      />
    </>
  );
}
