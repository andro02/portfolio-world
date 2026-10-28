import { useMemo } from 'react';
import { between, createRandom } from '../island/random';

// Flat green patches of moss (and a few tufts of grass) scattered on a round
// area, e.g. the top of a rock. Patches inside the `keepClear` strip (along z,
// where water runs) are left out.

const MOSS_COLORS = ['#6f9e3f', '#7fb04a', '#5e8c36'];

interface MossProps {
  radius: number;
  count: number;
  seed: number;
  keepClear?: number; // half width of the strip along z that stays bare
}

export function Moss({ radius, count, seed, keepClear = 0 }: MossProps) {
  const patches = useMemo(() => {
    const random = createRandom(seed);
    const list = [];
    while (list.length < count) {
      const angle = random() * Math.PI * 2;
      const distance = radius * Math.sqrt(random());
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      if (Math.abs(x) < keepClear) continue;
      const size = between(random, 0.25, 0.55);
      list.push({
        position: [x, 0, z] as [number, number, number],
        scale: [size, size * 0.35, size * between(random, 0.7, 1.2)] as [number, number, number],
        rotation: random() * Math.PI,
        color: MOSS_COLORS[Math.floor(random() * MOSS_COLORS.length)],
      });
    }
    return list;
  }, [radius, count, seed, keepClear]);

  return (
    <group>
      {patches.map((patch, index) => (
        <mesh
          key={index}
          position={patch.position}
          rotation={[0, patch.rotation, 0]}
          scale={patch.scale}
          receiveShadow
        >
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={patch.color} flatShading />
        </mesh>
      ))}
    </group>
  );
}
