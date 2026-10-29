import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, CylinderCollider } from '@react-three/rapier';
import { CanvasTexture, DoubleSide, type Group, type Mesh, type MeshStandardMaterial } from 'three';
import { StationFloor } from '../../stations/StationFloor';
import type { StationModelProps } from '../types';

// Station of the serverless movie platform: an outdoor cinema screen showing
// a film, a projector with turning film reels, a cloud above (the serverless
// backend) sending small packets of data down to the projector, and a bucket
// of popcorn.

const ACCENT = '#8a5cd0';
const DARK = '#2b2735';

const SCREEN = { y: 1.4, z: -0.85, width: 2.1, height: 1.15 };
const PROJECTOR = { x: 0.95, y: 0.62, z: 0.35 };
const CLOUD = { x: -0.75, y: 2.75, z: -0.25 };
const PACKETS = 5;

// the picture on the screen, drawn once on a canvas: an evening sky over
// hills with a big sun, like the opening shot of a film
function createFilmTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 140;
  const context = canvas.getContext('2d')!;

  const sky = context.createLinearGradient(0, 0, 0, 140);
  sky.addColorStop(0, '#3b2a6b');
  sky.addColorStop(0.6, '#c45b9a');
  sky.addColorStop(1, '#f2a65a');
  context.fillStyle = sky;
  context.fillRect(0, 0, 256, 140);

  context.fillStyle = '#ffd36b';
  context.beginPath();
  context.arc(150, 92, 30, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#2a1f4a';
  context.beginPath();
  context.moveTo(0, 140);
  context.lineTo(0, 100);
  context.lineTo(60, 70);
  context.lineTo(110, 105);
  context.lineTo(170, 80);
  context.lineTo(256, 112);
  context.lineTo(256, 140);
  context.fill();

  return new CanvasTexture(canvas);
}

function Screen() {
  const [film] = useState(createFilmTexture);
  const picture = useRef<MeshStandardMaterial>(null);
  const pictureBack = useRef<MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    // a light, uneven flicker, like a real projector
    const t = clock.elapsedTime;
    const brightness = 0.85 + Math.sin(t * 23) * 0.03 + Math.sin(t * 7.3) * 0.03;
    if (picture.current) picture.current.emissiveIntensity = brightness;
    if (pictureBack.current) pictureBack.current.emissiveIntensity = brightness;
  });

  const { y, z, width, height } = SCREEN;
  return (
    <group position={[0, 0, z]}>
      <CuboidCollider
        args={[width / 2 + 0.1, (y + height / 2) / 2, 0.12]}
        position={[0, (y + height / 2) / 2, 0]}
      />
      {/* frame, and the picture on both sides: the camera may see the station
          from behind, like a screen projected on from the back */}
      <mesh position={[0, y, 0]} castShadow>
        <boxGeometry args={[width + 0.16, height + 0.16, 0.08]} />
        <meshStandardMaterial color={DARK} flatShading />
      </mesh>
      <mesh position={[0, y, 0.045]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          ref={picture}
          map={film}
          emissiveMap={film}
          emissive="#ffffff"
          emissiveIntensity={0.85}
        />
      </mesh>
      <mesh position={[0, y, -0.045]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          ref={pictureBack}
          map={film}
          emissiveMap={film}
          emissive="#ffffff"
          emissiveIntensity={0.85}
        />
      </mesh>
      {/* two legs */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[(side * width) / 2.4, (y - height / 2) / 2, -0.02]} castShadow>
          <boxGeometry args={[0.08, y - height / 2, 0.08]} />
          <meshStandardMaterial color={DARK} flatShading />
        </mesh>
      ))}
    </group>
  );
}

// a film reel: a flat wheel with spokes
function Reel({
  position,
  reel,
}: {
  position: [number, number, number];
  reel: (mesh: Mesh | null) => void;
}) {
  return (
    <mesh ref={reel} position={position} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.17, 0.17, 0.04, 6]} />
      <meshStandardMaterial color="#c3c8d1" metalness={0.2} roughness={0.5} flatShading />
    </mesh>
  );
}

