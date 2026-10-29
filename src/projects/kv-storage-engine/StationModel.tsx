import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { CuboidCollider } from '@react-three/rapier';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import { MONO_FONT } from '../../fonts';
import { StationFloor } from '../../stations/StationFloor';
import type { StationModelProps } from '../types';

// Station of the key-value storage engine: a terminal facing the path, a tower
// of LSM-tree levels with a glowing memtable on top that flushes blocks down
// into level 0, and a server rack with blinking lights.

const DARK = '#3d4654';
const METAL = '#6f7a89';
const ACCENT = '#38d9c4'; // memtable and terminal text

// commands typed on the terminal screen, one after another
const SCREEN_LINES = ['>>> PUT name andrija', '>>> GET name', 'andrija', '>>> HLL COUNT users'];

// LSM-tree levels from the bottom (oldest, largest) to the top (level 0,
// newest); each lower level is wider and holds more SSTables
const LEVELS = [
  { width: 1.3, y: 0.35, blocks: 4, color: '#5c7cfa' },
  { width: 1.0, y: 0.85, blocks: 3, color: '#4dabf7' },
  { width: 0.72, y: 1.35, blocks: 2, color: '#3bc9db' },
];
const LEVEL_THICKNESS = 0.08;
const BLOCK_SIZE = 0.22;
const MEMTABLE_Y = 1.85;
const FLUSH_PERIOD = 4; // seconds between two flushes

// level 0 has two blocks (at 45 and 225 degrees); the flushed block lands in
// the free spot between them
const LANDING_ANGLE = (3 * Math.PI) / 4;

function Terminal({ highlighted }: StationModelProps) {
  const screen = useRef<MeshStandardMaterial>(null);
  const cursor = useRef<Mesh>(null);
  const textGroup = useRef<Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (cursor.current) cursor.current.visible = Math.floor(t * 2) % 2 === 0;
    if (screen.current) screen.current.emissiveIntensity = highlighted ? 0.9 : 0.45;

    // reveal one more line every second, then start over
    if (textGroup.current) {
      const shown = Math.floor(t) % (SCREEN_LINES.length + 2);
      textGroup.current.children.forEach((line, index) => {
        line.visible = index < shown;
      });
    }
  });

  return (
    <group position={[0, 0, 0.9]}>
      <CuboidCollider args={[0.55, 0.45, 0.3]} position={[0, 0.45, 0]} />

      {/* desk */}
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.84, 0.6]} />
        <meshStandardMaterial color={METAL} flatShading />
      </mesh>

      {/* monitor, tilted slightly back, screen facing +z (the path) */}
      <group position={[0, 1.15, -0.05]} rotation={[-0.15, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[1.0, 0.62, 0.08]} />
          <meshStandardMaterial color={DARK} />
        </mesh>
        <mesh position={[0, 0, 0.045]}>
          <planeGeometry args={[0.9, 0.52]} />
          <meshStandardMaterial ref={screen} color="#0c1a1f" emissive="#0f3b3a" />
        </mesh>

        <group ref={textGroup} position={[-0.41, 0.19, 0.05]}>
          {SCREEN_LINES.map((line, index) => (
            <Text
              key={line}
              position={[0, -index * 0.1, 0]}
              font={MONO_FONT}
              fontSize={0.065}
              anchorX="left"
              anchorY="middle"
              color={ACCENT}
            >
              {line}
            </Text>
          ))}
        </group>

        <mesh ref={cursor} position={[-0.38, -0.2, 0.05]}>
          <planeGeometry args={[0.04, 0.07]} />
          <meshBasicMaterial color={ACCENT} />
        </mesh>
      </group>

      {/* monitor stand */}
      <mesh position={[0, 0.92, -0.1]}>
        <boxGeometry args={[0.08, 0.2, 0.08]} />
        <meshStandardMaterial color={DARK} />
      </mesh>
    </group>
  );
}

