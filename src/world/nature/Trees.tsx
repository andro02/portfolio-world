import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CylinderCollider, RigidBody } from '@react-three/rapier';
import { ConeGeometry, IcosahedronGeometry, type BufferGeometry, type Group } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { registerOccluder } from '../occluders';
import { scatter } from './placement';

// Trees on the grass, two kinds: round leafy trees and pointed pines. Their
// tops sway a little in the wind.

const TRUNK_COLOR = '#8a6444';
const LEAF_COLORS = ['#5f9a3a', '#6fae45', '#4f8a33', '#7ab84d'];
const PINE_COLORS = ['#4f8f45', '#5a9a4c', '#478a40'];

// round crown: a big lumpy ball with two smaller ones stuck to it
function createRoundCrown() {
  const parts = [
    { size: 1.05, x: 0, y: 0, z: 0 },
    { size: 0.7, x: 0.65, y: -0.25, z: 0.2 },
    { size: 0.65, x: -0.5, y: -0.3, z: -0.35 },
  ].map(({ size, x, y, z }) => {
    const ball = new IcosahedronGeometry(size, 0);
    ball.scale(1, 0.9, 1);
    ball.translate(x, y, z);
    return ball;
  });
  return mergeGeometries(parts);
}

// pine: three cones stacked, smaller towards the top
function createPineCrown() {
  const parts = [
    { radius: 1.1, height: 1.5, y: 0 },
    { radius: 0.85, height: 1.3, y: 0.8 },
    { radius: 0.55, height: 1.1, y: 1.5 },
  ].map(({ radius, height, y }) => {
    const cone = new ConeGeometry(radius, height, 7);
    cone.translate(0, y, 0);
    return cone;
  });
  return mergeGeometries(parts);
}

export function Trees() {
  const spots = useMemo(() => scatter(20, 11, 'grass', 1.6, 4.5), []);
  const crowns: Record<'round' | 'pine', BufferGeometry> = useMemo(
    () => ({ round: createRoundCrown(), pine: createPineCrown() }),
    [],
  );
  const tops = useRef<(Group | null)[]>([]);

  const trees = useMemo(
    () =>
      spots.map(({ x, y, z, random }) => {
        const kind: 'round' | 'pine' = random() < 0.6 ? 'round' : 'pine';
        const colors = kind === 'round' ? LEAF_COLORS : PINE_COLORS;
        return {
          position: [x, y, z] as [number, number, number],
          kind,
          rotation: random() * Math.PI * 2,
          scale: 0.8 + random() * 0.45,
          color: colors[Math.floor(random() * colors.length)],
          phase: random() * Math.PI * 2,
        };
      }),
    [spots],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    tops.current.forEach((group, index) => {
      if (!group) return;
      group.rotation.z = Math.sin(t * 0.8 + trees[index].phase) * 0.025;
    });
  });

  return (
    <>
      {trees.map((tree, index) => (
        <group
          key={index}
          position={tree.position}
          rotation={[0, tree.rotation, 0]}
          scale={tree.scale}
        >
          <RigidBody type="fixed" colliders={false}>
            <CylinderCollider args={[1, 0.3]} position={[0, 1, 0]} />
          </RigidBody>

          <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.14, 0.22, 1.6, 6]} />
            <meshStandardMaterial color={TRUNK_COLOR} flatShading />
          </mesh>

          {/* the crown sways from the top of the trunk */}
          <group
            ref={(group) => {
              tops.current[index] = group;
            }}
            position={[0, 1.4, 0]}
          >
            <mesh
              ref={registerOccluder}
              geometry={crowns[tree.kind]}
              position={[0, tree.kind === 'round' ? 0.9 : 0.6, 0]}
              castShadow
              receiveShadow
            >
              <meshStandardMaterial color={tree.color} flatShading />
            </mesh>
          </group>
        </group>
      ))}
    </>
  );
}
