import { DoubleSide } from 'three';
import { CylinderCollider, RigidBody } from '@react-three/rapier';
import { terrainHeight } from '../island/islandShape';
import { Ripples } from './Ripples';
import { Splash } from './Splash';
import { WATER_COLOR, useFlowTexture } from './water';

// Stone fountain in the middle of the plaza: a wide basin with a column, a
// small bowl on top of the column, a jet of drops falling into the bowl and a
// curtain of water running over the bowl's edge into the basin.

const STONE = '#c2bbad';
const STONE_DARK = '#a59e91';

const BASIN_RADIUS = 1.45;
const BASIN_HEIGHT = 0.4;
const POOL_LEVEL = 0.43; // water surface in the basin, just under the rim
const BOWL_Y = 1.5; // middle of the small bowl
const BOWL_TOP = BOWL_Y + 0.11;
const BOWL_RADIUS = 0.6;
const SPOUT_TOP = 1.87;

export function Fountain() {
  // the texture moves down the curtain, so the water seems to run over the edge
  const curtain = useFlowTexture(0.9, 5, 1);

  return (
    <group position={[0, terrainHeight(0, 0), 0]}>
      <RigidBody type="fixed" colliders={false}>
        {/* the basin (low enough to jump in) and the column */}
        <CylinderCollider
          args={[BASIN_HEIGHT / 2, BASIN_RADIUS + 0.1]}
          position={[0, BASIN_HEIGHT / 2, 0]}
        />
        <CylinderCollider args={[0.9, 0.35]} position={[0, 0.9, 0]} />
      </RigidBody>

      {/* basin: an eight-sided stone block with a rim around its top */}
      <mesh position={[0, BASIN_HEIGHT / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[BASIN_RADIUS, BASIN_RADIUS + 0.1, BASIN_HEIGHT, 8]} />
        <meshStandardMaterial color={STONE_DARK} flatShading />
      </mesh>
      <mesh
        position={[0, 0.42, 0]}
        rotation={[Math.PI / 2, 0, Math.PI / 8]}
        castShadow
        receiveShadow
      >
        <torusGeometry args={[BASIN_RADIUS, 0.13, 4, 8]} />
        <meshStandardMaterial color={STONE} flatShading />
      </mesh>

      {/* water in the basin */}
      <mesh position={[0, POOL_LEVEL, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 8]}>
        <circleGeometry args={[BASIN_RADIUS - 0.05, 8]} />
        <meshStandardMaterial color={WATER_COLOR} roughness={0.2} transparent opacity={0.85} />
      </mesh>
      <group position={[0, POOL_LEVEL + 0.01, 0]}>
        <Ripples radius={1.3} startScale={0.45} />
      </group>

      {/* column */}
      <mesh position={[0, BASIN_HEIGHT + 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.26, 1.1, 6]} />
        <meshStandardMaterial color={STONE} flatShading />
      </mesh>

      {/* small bowl on top of the column, with water and a spout in the middle */}
      <mesh position={[0, BOWL_Y, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[BOWL_RADIUS, 0.3, 0.22, 8]} />
        <meshStandardMaterial color={STONE} flatShading />
      </mesh>
      <mesh position={[0, BOWL_TOP + 0.01, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 8]}>
        <circleGeometry args={[BOWL_RADIUS - 0.07, 8]} />
        <meshStandardMaterial color={WATER_COLOR} roughness={0.2} />
      </mesh>
      <mesh position={[0, SPOUT_TOP - 0.13, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.09, 0.26, 6]} />
        <meshStandardMaterial color={STONE_DARK} flatShading />
      </mesh>

      {/* the jet: drops jumping out of the spout and landing in the bowl */}
      <group position={[0, SPOUT_TOP, 0]}>
        <Splash count={14} spread={0.42} height={0.32} period={0.8} size={0.04} />
      </group>

      {/* curtain of water from the edge of the bowl down to the basin, a bit
          wider at the bottom; an open tube with no top and bottom */}
      <mesh position={[0, (BOWL_TOP + POOL_LEVEL) / 2, 0]}>
        <cylinderGeometry
          args={[BOWL_RADIUS - 0.02, BOWL_RADIUS + 0.08, BOWL_TOP - POOL_LEVEL, 16, 1, true]}
        />
        <meshStandardMaterial
          color={WATER_COLOR}
          map={curtain}
          alphaMap={curtain}
          transparent
          opacity={0.45}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
}
