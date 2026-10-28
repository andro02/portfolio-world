import { Sky } from '@react-three/drei';
import { Sun } from './Sun';

export function Environment() {
  return (
    <>
      <Sky sunPosition={[80, 35, 60]} turbidity={6} rayleigh={1.2} />
      {/* fog matches the sky near the horizon so the sea fades into it */}
      <fog attach="fog" args={['#cdeaf5', 50, 150]} />

      {/* soft light from the sky above and warm light bounced from the sand */}
      <hemisphereLight args={['#dff3ff', '#f2d49b', 0.7]} />

      <Sun />
    </>
  );
}
