import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, CylinderCollider } from '@react-three/rapier';
import { DoubleSide, Shape, type MeshBasicMaterial, type MeshStandardMaterial } from 'three';
import { StationFloor } from '../../stations/StationFloor';
import type { StationModelProps } from '../types';

// Station of the smart home project: a small house whose lights switch on
// and off by themselves (the automation), an antenna on the roof sending out
// signals (the devices talk over MQTT), a Raspberry Pi with blinking status
// lights, and a garden lamp with a motion sensor that switches on when the
// player comes close.

const ACCENT = '#3b82c4';
const WALL = '#f3ead8';
const LIGHT = '#ffd36b';

const HOUSE = { z: -0.45, width: 1.55, height: 0.95, depth: 1.25 };

// triangle filling the wall under the roof, at the front and the back
function gableShape(width: number, height: number) {
  return new Shape()
    .moveTo(-width / 2, 0)
    .lineTo(width / 2, 0)
    .lineTo(0, height)
    .closePath();
}

function House() {
  const windows = useRef<(MeshStandardMaterial | null)[]>([]);
  const waves = useRef<(MeshBasicMaterial | null)[]>([]);
  const { width, height, depth } = HOUSE;
  const roofRise = 0.55;
  const gable = useMemo(() => gableShape(width, roofRise), [width]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // each window on its own schedule, like lights switched by the automation
    const schedule = [
      [7, 0.55],
      [5, 0.4],
      [9, 0.65],
    ];
    windows.current.forEach((material, index) => {
      if (!material) return;
      const [period, onPart] = schedule[index % schedule.length];
      const on = (t + index * 1.7) % period < period * onPart;
      material.emissiveIntensity = on ? 1 : 0.05;
    });
    // the antenna's waves light up one after another, from the inside out
    waves.current.forEach((material, index) => {
      if (!material) return;
      const phase = (t * 1.2 - index * 0.25) % 1;
      material.opacity = phase > 0 && phase < 0.5 ? 1 - phase * 2 : 0;
    });
  });

  const roofPanel = Math.hypot(width / 2, roofRise) + 0.12;
  const roofAngle = Math.atan2(roofRise, width / 2);

  return (
    <group position={[0, 0, HOUSE.z]}>
      <CuboidCollider
        args={[width / 2, (height + roofRise) / 2, depth / 2]}
        position={[0, (height + roofRise) / 2, 0]}
      />

      {/* walls */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={WALL} flatShading />
      </mesh>
      {/* gables under the roof, front and back */}
      {[1, -1].map((side) => (
        <mesh
          key={side}
          position={[0, height, (side * depth) / 2]}
          rotation={[0, side > 0 ? 0 : Math.PI, 0]}
        >
          <shapeGeometry args={[gable]} />
          <meshStandardMaterial color={WALL} side={DoubleSide} />
        </mesh>
      ))}
      {/* roof: two panels in the project's colour */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[(side * width) / 4, height + roofRise / 2, 0]}
          rotation={[0, 0, -side * roofAngle]}
          castShadow
        >
          <boxGeometry args={[roofPanel, 0.07, depth + 0.16]} />
          <meshStandardMaterial color={ACCENT} flatShading />
        </mesh>
      ))}

      {/* door and windows on the front */}
      <mesh position={[0.32, 0.28, depth / 2 + 0.01]}>
        <boxGeometry args={[0.3, 0.55, 0.03]} />
        <meshStandardMaterial color="#8a5a3b" flatShading />
      </mesh>
      {[
        [-0.38, 0.55, depth / 2 + 0.01],
        [-0.38, 0.55, -depth / 2 - 0.01],
        [width / 2 + 0.01, 0.55, 0],
      ].map(([x, y, z], index) => (
        <mesh key={index} position={[x, y, z]} rotation={[0, index === 2 ? Math.PI / 2 : 0, 0]}>
          <boxGeometry args={[0.32, 0.28, 0.03]} />
          <meshStandardMaterial
            ref={(material) => {
              windows.current[index] = material;
            }}
            color="#5d6d7e"
            emissive={LIGHT}
            emissiveIntensity={0}
          />
        </mesh>
      ))}

      {/* antenna on the roof with three arcs of signal around its tip */}
      <group position={[-0.35, height + roofRise * 0.55, 0]}>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.02, 0.025, 0.6, 6]} />
          <meshStandardMaterial color="#6f7a89" />
        </mesh>
        <mesh position={[0, 0.62, 0]}>
          <sphereGeometry args={[0.05, 8, 6]} />
          <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.6} />
        </mesh>
        {[0.16, 0.27, 0.38].map((radius, index) => (
          <mesh key={radius} position={[0, 0.62, 0]} rotation={[0, 0, Math.PI / 4]}>
            <torusGeometry args={[radius, 0.018, 4, 16, Math.PI / 2]} />
            <meshBasicMaterial
              ref={(material) => {
                waves.current[index] = material;
              }}
              color={ACCENT}
              transparent
              opacity={0}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

type Vec3 = [number, number, number];

// the chips and connectors on the Raspberry Pi board
const CHIPS: { position: Vec3; size: Vec3; color: string }[] = [
  { position: [-0.06, 0.03, 0], size: [0.1, 0.03, 0.1], color: '#1f2328' },
  { position: [0.1, 0.035, -0.05], size: [0.08, 0.04, 0.06], color: '#c0c4cc' },
  { position: [0.1, 0.035, 0.06], size: [0.08, 0.04, 0.06], color: '#c0c4cc' },
  { position: [-0.14, 0.025, -0.08], size: [0.05, 0.02, 0.04], color: '#1f2328' },
];

// a Raspberry Pi on a little post, with blinking green and red lights
function RaspberryPi() {
  const leds = useRef<(MeshStandardMaterial | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    leds.current.forEach((material, index) => {
      if (material) material.emissiveIntensity = Math.sin(t * (3 + index * 2.3)) > 0.3 ? 1.5 : 0.1;
    });
  });

  return (
    <group position={[1.05, 0, 0.45]} rotation={[0, -0.4, 0]}>
      <CylinderCollider args={[0.35, 0.12]} position={[0, 0.35, 0]} />
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.06, 0.6, 6]} />
        <meshStandardMaterial color="#6f7a89" />
      </mesh>
      <group position={[0, 0.62, 0]} rotation={[0.35, 0, 0]}>
        {/* green circuit board */}
        <mesh castShadow>
          <boxGeometry args={[0.36, 0.03, 0.24]} />
          <meshStandardMaterial color="#2e8b57" flatShading />
        </mesh>
        {/* chips and connectors */}
        {CHIPS.map(({ position, size, color }, index) => (
          <mesh key={index} position={position}>
            <boxGeometry args={size} />
            <meshStandardMaterial color={color} />
          </mesh>
        ))}
        {['#4cd964', '#ff5a52'].map((color, index) => (
          <mesh key={color} position={[-0.15 + index * 0.05, 0.025, 0.09]}>
            <boxGeometry args={[0.025, 0.02, 0.025]} />
            <meshStandardMaterial
              ref={(material) => {
                leds.current[index] = material;
              }}
              color={color}
              emissive={color}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// garden lamp with a motion sensor: it lights up while the player is here
function GardenLamp({ highlighted }: StationModelProps) {
  return (
    <group position={[-1.1, 0, 0.45]}>
      <CylinderCollider args={[0.5, 0.08]} position={[0, 0.5, 0]} />
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.05, 0.9, 6]} />
        <meshStandardMaterial color="#3d4654" />
      </mesh>
      <mesh position={[0, 0.98, 0]}>
        <boxGeometry args={[0.16, 0.18, 0.16]} />
        <meshStandardMaterial
          color="#fff6d8"
          emissive={LIGHT}
          emissiveIntensity={highlighted ? 1.6 : 0.05}
        />
      </mesh>
      <mesh position={[0, 1.09, 0]}>
        <coneGeometry args={[0.14, 0.1, 4]} />
        <meshStandardMaterial color="#3d4654" flatShading />
      </mesh>
      {/* the sensor: a small dome that glows red when it sees the player */}
      <mesh position={[0, 0.7, 0.04]}>
        <sphereGeometry args={[0.035, 6, 4]} />
        <meshStandardMaterial
          color="#222"
          emissive="#ff5a52"
          emissiveIntensity={highlighted ? 1.5 : 0}
        />
      </mesh>
    </group>
  );
}

export function SmartHomeStationModel({ highlighted }: StationModelProps) {
  return (
    <group>
      <StationFloor highlighted={highlighted} color="#8cbf5f" />

      {/* stepping stones from the front to the door */}
      {[1.25, 0.95, 0.65, 0.38].map((z, index) => (
        <mesh
          key={z}
          position={[0.32 + (index % 2) * 0.06, 0.07, z]}
          rotation={[-Math.PI / 2, 0, index]}
        >
          <circleGeometry args={[0.12, 6]} />
          <meshStandardMaterial color="#c9c3b5" />
        </mesh>
      ))}

      <House />
      <RaspberryPi />
      <GardenLamp highlighted={highlighted} />
    </group>
  );
}
