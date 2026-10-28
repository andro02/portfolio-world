import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { hideLoader } from '../ui/loader';

// Hides the loading screen once the island is on the screen.
//
// It is part of the world inside the Suspense boundary, and Suspense shows
// nothing of the world until everything in it has loaded (the physics engine,
// the fonts), so this component only starts running then. It waits a few frames: the first frames are slow
// because the graphics card is still compiling the shaders, and the world
// should be ready to move when it becomes visible.
const FRAMES_TO_WAIT = 3;

export function SceneReady() {
  const frames = useRef(0);

  useFrame(() => {
    frames.current += 1;
    if (frames.current === FRAMES_TO_WAIT) hideLoader();
  });

  return null;
}
