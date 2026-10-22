import { Sky } from '@react-three/drei';

export function Environment() {
  return (
    <>
      <Sky sunPosition={[100, 40, 100]} />
      <fog attach="fog" args={['#cfe3f2', 30, 90]} />
      <ambientLight intensity={0.6} />
      <directionalLight
        castShadow
        position={[20, 30, 10]}
        intensity={1.5}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-75}
        shadow-camera-right={75}
        shadow-camera-top={75}
        shadow-camera-bottom={-75}
      />
    </>
  );
}
