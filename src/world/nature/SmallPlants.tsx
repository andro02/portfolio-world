import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, Object3D, type InstancedMesh } from 'three';
import { scatter, type Spot } from './placement';

// Bushes, flower patches and tufts of grass. There are hundreds of them, so
// each kind is one "instanced" mesh: the shape is sent to the graphics card
// once and drawn many times, each copy with its own position, size, rotation
// and colour. Hundreds of separate meshes would make every frame slower.

const BUSH_COLORS = ['#5f9a3a', '#6fae45', '#4f8a33'];
const FLOWER_COLORS = ['#f28cb1', '#ffd166', '#ffffff', '#b98ce0', '#ff9f68'];
const GRASS_COLORS = ['#6fa83f', '#7fb84d', '#5e9636', '#8cc152'];

interface Instance {
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
  color: string;
}

// one blob of a bush is placed around each spot: a few blobs make one bush
function bushes(spots: Spot[]): Instance[] {
  return spots.flatMap(({ x, y, z, random }) =>
    [0, 1, 2].map((part) => {
      const size = part === 0 ? 0.42 + random() * 0.15 : 0.26 + random() * 0.12;
      const angle = random() * Math.PI * 2;
      const offset = part === 0 ? 0 : 0.35;
      return {
        position: [x + Math.cos(angle) * offset, y + size * 0.7, z + Math.sin(angle) * offset],
        scale: [size, size * 0.85, size],
        rotation: [0, random() * Math.PI, 0],
        color: BUSH_COLORS[Math.floor(random() * BUSH_COLORS.length)],
      };
    }),
  );
}

// a patch of flowers in one or two colours
function flowers(spots: Spot[]): Instance[] {
  return spots.flatMap(({ x, y, z, random }) => {
    const colors = [0, 1].map(() => FLOWER_COLORS[Math.floor(random() * FLOWER_COLORS.length)]);
    return Array.from({ length: 7 }, (_, index) => {
      const angle = random() * Math.PI * 2;
      const distance = random() * 0.7;
      return {
        position: [x + Math.cos(angle) * distance, y + 0.12, z + Math.sin(angle) * distance],
        scale: [1, 0.7, 1],
        rotation: [random(), random() * Math.PI, 0],
        color: colors[index % 2],
      };
    });
  });
}

// single blades of grass, leaning a little in random directions
function grass(spots: Spot[]): Instance[] {
  return spots.flatMap(({ x, y, z, random }) =>
    Array.from({ length: 4 }, () => {
      const angle = random() * Math.PI * 2;
      const distance = random() * 0.25;
      const height = 0.7 + random() * 0.6;
      return {
        position: [
          x + Math.cos(angle) * distance,
          y + 0.15 * height,
          z + Math.sin(angle) * distance,
        ],
        scale: [1, height, 1],
        rotation: [(random() - 0.5) * 0.5, random() * Math.PI, (random() - 0.5) * 0.5],
        color: GRASS_COLORS[Math.floor(random() * GRASS_COLORS.length)],
      };
    }),
  );
}

// fills an instanced mesh with its copies, once, before it is first drawn
function useInstances(instances: Instance[]) {
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const helper = new Object3D();
    const color = new Color();
    instances.forEach((instance, index) => {
      helper.position.set(...instance.position);
      helper.scale.set(...instance.scale);
      helper.rotation.set(...instance.rotation);
      helper.updateMatrix();
      mesh.current!.setMatrixAt(index, helper.matrix);
      mesh.current!.setColorAt(index, color.set(instance.color));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    // the bounding sphere is used to skip meshes outside the view; it has to
    // cover all copies, not just the shape
    mesh.current.computeBoundingSphere();
  }, [instances]);
  return mesh;
}

export function SmallPlants() {
  const bushInstances = useMemo(() => bushes(scatter(45, 21, 'grass', 0.7, 2)), []);
  const flowerInstances = useMemo(() => flowers(scatter(40, 31, 'grass', 0.6, 1.8)), []);
  const grassInstances = useMemo(() => grass(scatter(220, 41, 'grass', 0.25, 0.9)), []);

  const bushMesh = useInstances(bushInstances);
  const flowerMesh = useInstances(flowerInstances);
  const grassMesh = useInstances(grassInstances);

  return (
    <>
      <instancedMesh
        ref={bushMesh}
        args={[undefined, undefined, bushInstances.length]}
        castShadow
        receiveShadow
      >
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial flatShading />
      </instancedMesh>

      <instancedMesh ref={flowerMesh} args={[undefined, undefined, flowerInstances.length]}>
        <icosahedronGeometry args={[0.08, 0]} />
        <meshStandardMaterial flatShading />
      </instancedMesh>

      <instancedMesh ref={grassMesh} args={[undefined, undefined, grassInstances.length]}>
        <coneGeometry args={[0.05, 0.32, 3]} />
        <meshStandardMaterial flatShading />
      </instancedMesh>
    </>
  );
}
