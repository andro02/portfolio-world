import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { CuboidCollider } from '@react-three/rapier';
import { DoubleSide, type Group, type MeshBasicMaterial, type MeshStandardMaterial } from 'three';
import { MONO_FONT } from '../../fonts';
import { StationFloor } from '../../stations/StationFloor';
import type { StationModelProps } from '../types';

// Station of the landfill detection project: a pile of waste, a small
// satellite circling above it and scanning it with a green beam (the project
// finds landfills in satellite images), and a detection frame around the pile
// with its label and confidence, like the boxes the model draws.

const ACCENT = '#3e9b5b';
const PILE_Z = -0.35; // the pile stands a little back, the front stays free

// the frame around the pile
const FRAME = { width: 2.7, height: 1.35, depth: 2.3 };
const CORNER = 0.38; // length of the corner brackets

// bits of waste lying on the pile: [x, y, z, size, colour, kind]
const JUNK: [number, number, number, number, string, 'box' | 'bag' | 'barrel' | 'tire'][] = [
  [-0.45, 0.72, 0.2, 0.26, '#c0392b', 'box'],
  [0.35, 0.8, 0.05, 0.3, '#ecf0f1', 'box'],
  [0.0, 0.92, -0.2, 0.22, '#2f3b2f', 'bag'],
  [-0.15, 0.62, 0.55, 0.2, '#2e86c1', 'box'],
  [0.7, 0.5, 0.4, 0.2, '#f1c40f', 'box'],
  [-0.8, 0.48, -0.3, 0.24, '#3d4b3d', 'bag'],
  [0.65, 0.62, -0.45, 0.2, '#2e7d32', 'barrel'],
  [-0.3, 0.78, -0.5, 0.2, '#2a2a2a', 'tire'],
  [0.95, 0.3, -0.05, 0.18, '#e67e22', 'box'],
  [-1.05, 0.28, 0.25, 0.17, '#8e44ad', 'box'],
];

function Junk({
  position,
  size,
  color,
  kind,
  index,
}: {
  position: [number, number, number];
  size: number;
  color: string;
  kind: 'box' | 'bag' | 'barrel' | 'tire';
  index: number;
}) {
  const rotation: [number, number, number] = [index * 0.7, index * 1.3, index * 0.4];
  return (
    <mesh position={position} rotation={rotation} castShadow>
      {kind === 'box' && <boxGeometry args={[size, size * 0.8, size * 1.1]} />}
      {kind === 'bag' && <icosahedronGeometry args={[size, 0]} />}
      {kind === 'barrel' && <cylinderGeometry args={[size * 0.7, size * 0.7, size * 1.8, 8]} />}
      {kind === 'tire' && <torusGeometry args={[size, size * 0.4, 6, 10]} />}
      <meshStandardMaterial color={color} flatShading />
    </mesh>
  );
}

