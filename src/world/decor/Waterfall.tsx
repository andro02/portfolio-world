import { Pillar } from '../island/Pillar';
import { Mist } from './Mist';
import { Moss } from './Moss';
import { Pond } from './Pond';
import { Ripples } from './Ripples';
import { Splash } from './Splash';
import { Stream } from './Stream';
import { WaterSheet } from './WaterSheet';
import { WATER_COLOR, useFlowTexture } from './water';
import {
  BACK_ROCK,
  CASCADE,
  FACE_ROTATION,
  POND,
  STEP_ALONG,
  STEP_ROCK,
  WATERFALL_PILLARS,
} from './waterfallLayout';

// Waterfall in two steps: a spring on top of the tall rock runs over its edge,
// falls into a small pool on the lower rock, and falls again into the pond.
// From the pond a river runs into the sea (Pond.tsx, Stream.tsx). Positions
// come from waterfallLayout.ts.

const STONE = '#8f8a80';
const STONE_LIGHT = '#a7a196';

interface ChannelProps {
  from: number; // distance along the front where the water starts
  to: number; // ... and where it reaches the edge
  y: number;
  width: number;
}

// flat water running along +z (towards the edge) on top of a rock
function Channel({ from, to, y, width }: ChannelProps) {
  const length = to - from;
  const flow = useFlowTexture(1.1, 2, Math.max(1, length));
  return (
    // a plane is vertical; turned to lie flat, its texture runs towards +z
    <mesh position={[0, y, (from + to) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, length]} />
      <meshStandardMaterial
        color={WATER_COLOR}
        map={flow}
        alphaMap={flow}
        transparent
        opacity={0.92}
        depthWrite={false}
      />
    </mesh>
  );
}

// stone slab sticking out over the edge the water falls from
function Lip({ along, top, width }: { along: number; top: number; width: number }) {
  const depth = 1.3;
  return (
    <mesh position={[0, top - 0.15, along - depth / 2]} castShadow receiveShadow>
      <boxGeometry args={[width, 0.3, depth]} />
      <meshStandardMaterial color={STONE_LIGHT} flatShading />
    </mesh>
  );
}

// small round pool with a ring of stones, open at the front where it overflows
function SmallPool({
  along,
  y,
  radius,
  seed,
}: {
  along: number;
  y: number;
  radius: number;
  seed: number;
}) {
  const stones = 9;
  return (
    <group position={[0, y, along]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius, 10]} />
        <meshStandardMaterial color={WATER_COLOR} roughness={0.15} transparent opacity={0.9} />
      </mesh>
      {Array.from({ length: stones }, (_, index) => {
        // +z is the front, angle PI / 2; leave the front open
        const angle = Math.PI / 2 + 0.7 + (index / (stones - 1)) * (Math.PI * 2 - 1.4);
        const size = 0.2 + ((index * 7 + seed) % 4) * 0.05;
        return (
          <mesh
            key={index}
            position={[Math.cos(angle) * radius, 0.02, Math.sin(angle) * radius]}
            rotation={[index, index * 2, 0]}
            scale={[1, 0.7, 1]}
            castShadow
          >
            <icosahedronGeometry args={[size, 0]} />
            <meshStandardMaterial color={STONE} flatShading />
          </mesh>
        );
      })}
    </group>
  );
}

// where falling water hits a water surface: foam, drops, rings and mist
function Impact({ along, y, size }: { along: number; y: number; size: number }) {
  return (
    <group position={[0, y + 0.02, along]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.6 * size, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.6} depthWrite={false} />
      </mesh>
      <Splash count={12} spread={0.8 * size} height={0.45 * size} period={0.7} size={0.06} />
      <Ripples radius={1.4 * size} startScale={0.3} period={1.8} />
      <Mist spread={0.9 * size} rise={1.3 * size} size={0.4 * size} />
    </group>
  );
}

export function Waterfall() {
  const { spring, upperLip, midPool, lowerLip } = CASCADE;
  const backTop = BACK_ROCK.position[1] + BACK_ROCK.height;
  const stepTop = STEP_ROCK.position[1] + STEP_ROCK.height;

  return (
    <>
      {WATERFALL_PILLARS.map((pillar, index) => (
        <Pillar key={index} {...pillar} />
      ))}

      {/* everything on the rocks, turned so that +z is the front */}
      <group
        position={[BACK_ROCK.position[0], 0, BACK_ROCK.position[2]]}
        rotation={[0, FACE_ROTATION, 0]}
      >
        {/* spring on top of the tall rock, bubbling up */}
        <SmallPool along={spring.along} y={spring.y} radius={spring.radius} seed={1} />
        <group position={[0, spring.y, spring.along]}>
          <Splash count={8} spread={0.35} height={0.18} period={0.9} size={0.035} />
        </group>
        <group position={[0, backTop + 0.02, 0]}>
          <Moss radius={BACK_ROCK.radius * 0.85} count={12} seed={5} keepClear={0.9} />
        </group>

        {/* upper fall */}
        <Channel
          from={spring.along + spring.radius - 0.1}
          to={upperLip.along}
          y={upperLip.y}
          width={1}
        />
        <Lip along={upperLip.along} top={backTop + 0.05} width={1.6} />
        <group position={[0, upperLip.y, upperLip.along]}>
          <WaterSheet
            width={1}
            height={upperLip.y - midPool.y}
            forward={CASCADE.upperForward}
            widen={0.2}
          />
        </group>

        {/* pool on the lower rock */}
        <SmallPool along={midPool.along} y={midPool.y} radius={midPool.radius} seed={2} />
        <Impact along={upperLip.along + CASCADE.upperForward} y={midPool.y} size={0.6} />
        <group position={[0, stepTop + 0.02, STEP_ALONG]}>
          <Moss radius={STEP_ROCK.radius * 0.8} count={8} seed={9} keepClear={0.9} />
        </group>

        {/* lower fall */}
        <Channel
          from={midPool.along + midPool.radius - 0.1}
          to={lowerLip.along}
          y={lowerLip.y}
          width={1.2}
        />
        <Lip along={lowerLip.along} top={stepTop + 0.05} width={1.8} />
        <group position={[0, lowerLip.y, lowerLip.along]}>
          <WaterSheet
            width={1.2}
            height={lowerLip.y - POND.level}
            forward={CASCADE.lowerForward}
            widen={0.3}
          />
        </group>
        <Impact along={lowerLip.along + CASCADE.lowerForward} y={POND.level} size={1} />
      </group>

      <Pond />
      <Stream />
    </>
  );
}
