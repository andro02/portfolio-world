import { Sky } from '@react-three/drei';

export function Environment() {
  return (
    <>
      <Sky sunPosition={[80, 35, 60]} turbidity={6} rayleigh={1.2} />
      {/* fog matches the sky near the horizon so the sea fades into it */}
      <fog attach="fog" args={['#cdeaf5', 50, 150]} />

      {/* soft light from the sky above and warm light bounced from the sand */}
      <hemisphereLight args={['#dff3ff', '#f2d49b', 0.7]} />

      {/* warm sun; the shadow area covers the whole island */}
      <directionalLight
        castShadow
        position={[25, 35, 15]}
        intensity={1.6}
        color="#fff0d4"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-55}
        shadow-camera-right={55}
        shadow-camera-top={55}
        shadow-camera-bottom={-55}
        // a tight near/far range makes the shadow depth more precise
        shadow-camera-near={1}
        shadow-camera-far={120}
        // offset along the surface normal removes shadow stripes on the ground
        // without detaching the shadow from the player's feet
        shadow-normalBias={0.04}
      />
    </>
  );
}
