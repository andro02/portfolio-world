import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { KeyboardControls } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { World } from './world/World';
import { keyboardMap } from './world/player/controls';

export default function App() {
  return (
    <KeyboardControls map={keyboardMap}>
      <Canvas shadows camera={{ fov: 50, position: [0, 10, 12] }}>
        {/* Rapier loads its WASM physics engine asynchronously, Suspense waits for it */}
        <Suspense fallback={null}>
          <Physics>
            <World />
          </Physics>
        </Suspense>
      </Canvas>
    </KeyboardControls>
  );
}
