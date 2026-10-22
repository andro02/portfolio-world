import { Billboard, Text } from '@react-three/drei';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import type { ProjectMeta } from '../projects/types';
import { useGameStore } from '../store/useGameStore';

interface StationProps {
  meta: ProjectMeta;
}

export function Station({ meta }: StationProps) {
  const enterStation = useGameStore((s) => s.enterStation);
  const leaveStation = useGameStore((s) => s.leaveStation);
  const isNearby = useGameStore((s) => s.nearbyProject === meta.slug);

  return (
    <group position={meta.position}>
      <RigidBody type="fixed" colliders="cuboid">
        {/* pedestal, highlighted while the player is nearby */}
        <mesh castShadow receiveShadow position={[0, 0.75, 0]}>
          <boxGeometry args={[2, 1.5, 2]} />
          <meshStandardMaterial color={isNearby ? '#ffd166' : '#e9e4d8'} />
        </mesh>

        {/* invisible trigger zone around the pedestal */}
        <CuboidCollider
          sensor
          args={[3, 1.5, 3]}
          position={[0, 1.5, 0]}
          onIntersectionEnter={({ other }) => {
            if (other.rigidBodyObject?.name === 'player') enterStation(meta.slug);
          }}
          onIntersectionExit={({ other }) => {
            if (other.rigidBodyObject?.name === 'player') leaveStation(meta.slug);
          }}
        />
      </RigidBody>

      {/* title that always faces the camera */}
      <Billboard position={[0, 2.2, 0]}>
        <Text
          fontSize={0.5}
          maxWidth={8}
          textAlign="center"
          anchorY="bottom"
          color="#1d1d1d"
          outlineWidth={0.03}
          outlineColor="#ffffff"
        >
          {meta.title}
        </Text>
      </Billboard>
    </group>
  );
}
