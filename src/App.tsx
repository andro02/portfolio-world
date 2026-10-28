import { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { KeyboardControls } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { ControlsLegend } from './ui/ControlsLegend';
import { InteractPrompt } from './ui/InteractPrompt';
import { ProjectPanel } from './ui/ProjectPanel';
import { ResetViewButton } from './ui/ResetViewButton';
import { projects } from './projects/registry';
import { preloadShowcase } from './projects/showcaseLoader';
import { World } from './world/World';
import { keyboardMap } from './world/player/controls';

// a few seconds after the page has loaded, download all project demos in the
// background, so they are ready by the time the player reaches a station
const PRELOAD_DELAY_MS = 4000;

export default function App() {
  useEffect(() => {
    const timer = setTimeout(() => projects.forEach(preloadShowcase), PRELOAD_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <KeyboardControls map={keyboardMap}>
      <Canvas shadows="percentage" camera={{ fov: 50, position: [0, 10, 12] }}>
        {/* Rapier loads its WASM physics engine asynchronously, Suspense waits for it */}
        <Suspense fallback={null}>
          <Physics>
            <World />
          </Physics>
        </Suspense>
      </Canvas>

      {/* HTML overlay rendered on top of the 3D canvas */}
      <InteractPrompt />
      <ControlsLegend />
      <ResetViewButton />
      <ProjectPanel />
    </KeyboardControls>
  );
}
