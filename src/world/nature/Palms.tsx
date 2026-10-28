import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CylinderCollider, RigidBody } from '@react-three/rapier';
import { DoubleSide, type Group } from 'three';
import { registerOccluder } from '../occluders';
import { createCoconuts, createCrown, createTrunk, trunkCurve } from './palmGeometry';
import { scatter } from './placement';

// Palm trees along the beach (shapes in palmGeometry.ts): a leaning, ringed
// trunk, a crown of feathery fronds with a bunch of coconuts under it. The
// crowns sway a little in the wind.

const LEANS = [0.6, 0.9, 1.25]; // a few trunk shapes, shared by all palms
// slightly different shades of green, multiplied with the crown's own colours
const CROWN_TINTS = ['#ffffff', '#e9f5d6', '#f7f1d9'];

export function Palms() {
  const spots = useMemo(() => scatter(14, 5, 'beach', 1.2, 6), []);
  const trunks = useMemo(() => LEANS.map((lean) => createTrunk(lean)), []);
  const crown = useMemo(() => createCrown(), []);
  const coconuts = useMemo(() => createCoconuts(), []);
  const crowns = useRef<(Group | null)[]>([]);

  const palms = useMemo(
    () =>
      spots.map(({ x, y, z, random }) => {
        const variant = Math.floor(random() * LEANS.length);
        return {
          position: [x, y, z] as [number, number, number],
          rotation: random() * Math.PI * 2,
          variant,
          top: trunkCurve(LEANS[variant]).getPoint(1),
          scale: 0.85 + random() * 0.35,
          tint: CROWN_TINTS[Math.floor(random() * CROWN_TINTS.length)],
          phase: random() * Math.PI * 2, // so the palms don't sway in step
        };
      }),
    [spots],
  );

  // the wind: each crown rocks slowly, a little differently
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    crowns.current.forEach((group, index) => {
      if (!group) return;
      const { phase } = palms[index];
      group.rotation.z = Math.sin(t * 0.9 + phase) * 0.05;
      group.rotation.x = Math.sin(t * 0.7 + phase * 1.3) * 0.04;
    });
  });

  return (
    <>
      {palms.map((palm, index) => (
        // the whole palm is one occluder: trunk, crown and coconuts fade together
        <group
          key={index}
          ref={registerOccluder}
          position={palm.position}
          rotation={[0, palm.rotation, 0]}
          scale={palm.scale}
        >
          {/* only the bottom of the trunk blocks the player */}
          <RigidBody type="fixed" colliders={false}>
            <CylinderCollider args={[1, 0.3]} position={[0.1, 1, 0]} />
          </RigidBody>

          <mesh geometry={trunks[palm.variant]} castShadow receiveShadow>
            <meshStandardMaterial vertexColors flatShading />
          </mesh>

          <group
            ref={(group) => {
              crowns.current[index] = group;
            }}
            position={palm.top}
          >
            <mesh geometry={crown} castShadow receiveShadow>
              <meshStandardMaterial color={palm.tint} vertexColors flatShading side={DoubleSide} />
            </mesh>
            <mesh geometry={coconuts} castShadow>
              <meshStandardMaterial vertexColors flatShading />
            </mesh>
          </group>
        </group>
      ))}
    </>
  );
}
