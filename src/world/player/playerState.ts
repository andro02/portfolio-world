import { Vector3 } from 'three';

// position of the player in the world, updated by the Player component every
// frame; other parts of the world (e.g. the sun's shadow area) can read it
export const playerWorldPosition = new Vector3();
