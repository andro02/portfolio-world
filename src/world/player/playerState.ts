import { Vector3 } from 'three';

// position of the player in the world, updated by the Player component every
// frame; other parts of the world (e.g. the sun's shadow area) can read it
export const playerWorldPosition = new Vector3();

// how the player is moving, updated by the Player component every frame and
// read by the character model to pick its animation
export const playerMotion = {
  velocity: new Vector3(),
  grounded: true,
};