function LsmTower() {
  const memtable = useRef<Mesh>(null);
  const flushed = useRef<Mesh>(null);
  const topLevel = LEVELS[LEVELS.length - 1];

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;

    // the memtable slowly "fills up" and pulses
    if (memtable.current) {
      const fill = (t % FLUSH_PERIOD) / FLUSH_PERIOD;
      memtable.current.scale.setScalar(0.8 + fill * 0.35);
      memtable.current.rotation.y = t * 0.6;
    }

    // right after it is full, a block falls from the memtable onto level 0
    if (flushed.current) {
      const phase = (t % FLUSH_PERIOD) / 0.6; // the fall takes 0.6 s
      flushed.current.visible = phase < 1;
      const landing = topLevel.width / 2 - BLOCK_SIZE / 2 - 0.04;
      const targetY = topLevel.y + LEVEL_THICKNESS / 2 + BLOCK_SIZE / 2;
      flushed.current.position.set(
        Math.cos(LANDING_ANGLE) * landing * phase,
        MEMTABLE_Y + (targetY - MEMTABLE_Y) * phase * phase,
        Math.sin(LANDING_ANGLE) * landing * phase,
      );
    }
  });

  return (
    <group position={[0.7, 0, -0.5]}>
      <CuboidCollider args={[0.65, 1, 0.65]} position={[0, 1, 0]} />

      {/* central column holding the levels; the memtable floats above it */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 1.4, 6]} />
        <meshStandardMaterial color={METAL} />
      </mesh>

      {LEVELS.map((level) => (
        <group key={level.y} position={[0, level.y, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[level.width, LEVEL_THICKNESS, level.width]} />
            <meshStandardMaterial color={DARK} flatShading />
          </mesh>

          {/* SSTables: blocks evenly spread around the column */}
          {Array.from({ length: level.blocks }, (_, index) => {
            const angle = (index / level.blocks) * Math.PI * 2 + Math.PI / 4;
            const radius = level.width / 2 - BLOCK_SIZE / 2 - 0.04;
            return (
              <mesh
                key={index}
                position={[
                  Math.cos(angle) * radius,
                  LEVEL_THICKNESS / 2 + BLOCK_SIZE / 2,
                  Math.sin(angle) * radius,
                ]}
                castShadow
              >
                <boxGeometry args={[BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE]} />
                <meshStandardMaterial color={level.color} flatShading />
              </mesh>
            );
          })}
        </group>
      ))}

      {/* memtable */}
      <mesh ref={memtable} position={[0, MEMTABLE_Y, 0]}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.8} />
      </mesh>

      <mesh ref={flushed} position={[0, MEMTABLE_Y, 0]}>
        <boxGeometry args={[BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE]} />
        <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

const LED_ROWS = 6;
const LED_COLUMNS = 3;

function ServerRack() {
  const leds = useRef<MeshStandardMaterial[]>([]);

  // every light gets its own blinking speed and offset
  const timings = useMemo(
    () =>
      Array.from({ length: LED_ROWS * LED_COLUMNS }, (_, index) => ({
        speed: 1.5 + ((index * 7) % 5) * 0.6,
        offset: (index * 1.37) % 3,
      })),
    [],
  );

  useFrame(({ clock }) => {
    leds.current.forEach((material, index) => {
      const { speed, offset } = timings[index];
      material.emissiveIntensity = Math.sin(clock.elapsedTime * speed + offset) > 0.2 ? 1.2 : 0.1;
    });
  });

  return (
    <group position={[-0.8, 0, -0.65]}>
      <CuboidCollider args={[0.4, 0.95, 0.35]} position={[0, 0.95, 0]} />

      <mesh position={[0, 0.95, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 1.9, 0.7]} />
        <meshStandardMaterial color={DARK} flatShading />
      </mesh>

      {/* server units with lights on the front */}
      {Array.from({ length: LED_ROWS }, (_, row) => (
        <group key={row} position={[0, 0.35 + row * 0.26, 0.351]}>
          <mesh>
            <planeGeometry args={[0.7, 0.2]} />
            <meshStandardMaterial color={METAL} />
          </mesh>
          {Array.from({ length: LED_COLUMNS }, (_, column) => {
            const index = row * LED_COLUMNS + column;
            return (
              <mesh key={column} position={[0.18 + column * 0.07, 0, 0.005]}>
                <planeGeometry args={[0.035, 0.035]} />
                <meshStandardMaterial
                  ref={(material) => {
                    if (material) leds.current[index] = material;
                  }}
                  color={column === 2 ? '#ffa94d' : '#69db7c'}
                  emissive={column === 2 ? '#ffa94d' : '#69db7c'}
                />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
}

export function KvStationModel({ highlighted }: StationModelProps) {
  return (
    <group>
      <StationFloor highlighted={highlighted} />

      <Terminal highlighted={highlighted} />
      <LsmTower />
      <ServerRack />
    </group>
  );
}
