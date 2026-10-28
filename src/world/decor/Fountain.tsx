import { DoubleSide } from 'three';
import { CylinderCollider, RigidBody } from '@react-three/rapier';
import { terrainHeight } from '../island/islandShape';
import { Jet } from './Jet';
import { FOUNTAIN_RADIUS } from './plazaLayout';
import { Ripples } from './Ripples';
import { Splash } from './Splash';
import { WATER_COLOR, useFlowTexture } from './water';

// Stone fountain in the middle of the plaza, standing on a round paved area:
// - a wide basin with a rim and four short posts; each post shoots a thin arc
//   of water towards the middle
// - a column with two bowls, one above the other; water bubbles up in the top
//   bowl and runs over the edges of both bowls in thin curtains
// - flower bushes around the paving

const STONE = '#cfc8b9';
const STONE_DARK = '#aaa294';
const PAVING = '#ddd3c2';
const PAVING_RING = '#c5baa7';

const BASIN_HEIGHT = 0.45;
const POOL_Y = 0.5; // water surface in the basin
const POOL_RADIUS = FOUNTAIN_RADIUS - 0.15;

const MIDDLE_BOWL = { y: 1.55, radius: 1.2, height: 0.35 };
const TOP_BOWL = { y: 2.42, radius: 0.6, height: 0.22 };
const MIDDLE_WATER_Y = MIDDLE_BOWL.y + MIDDLE_BOWL.height / 2 + 0.01;
const TOP_WATER_Y = TOP_BOWL.y + TOP_BOWL.height / 2 + 0.01;
const SPOUT_TOP = 2.78;

const POST_ANGLES = [1, 3, 5, 7].map((i) => (i * Math.PI) / 4); // the four diagonals
const POST_TOP = 1.05;
const JET_LANDING_RADIUS = 1.45; // where the arcs come down, between the posts and the column

const BUSH_COLORS = ['#5f9a3a', '#6fae45'];
const FLOWER_COLORS = ['#f28cb1', '#ffd166', '#ffffff'];

// eight-sided water surface, turned to match the eight-sided stone around it
function WaterDisk({ y, radius }: { y: number; radius: number }) {
  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 8]}>
      <circleGeometry args={[radius, 8]} />
      <meshStandardMaterial color={WATER_COLOR} roughness={0.15} transparent opacity={0.88} />
    </mesh>
  );
}

interface CurtainProps {
  top: number;
  bottom: number;
  topRadius: number;
  bottomRadius: number;
}

// open tube of falling water from the edge of a bowl down to the water below
function Curtain({ top, bottom, topRadius, bottomRadius }: CurtainProps) {
  const flow = useFlowTexture(0.9, Math.round(topRadius * 8), 1);
  return (
    <mesh position={[0, (top + bottom) / 2, 0]}>
      <cylinderGeometry args={[topRadius, bottomRadius, top - bottom, 24, 1, true]} />
      <meshStandardMaterial
        color={WATER_COLOR}
        map={flow}
        alphaMap={flow}
        transparent
        opacity={0.5}
        depthWrite={false}
        side={DoubleSide}
      />
    </mesh>
  );
}

const BUSH_LEAVES = [
  [0, 0.28, 0, 0.36],
  [0.28, 0.2, 0.12, 0.26],
  [-0.22, 0.18, 0.18, 0.24],
];
const BUSH_FLOWERS = [
  [0.1, 0.6, 0.15],
  [-0.15, 0.52, -0.08],
  [0.32, 0.4, 0.2],
  [-0.3, 0.36, 0.25],
  [0.05, 0.5, -0.25],
];

function FlowerBush({ angle }: { angle: number }) {
  const distance = FOUNTAIN_RADIUS + 1.05;
  return (
    <group position={[Math.cos(angle) * distance, 0, Math.sin(angle) * distance]}>
      {BUSH_LEAVES.map(([x, y, z, size], index) => (
        <mesh key={index} position={[x, y, z]} scale={[1, 0.85, 1]} castShadow receiveShadow>
          <icosahedronGeometry args={[size, 0]} />
          <meshStandardMaterial color={BUSH_COLORS[index % 2]} flatShading />
        </mesh>
      ))}
      {/* small flowers sitting on the leaves */}
      {BUSH_FLOWERS.map(([x, y, z], index) => (
        <mesh key={index} position={[x, y, z]}>
          <icosahedronGeometry args={[0.06, 0]} />
          <meshStandardMaterial color={FLOWER_COLORS[index % FLOWER_COLORS.length]} flatShading />
        </mesh>
      ))}
    </group>
  );
}

