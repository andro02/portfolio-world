import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { World } from './world/World';

export default function App() {
  return (
    <Canvas shadows camera={{ fov: 50, position: [0, 2, 12] }}>
      {/* Rapier loads its WASM physics engine asynchronously, Suspense waits for it */}
      <Suspense fallback={null}>
        <Physics>
          <World />
        </Physics>
      </Suspense>
    </Canvas>
  );
}
