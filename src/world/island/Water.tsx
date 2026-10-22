import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshStandardMaterial } from 'three';
import { islandTime } from './islandTime';
import { WATER_LEVEL } from './islandShape';

// semi-transparent water whose surface is moved by waves in the vertex shader
function createMaterial() {
  const material = new MeshStandardMaterial({
    color: '#3fb8d8',
    transparent: true,
    opacity: 0.75,
    roughness: 0.3,
    metalness: 0.05,
    flatShading: true, // each triangle catches the light differently: low-poly waves
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = islandTime;

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying float vWave;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        // two overlapping waves travelling in different directions
        // (named waveOrigin because three.js already declares worldPosition)
        vec4 waveOrigin = modelMatrix * vec4(position, 1.0);
        float wave = sin(waveOrigin.x * 0.35 + uTime * 1.1) * 0.08
          + sin(waveOrigin.z * 0.27 + uTime * 0.8) * 0.08;
        transformed.z += wave; // the plane is rotated, so its local z points up
        vWave = wave;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vWave;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        // light crests on top of the highest waves
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), smoothstep(0.1, 0.16, vWave) * 0.35);`,
      );
  };

  return material;
}

export function Water() {
  const material = useMemo(() => createMaterial(), []);

  // advance the time shared by the water and shore foam shaders
  useFrame(({ clock }) => {
    islandTime.value = clock.elapsedTime;
  });

  return (
    // planes are vertical by default, so this one is rotated to lie flat
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, WATER_LEVEL, 0]} material={material}>
      <planeGeometry args={[400, 400, 160, 160]} />
    </mesh>
  );
}
