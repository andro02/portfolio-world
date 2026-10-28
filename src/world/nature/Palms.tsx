import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CylinderCollider, RigidBody } from '@react-three/rapier';
import {
  CatmullRomCurve3,
  DoubleSide,
  IcosahedronGeometry,
  PlaneGeometry,
  TubeGeometry,
  Vector3,
  type BufferGeometry,
  type Group,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { registerOccluder } from '../occluders';
import { scatter } from './placement';

// Palm trees along the beach: a leaning, curved trunk with a crown of
// drooping leaves and a few coconuts. The crowns sway a little in the wind.

const TRUNK_COLOR = '#a88560';
const LEAF_COLORS = ['#5fa83c', '#4f9a35', '#6cb346'];
const COCONUT_COLOR = '#6b4a2b';
const HEIGHT = 4.4;
const LEAVES = 7;

// the trunk leans to +x and bends, ending at the top of the palm
function trunkCurve(lean: number) {
  return new CatmullRomCurve3([
    new Vector3(0, -0.3, 0),
    new Vector3(lean * 0.15, HEIGHT * 0.35, 0),
    new Vector3(lean * 0.55, HEIGHT * 0.7, 0),
    new Vector3(lean, HEIGHT, 0),
  ]);
}

// one leaf: a strip along +x that narrows to a point and bends down
function createLeaf() {
  const length = 1.9;
  const leaf = new PlaneGeometry(length, 0.55, 5, 1);
  leaf.rotateX(-Math.PI / 2); // lying flat
  leaf.translate(length / 2, 0, 0); // starts at the top of the trunk
  const position = leaf.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const along = x / length;
    position.setZ(i, position.getZ(i) * (1 - along * 0.85)); // narrower towards the tip
    position.setY(i, 0.35 * along - 1.1 * along * along); // up a little, then drooping
  }
  return leaf;
}

// all leaves of a crown in one geometry, turned around the top of the trunk
function createCrown() {
  const leaves: BufferGeometry[] = [];
  for (let i = 0; i < LEAVES; i++) {
    const leaf = createLeaf();
    leaf.rotateY((i / LEAVES) * Math.PI * 2 + (i % 2) * 0.2);
    leaves.push(leaf);
  }
  const crown = mergeGeometries(leaves);
  crown.computeVertexNormals();
  return crown;
}

// three coconuts hanging just under the leaves
function createCoconuts() {
  const coconuts = [0, 2.1, 4.2].map((angle) => {
    const coconut = new IcosahedronGeometry(0.16, 0);
    coconut.translate(Math.cos(angle) * 0.18, -0.2, Math.sin(angle) * 0.18);
    return coconut;
  });
  return mergeGeometries(coconuts);
}

export function Palms() {
  const spots = useMemo(() => scatter(14, 5, 'beach', 1.2, 6), []);
  // a few trunk shapes shared by all palms
  const trunks = useMemo(
    () => [0.6, 0.9, 1.25].map((lean) => new TubeGeometry(trunkCurve(lean), 8, 0.17, 5)),
    [],
  );
  const crown = useMemo(() => createCrown(), []);
  const coconuts = useMemo(() => createCoconuts(), []);
  const crowns = useRef<(Group | null)[]>([]);

  const palms = useMemo(
    () =>
      spots.map(({ x, y, z, random }) => {
        const variant = Math.floor(random() * 3);
        return {
          position: [x, y, z] as [number, number, number],
          rotation: random() * Math.PI * 2,
          variant,
          top: trunkCurve([0.6, 0.9, 1.25][variant]).getPoint(1),
          scale: 0.85 + random() * 0.35,
          leafColor: LEAF_COLORS[Math.floor(random() * LEAF_COLORS.length)],
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
        <group
          key={index}
          position={palm.position}
          rotation={[0, palm.rotation, 0]}
          scale={palm.scale}
        >
          {/* only the bottom of the trunk blocks the player */}
          <RigidBody type="fixed" colliders={false}>
            <CylinderCollider args={[1, 0.28]} position={[0.1, 1, 0]} />
          </RigidBody>

          <mesh ref={registerOccluder} geometry={trunks[palm.variant]} castShadow receiveShadow>
            <meshStandardMaterial color={TRUNK_COLOR} flatShading />
          </mesh>

          <group
            ref={(group) => {
              crowns.current[index] = group;
            }}
            position={palm.top}
          >
            <mesh ref={registerOccluder} geometry={crown} castShadow receiveShadow>
              <meshStandardMaterial color={palm.leafColor} flatShading side={DoubleSide} />
            </mesh>
            <mesh geometry={coconuts} castShadow>
              <meshStandardMaterial color={COCONUT_COLOR} flatShading />
            </mesh>
          </group>
        </group>
      ))}
    </>
  );
}
