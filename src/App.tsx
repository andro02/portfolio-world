import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { KeyboardControls } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { ControlsLegend } from './ui/ControlsLegend';
import { InteractPrompt } from './ui/InteractPrompt';
import { ProjectPanel } from './ui/ProjectPanel';
import { ResetViewButton } from './ui/ResetViewButton';
import { World } from './world/World';
import { keyboardMap } from './world/player/controls';

export default function App() {
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