// the frame is drawn only at its corners: three short bars at each of the
// eight corners, pointing along the edges
function DetectionFrame({ highlighted }: StationModelProps) {
  const materials = useRef<(MeshStandardMaterial | null)[]>([]);

  useFrame(({ clock }) => {
    // the frame pulses gently, brighter while the player is here
    const glow = (highlighted ? 1.2 : 0.5) + Math.sin(clock.elapsedTime * 3) * 0.25;
    for (const material of materials.current) if (material) material.emissiveIntensity = glow;
  });

  const { width, height, depth } = FRAME;
  const bars: { position: [number, number, number]; size: [number, number, number] }[] = [];
  for (const sx of [-1, 1]) {
    for (const sy of [0, 1]) {
      for (const sz of [-1, 1]) {
        const x = (sx * width) / 2;
        const y = sy * height;
        const z = (sz * depth) / 2;
        const inward = sy === 0 ? 1 : -1;
        bars.push(
          { position: [x - (sx * CORNER) / 2, y, z], size: [CORNER, 0.04, 0.04] },
          { position: [x, y + (inward * CORNER) / 2, z], size: [0.04, CORNER, 0.04] },
          { position: [x, y, z - (sz * CORNER) / 2], size: [0.04, 0.04, CORNER] },
        );
      }
    }
  }

  return (
    <group position={[0, 0.05, PILE_Z]}>
      {bars.map((bar, index) => (
        <mesh key={index} position={bar.position}>
          <boxGeometry args={bar.size} />
          <meshStandardMaterial
            ref={(material) => {
              materials.current[index] = material;
            }}
            color={ACCENT}
            emissive={ACCENT}
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}

      {/* label above the front top left corner, like in the detection images */}
      <group position={[-width / 2 + 0.55, height + 0.16, depth / 2]}>
        <mesh>
          <planeGeometry args={[1.1, 0.26]} />
          <meshBasicMaterial color={ACCENT} side={DoubleSide} />
        </mesh>
        <Text
          position={[0, 0, 0.01]}
          font={MONO_FONT}
          fontSize={0.13}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          landfill 0.94
        </Text>
      </group>
    </group>
  );
}

// small satellite with solar panels, circling over the pile; a faint cone of
// green light under it scans the ground
function Satellite() {
  const orbit = useRef<Group>(null);
  const beam = useRef<MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (orbit.current) {
      const angle = t * 0.45;
      orbit.current.position.set(
        Math.cos(angle) * 0.55,
        2.55 + Math.sin(t * 1.4) * 0.07,
        PILE_Z + Math.sin(angle) * 0.4,
      );
      orbit.current.rotation.y = -angle;
    }
    if (beam.current) beam.current.opacity = 0.1 + (Math.sin(t * 2.2) * 0.5 + 0.5) * 0.08;
  });

  return (
    <group ref={orbit}>
      {/* body */}
      <mesh castShadow>
        <boxGeometry args={[0.32, 0.28, 0.32]} />
        <meshStandardMaterial color="#d9d4c7" flatShading />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[0.34, 0.04, 0.34]} />
        <meshStandardMaterial color="#c9a227" metalness={0.3} roughness={0.5} />
      </mesh>
      {/* solar panels on both sides */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.5, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.05, 0.05, 0.05]} />
            <meshStandardMaterial color="#8a8f99" />
          </mesh>
          <mesh position={[side * 0.28, 0, 0]} castShadow>
            <boxGeometry args={[0.5, 0.02, 0.26]} />
            <meshStandardMaterial color="#2c4a7a" metalness={0.4} roughness={0.35} />
          </mesh>
        </group>
      ))}
      {/* camera looking down */}
      <mesh position={[0, -0.18, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 0.08, 8]} />
        <meshStandardMaterial color="#22262d" />
      </mesh>
      {/* scanning beam: an open cone from the camera down to the pile */}
      <mesh position={[0, -1.2, 0]}>
        <coneGeometry args={[0.75, 2.0, 16, 1, true]} />
        <meshBasicMaterial
          ref={beam}
          color={ACCENT}
          transparent
          opacity={0.12}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
}

export function LandfillStationModel({ highlighted }: StationModelProps) {
  return (
    <group>
      <StationFloor highlighted={highlighted} color="#8f8466" />

      {/* the pile of waste */}
      <CuboidCollider args={[1.15, 0.45, 0.95]} position={[0, 0.45, PILE_Z]} />
      <group position={[0, 0, PILE_Z]}>
        <mesh position={[0, 0.22, 0]} scale={[1.25, 0.55, 1.05]} castShadow receiveShadow>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#7a6a55" flatShading />
        </mesh>
        {JUNK.map(([x, y, z, size, color, kind], index) => (
          <Junk
            key={index}
            position={[x, y, z]}
            size={size}
            color={color}
            kind={kind}
            index={index}
          />
        ))}
      </group>

      <DetectionFrame highlighted={highlighted} />
      <Satellite />
    </group>
  );
}