function Projector() {
  const reels = useRef<(Mesh | null)[]>([]);

  useFrame((_, delta) => {
    for (const reel of reels.current) if (reel) reel.rotation.x += delta * 2;
  });

  // turned so that its lens points at the screen
  const toScreen = Math.atan2(-PROJECTOR.x, SCREEN.z - PROJECTOR.z);
  return (
    <group position={[PROJECTOR.x, 0, PROJECTOR.z]} rotation={[0, toScreen, 0]}>
      <CylinderCollider args={[0.4, 0.25]} position={[0, 0.4, 0]} />
      {/* stand */}
      <mesh position={[0, PROJECTOR.y / 2 - 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.12, PROJECTOR.y - 0.16, 6]} />
        <meshStandardMaterial color={DARK} />
      </mesh>
      <group position={[0, PROJECTOR.y, 0]}>
        {/* body, with a purple stripe */}
        <mesh castShadow>
          <boxGeometry args={[0.3, 0.24, 0.42]} />
          <meshStandardMaterial color="#5c5470" flatShading />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.31, 0.05, 0.43]} />
          <meshStandardMaterial color={ACCENT} />
        </mesh>
        {/* lens at the front (+z), glowing */}
        <mesh position={[0, 0.02, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.08, 0.1, 10]} />
          <meshStandardMaterial color="#cfc4ff" emissive="#cfc4ff" emissiveIntensity={0.8} />
        </mesh>
        {/* two reels on top */}
        <Reel position={[0, 0.3, -0.1]} reel={(mesh) => void (reels.current[0] = mesh)} />
        <Reel position={[0, 0.27, 0.16]} reel={(mesh) => void (reels.current[1] = mesh)} />
      </group>
    </group>
  );
}

// the cloud with a lambda on it (the sign of serverless functions), and data
// packets travelling down from it to the projector one after another
function Cloud() {
  const cloud = useRef<Group>(null);
  const packets = useRef<(Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (cloud.current) cloud.current.position.y = CLOUD.y + Math.sin(t * 0.8) * 0.08;

    packets.current.forEach((packet, index) => {
      if (!packet) return;
      const progress = (t * 0.35 + index / PACKETS) % 1;
      packet.position.set(
        CLOUD.x + (PROJECTOR.x - CLOUD.x) * progress,
        CLOUD.y - 0.25 + (PROJECTOR.y + 0.45 - (CLOUD.y - 0.25)) * progress,
        CLOUD.z + (PROJECTOR.z - CLOUD.z) * progress,
      );
      packet.rotation.set(t * 2 + index, t * 1.5, 0);
      // fade in at the cloud, fade out at the projector
      packet.scale.setScalar(Math.sin(Math.PI * progress) * 0.9 + 0.1);
    });
  });

  return (
    <>
      <group ref={cloud} position={[CLOUD.x, CLOUD.y, CLOUD.z]}>
        {[
          [0, 0, 0, 0.42],
          [0.42, -0.06, 0.05, 0.32],
          [-0.4, -0.08, 0, 0.3],
          [0.15, 0.18, -0.05, 0.3],
        ].map(([x, y, z, size], index) => (
          <mesh key={index} position={[x, y, z]} scale={[1, 0.8, 0.9]} castShadow>
            <icosahedronGeometry args={[size, 0]} />
            <meshStandardMaterial color="#f7f5ff" flatShading />
          </mesh>
        ))}
        {/* λ: a long stroke and a short one, on the front of the cloud */}
        <group position={[0.02, 0.0, 0.42]}>
          <mesh rotation={[0, 0, 0.45]}>
            <boxGeometry args={[0.05, 0.36, 0.02]} />
            <meshBasicMaterial color={ACCENT} />
          </mesh>
          <mesh position={[-0.07, -0.08, 0]} rotation={[0, 0, -0.5]}>
            <boxGeometry args={[0.05, 0.2, 0.02]} />
            <meshBasicMaterial color={ACCENT} />
          </mesh>
        </group>
      </group>

      {Array.from({ length: PACKETS }, (_, index) => (
        <mesh
          key={index}
          ref={(packet) => {
            packets.current[index] = packet;
          }}
        >
          <boxGeometry args={[0.09, 0.09, 0.09]} />
          <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.6} />
        </mesh>
      ))}
    </>
  );
}

// red and white striped bucket full of popcorn
function Popcorn() {
  return (
    <group position={[-1.05, 0, 0.55]}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.15, 0.4, 8]} />
        <meshStandardMaterial color="#f4f1ea" flatShading />
      </mesh>
      {[0, 1, 2, 3].map((index) => (
        <mesh key={index} position={[0, 0.2, 0]} rotation={[0, (index * Math.PI) / 2, 0]}>
          <cylinderGeometry args={[0.202, 0.152, 0.4, 8, 1, true, 0, Math.PI / 4]} />
          <meshStandardMaterial color="#d64545" side={DoubleSide} />
        </mesh>
      ))}
      {[
        [0, 0.44, 0],
        [0.09, 0.42, 0.05],
        [-0.08, 0.43, -0.04],
        [0.03, 0.47, -0.08],
        [-0.05, 0.41, 0.09],
        [0.1, 0.4, -0.08],
      ].map(([x, y, z], index) => (
        <mesh key={index} position={[x, y, z]}>
          <icosahedronGeometry args={[0.07, 0]} />
          <meshStandardMaterial color="#fff3c4" flatShading />
        </mesh>
      ))}
    </group>
  );
}

export function MoviesStationModel({ highlighted }: StationModelProps) {
  return (
    <group>
      <StationFloor highlighted={highlighted} color="#a59cb5" />
      <Screen />
      <Projector />
      <Cloud />
      <Popcorn />
    </group>
  );
}
