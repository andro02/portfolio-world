import { footstep } from '../../audio/ambience';
import type { Surface } from '../surface';

// Every step the fox takes: its sound is played here, and other parts of the
// world can listen for steps (the paw prints do).

export interface Step {
  x: number; // where the pair of paws landed (the middle of the fox)
  y: number; // height of the ground there
  z: number;
  heading: number; // direction the fox is walking in, around the y axis
  surface: Surface;
  strength: number; // 1 for a step, more when landing a jump
  side: 1 | -1; // which diagonal pair of legs: front left and back right, or the other one
}

const listeners = new Set<(step: Step) => void>();

// calls `listener` for every step; returns a function that stops it
export function onStep(listener: (step: Step) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function takeStep(step: Step) {
  footstep(step.surface, step.strength);
  for (const listener of listeners) listener(step);
}
