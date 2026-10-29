import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider } from '@react-three/rapier';
import type { Group } from 'three';
import { StationFloor } from '../../stations/StationFloor';
import { Mist } from '../../world/decor/Mist';
import { Ripples } from '../../world/decor/Ripples';
import type { StationModelProps } from '../types';

// Station of the factory and fleet monitoring platform: a small factory hall
// with a sawtooth roof and a smoking chimney, a delivery truck at its loading
// ramp with a GPS pin above it sending out its position, and the truck's route
// drawn on the ground as a dotted line.

const ACCENT = '#e07b39';
const WALL = '#e3d6bf';
const ROOF = '#8a8f99';
const GLASS = '#ffd9a8';

const FACTORY = { x: -0.6, z: -0.6, width: 1.7, height: 0.95, depth: 1.2 };
const TRUCK = { x: 0.85, z: 0.15, rotation: -0.55 };

// dots of the route, from the front of the truck round to the factory's door
const ROUTE: [number, number][] = [
  [0.3, 0.98],
  [0.05, 1.0],
  [-0.15, 0.85],
  [-0.25, 0.6],
  [-0.27, 0.35],
];

function Factory({ highlighted }: StationModelProps) {
  const { width, height, depth } = FACTORY;
  const teeth = 3;
  const toothWidth = width / teeth;

  return (
    <group position={[FACTORY.x, 0, FACTORY.z]}>
      <CuboidCollider
        args={[width / 2, height / 2 + 0.2, depth / 2]}
        position={[0, height / 2, 0]}
      />

      {/* hall */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={WALL} flatShading />
      </mesh>

      {/* sawtooth roof: slanted panels with a strip of window on their steep side */}
      {Array.from({ length: teeth }, (_, index) => {
        const x = -width / 2 + toothWidth * (index + 0.5);
        return (
          <group key={index} position={[x, height, 0]}>
            <mesh position={[0, 0.14, 0]} rotation={[0, 0, -0.42]} castShadow>
              <boxGeometry args={[toothWidth * 1.08, 0.05, depth + 0.06]} />
              <meshStandardMaterial color={ROOF} flatShading />
            </mesh>
            <mesh position={[toothWidth / 2 - 0.03, 0.14, 0]}>
              <boxGeometry args={[0.04, 0.28, depth]} />
              <meshStandardMaterial color={GLASS} emissive={GLASS} emissiveIntensity={0.4} />
            </mesh>
          </group>
        );
      })}

      {/* big door and a row of lit windows on the front (towards the plaza) */}
      <mesh position={[0.35, 0.33, depth / 2 + 0.01]}>
        <boxGeometry args={[0.55, 0.62, 0.02]} />
        <meshStandardMaterial color="#6b5a48" flatShading />
      </mesh>
      {[-0.65, -0.35].map((x) => (
        <mesh key={x} position={[x, 0.6, depth / 2 + 0.01]}>
          <boxGeometry args={[0.2, 0.18, 0.02]} />
          {/* the windows light up while the player is here */}
          <meshStandardMaterial
            color={GLASS}
            emissive={GLASS}
            emissiveIntensity={highlighted ? 0.9 : 0.45}
          />
        </mesh>
      ))}
      {/* orange stripe along the wall */}
      <mesh position={[0, 0.82, depth / 2 + 0.005]}>
        <boxGeometry args={[width, 0.06, 0.02]} />
        <meshStandardMaterial color={ACCENT} />
      </mesh>

      {/* chimney with smoke */}
      <group position={[-width / 2 + 0.25, 0, -depth / 2 + 0.25]}>
        <mesh position={[0, height + 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.13, 0.9, 8]} />
          <meshStandardMaterial color="#a0522d" flatShading />
        </mesh>
        <mesh position={[0, height + 0.75, 0]}>
          <cylinderGeometry args={[0.115, 0.115, 0.08, 8]} />
          <meshStandardMaterial color="#e9e4d8" />
        </mesh>
        <group position={[0, height + 0.95, 0]}>
          <Mist
            count={6}
            spread={0.35}
            rise={1.4}
            size={0.22}
            period={3.5}
            opacity={0.4}
            color="#d6d3cc"
          />
        </group>
      </group>
    </group>
  );
}

function Truck() {
  const pin = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (pin.current) {
      pin.current.position.y = 1.35 + Math.sin(clock.elapsedTime * 2) * 0.06;
      pin.current.rotation.y = clock.elapsedTime * 0.8;
    }
  });

  return (
    <group position={[TRUCK.x, 0, TRUCK.z]} rotation={[0, TRUCK.rotation, 0]}>
      <CuboidCollider args={[0.3, 0.4, 0.8]} position={[0, 0.4, 0]} />

      {/* cab, in the project's colour, with a dark windscreen */}
      <mesh position={[0, 0.36, 0.55]} castShadow>
        <boxGeometry args={[0.52, 0.5, 0.42]} />
        <meshStandardMaterial color={ACCENT} flatShading />
      </mesh>
      <mesh position={[0, 0.46, 0.765]}>
        <boxGeometry args={[0.44, 0.2, 0.01]} />
        <meshStandardMaterial color="#2b3a4a" roughness={0.2} />
      </mesh>
      {/* cargo box */}
      <mesh position={[0, 0.45, -0.18]} castShadow>
        <boxGeometry args={[0.58, 0.62, 1.0]} />
        <meshStandardMaterial color="#f4f1ea" flatShading />
      </mesh>
      <mesh position={[0, 0.45, -0.18]}>
        <boxGeometry args={[0.59, 0.08, 1.01]} />
        <meshStandardMaterial color={ACCENT} />
      </mesh>
      {/* wheels */}
      {[0.5, -0.05, -0.45].flatMap((z) =>
        [-1, 1].map((side) => (
          <mesh
            key={`${z}${side}`}
            position={[side * 0.29, 0.12, z]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <cylinderGeometry args={[0.12, 0.12, 0.08, 10]} />
            <meshStandardMaterial color="#26282c" flatShading />
          </mesh>
        )),
      )}

      {/* GPS pin above the truck, with rings spreading from it: the truck
          reporting where it is */}
      <group ref={pin} position={[0, 1.35, 0]}>
        <mesh position={[0, 0.12, 0]}>
          <sphereGeometry args={[0.14, 8, 6]} />
          <meshStandardMaterial
            color={ACCENT}
            emissive={ACCENT}
            emissiveIntensity={0.35}
            flatShading
          />
        </mesh>
        <mesh position={[0, -0.06, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.1, 0.26, 8]} />
          <meshStandardMaterial
            color={ACCENT}
            emissive={ACCENT}
            emissiveIntensity={0.35}
            flatShading
          />
        </mesh>
        <mesh position={[0, 0.12, 0.13]}>
          <sphereGeometry args={[0.05, 6, 4]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>
      <group position={[0, 0.78, 0]}>
        <Ripples
          radius={0.7}
          startScale={0.15}
          period={1.8}
          count={2}
          color={ACCENT}
          opacity={0.7}
        />
      </group>
    </group>
  );
}

export function FleetStationModel({ highlighted }: StationModelProps) {
  return (
    <group>
      <StationFloor highlighted={highlighted} color="#8d9096" />

      {/* the route: orange dots on the ground */}
      {ROUTE.map(([x, z], index) => (
        <mesh key={index} position={[x, 0.07, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.06, 8]} />
          <meshBasicMaterial color={ACCENT} />
        </mesh>
      ))}

      <Factory highlighted={highlighted} />
      <Truck />
    </group>
  );
}
