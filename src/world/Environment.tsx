import { Sky } from '@react-three/drei';

export function Environment() {
  return (
    <>
      <Sky sunPosition={[80, 35, 60]} turbidity={6} rayleigh={1.2} />
      {/* fog matches the sky near the horizon so the sea fades into it */}
      <fog attach="fog" args={['#cdeaf5', 45, 140]} />

      {/* soft light from the sky above and warm light bounced from the sand */}
      <hemisphereLight args={['#dff3ff', '#f2d49b', 0.7]} />

      {/* warm sun; the shadow area covers the whole island */}
      <directionalLight
        castShadow
        position={[25, 35, 15]}
        intensity={1.6}
        color="#fff0d4"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-bias={-0.0005}
      />
    </>
  );
}
