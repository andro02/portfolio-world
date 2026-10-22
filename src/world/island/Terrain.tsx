import { useMemo } from 'react';
import { RigidBody, TrimeshCollider } from '@react-three/rapier';
import { Color, Float32BufferAttribute, MeshStandardMaterial, PlaneGeometry } from 'three';
import { islandTime } from './islandTime';
import {
  GRASS_END,
  SEA_FLOOR_DEPTH,
  TERRAIN_SIZE,
  WATER_LEVEL,
  shoreDistance,
  terrainHeight,
} from './islandShape';

const SEGMENTS = 128; // grid resolution: more segments = smoother shape, more triangles

const GRASS = new Color('#8cc152');
const GRASS_DARK = new Color('#74a843');
const SAND = new Color('#f2d49b');
const WET_SAND = new Color('#d9b77a');
const DEEP_WATER = new Color('#1f6f94');

// colour of one triangle, chosen from its height and distance to the shore
function faceColor(x: number, y: number, z: number, target: Color): Color {
  if (y < WATER_LEVEL - 0.05) {
    // sea floor: sand that fades into deep blue with depth
    const depth = Math.min(1, (WATER_LEVEL - y) / 4);
    return target.copy(WET_SAND).lerp(DEEP_WATER, depth);
  }
  if (shoreDistance(x, z) > GRASS_END) {
    return target.copy(y < WATER_LEVEL + 0.15 ? WET_SAND : SAND);
  }
  // two shades of grass in a patchy pattern
  const patch = Math.sin(x * 0.7) * Math.sin(z * 0.6) > 0.2;
  return target.copy(patch ? GRASS_DARK : GRASS);
}

function createTerrain() {
  // a flat grid, laid down horizontally, whose points are lifted to the terrain height
  const grid = new PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, SEGMENTS, SEGMENTS);
  grid.rotateX(-Math.PI / 2);

  const gridPosition = grid.attributes.position;
  for (let i = 0; i < gridPosition.count; i++) {
    gridPosition.setY(i, terrainHeight(gridPosition.getX(i), gridPosition.getZ(i)));
  }

  // separate points for every triangle, so each triangle can have its own flat colour
  const visual = grid.toNonIndexed();
  const position = visual.attributes.position;
  const colors = new Float32Array(position.count * 3);
  const color = new Color();

  for (let i = 0; i < position.count; i += 3) {
    // centre of the triangle
    const x = (position.getX(i) + position.getX(i + 1) + position.getX(i + 2)) / 3;
    const y = (position.getY(i) + position.getY(i + 1) + position.getY(i + 2)) / 3;
    const z = (position.getZ(i) + position.getZ(i + 1) + position.getZ(i + 2)) / 3;
    faceColor(x, y, z, color);
    for (let corner = 0; corner < 3; corner++) color.toArray(colors, (i + corner) * 3);
  }

  visual.setAttribute('color', new Float32BufferAttribute(colors, 3));
  visual.computeVertexNormals();

  return {
    geometry: visual,
    // the physics collider uses the original grid, which shares points between triangles
    vertices: new Float32Array(gridPosition.array),
    indices: new Uint32Array(grid.index!.array),
  };
}

// standard material plus a band of foam that washes up and down the beach
function createMaterial() {
  const material = new MeshStandardMaterial({ vertexColors: true, flatShading: true });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = islandTime;

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vWorldY;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vWorldY = (modelMatrix * vec4(transformed, 1.0)).y;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float uTime;\nvarying float vWorldY;',
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        // the foam line moves up and down with the waves
        float foamLine = ${WATER_LEVEL.toFixed(2)} + 0.05 + sin(uTime * 0.9) * 0.08;
        float foam = smoothstep(foamLine - 0.14, foamLine - 0.05, vWorldY)
          * (1.0 - smoothstep(foamLine, foamLine + 0.04, vWorldY));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), foam * 0.85);`,
      );
  };

  return material;
}

export function Terrain() {
  const terrain = useMemo(() => createTerrain(), []);
  const material = useMemo(() => createMaterial(), []);

  return (
    <RigidBody type="fixed" colliders={false}>
      <TrimeshCollider args={[terrain.vertices, terrain.indices]} />
      <mesh geometry={terrain.geometry} material={material} receiveShadow castShadow />

      {/* deep sea floor beyond the edge of the terrain mesh */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, SEA_FLOOR_DEPTH - 0.05, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color={DEEP_WATER} />
      </mesh>
    </RigidBody>
  );
}
