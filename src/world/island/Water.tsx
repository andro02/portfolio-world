import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshStandardMaterial } from 'three';
import { islandTime } from './islandTime';
import { WATER_LEVEL } from './islandShape';
import { WAVE_FUNCTION } from './waves';

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
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;
        varying float vWave;
        ${WAVE_FUNCTION}`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        // world position of this point (named waveOrigin because three.js
        // already declares worldPosition in the same shader)
        vec4 waveOrigin = modelMatrix * vec4(position, 1.0);
        float wave = waveHeight(waveOrigin.xz, uTime);
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