export function Fountain() {
  const postDistance = FOUNTAIN_RADIUS - 0.1;

  return (
    <group position={[0, terrainHeight(0, 0), 0]}>
      <RigidBody type="fixed" colliders={false}>
        {/* the basin is low enough to jump in; the column can't be walked through */}
        <CylinderCollider
          args={[BASIN_HEIGHT / 2, FOUNTAIN_RADIUS]}
          position={[0, BASIN_HEIGHT / 2, 0]}
        />
        <CylinderCollider args={[1.4, 0.5]} position={[0, 1.4, 0]} />
      </RigidBody>

      {/* round paving with a darker ring */}
      <mesh position={[0, 0.03, 0]} rotation={[0, Math.PI / 8, 0]} receiveShadow>
        <cylinderGeometry args={[FOUNTAIN_RADIUS + 1.6, FOUNTAIN_RADIUS + 1.65, 0.08, 16]} />
        <meshStandardMaterial color={PAVING} flatShading />
      </mesh>
      <mesh position={[0, 0.075, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[FOUNTAIN_RADIUS + 0.35, FOUNTAIN_RADIUS + 0.6, 16]} />
        <meshStandardMaterial color={PAVING_RING} />
      </mesh>

      {/* basin with a rounded rim */}
      <mesh position={[0, BASIN_HEIGHT / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[FOUNTAIN_RADIUS - 0.1, FOUNTAIN_RADIUS, BASIN_HEIGHT, 8]} />
        <meshStandardMaterial color={STONE_DARK} flatShading />
      </mesh>
      <mesh
        position={[0, BASIN_HEIGHT + 0.06, 0]}
        rotation={[Math.PI / 2, 0, Math.PI / 8]}
        castShadow
        receiveShadow
      >
        <torusGeometry args={[FOUNTAIN_RADIUS - 0.1, 0.16, 4, 8]} />
        <meshStandardMaterial color={STONE} flatShading />
      </mesh>
      <WaterDisk y={POOL_Y} radius={POOL_RADIUS} />
      <group position={[0, POOL_Y + 0.01, 0]}>
        <Ripples radius={POOL_RADIUS - 0.1} startScale={0.6} period={2.6} />
      </group>

      {/* four posts on the rim, each with an arc of water towards the middle */}
      {POST_ANGLES.map((angle) => {
        const x = Math.cos(angle);
        const z = Math.sin(angle);
        return (
          <group key={angle}>
            <mesh position={[x * postDistance, 0.8, z * postDistance]} castShadow>
              <cylinderGeometry args={[0.13, 0.17, 0.5, 6]} />
              <meshStandardMaterial color={STONE} flatShading />
            </mesh>
            <mesh position={[x * postDistance, POST_TOP + 0.03, z * postDistance]} castShadow>
              <icosahedronGeometry args={[0.14, 0]} />
              <meshStandardMaterial color={STONE_DARK} flatShading />
            </mesh>
            <Jet
              from={[x * (postDistance - 0.15), POST_TOP, z * (postDistance - 0.15)]}
              to={[x * JET_LANDING_RADIUS, POOL_Y, z * JET_LANDING_RADIUS]}
              height={0.45}
            />
            <group position={[x * JET_LANDING_RADIUS, POOL_Y + 0.015, z * JET_LANDING_RADIUS]}>
              <Ripples radius={0.35} startScale={0.2} period={1} count={2} />
            </group>
          </group>
        );
      })}

      {/* column with a ring in the middle */}
      <mesh position={[0, (BASIN_HEIGHT + MIDDLE_BOWL.y) / 2, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.45, MIDDLE_BOWL.y - BASIN_HEIGHT, 8]} />
        <meshStandardMaterial color={STONE} flatShading />
      </mesh>
      <mesh position={[0, 0.95, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.38, 0.07, 4, 8]} />
        <meshStandardMaterial color={STONE_DARK} flatShading />
      </mesh>

      {/* middle bowl */}
      <mesh position={[0, MIDDLE_BOWL.y, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[MIDDLE_BOWL.radius, 0.4, MIDDLE_BOWL.height, 8]} />
        <meshStandardMaterial color={STONE} flatShading />
      </mesh>
      <WaterDisk y={MIDDLE_WATER_Y} radius={MIDDLE_BOWL.radius - 0.1} />
      <Curtain
        top={MIDDLE_WATER_Y}
        bottom={POOL_Y}
        topRadius={MIDDLE_BOWL.radius - 0.02}
        bottomRadius={MIDDLE_BOWL.radius + 0.15}
      />
      <group position={[0, MIDDLE_WATER_Y + 0.01, 0]}>
        <Ripples radius={MIDDLE_BOWL.radius - 0.15} startScale={0.6} period={1.8} count={2} />
      </group>

      {/* upper column and top bowl */}
      <mesh position={[0, (MIDDLE_WATER_Y + TOP_BOWL.y) / 2, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.22, TOP_BOWL.y - MIDDLE_WATER_Y, 8]} />
        <meshStandardMaterial color={STONE} flatShading />
      </mesh>
      <mesh position={[0, TOP_BOWL.y, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[TOP_BOWL.radius, 0.2, TOP_BOWL.height, 8]} />
        <meshStandardMaterial color={STONE} flatShading />
      </mesh>
      <WaterDisk y={TOP_WATER_Y} radius={TOP_BOWL.radius - 0.08} />
      <Curtain
        top={TOP_WATER_Y}
        bottom={MIDDLE_WATER_Y}
        topRadius={TOP_BOWL.radius - 0.02}
        bottomRadius={TOP_BOWL.radius + 0.08}
      />

      {/* spout on top, with water bubbling up out of it */}
      <mesh position={[0, (TOP_WATER_Y + SPOUT_TOP) / 2, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.09, SPOUT_TOP - TOP_WATER_Y, 6]} />
        <meshStandardMaterial color={STONE_DARK} flatShading />
      </mesh>
      <group position={[0, SPOUT_TOP, 0]}>
        <Splash count={14} spread={0.45} height={0.35} period={0.8} size={0.04} />
      </group>

      {POST_ANGLES.map((angle) => (
        <FlowerBush key={angle} angle={angle} />
      ))}
    </group>
  );
}
