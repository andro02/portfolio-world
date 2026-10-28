import { Billboard, Text } from '@react-three/drei';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { preloadShowcase } from '../projects/showcaseLoader';
import type { ProjectDefinition } from '../projects/types';
import { useGameStore } from '../store/useGameStore';
import { terrainHeight } from '../world/island/islandShape';
import { DefaultPedestal } from './DefaultPedestal';

interface StationProps {
  project: ProjectDefinition;
}

const DEFAULT_LABEL_HEIGHT = 2.2;

export function Station({ project }: StationProps) {
  const { meta, station } = project;
  const enterStation = useGameStore((s) => s.enterStation);
  const leaveStation = useGameStore((s) => s.leaveStation);
  const isNearby = useGameStore((s) => s.nearbyProject === meta.slug);

  // stand on the ground, which is not flat on the island
  const [x, , z] = meta.position;
  const y = terrainHeight(x, z);

  // turn the model so its front (local +z) faces the plaza in the centre,
  // where the path to this station comes from
  const facing = Math.atan2(-x, -z);

  const Model = station?.Model ?? DefaultPedestal;
  const labelHeight = station?.labelHeight ?? DEFAULT_LABEL_HEIGHT;

  return (
    <group position={[x, y, z]}>
      {/* colliders come from the model itself */}
      <RigidBody type="fixed" colliders={false} rotation={[0, facing, 0]}>
        <Model highlighted={isNearby} />

        {/* invisible trigger zone around the station */}
        <CuboidCollider
          sensor
          args={[3, 1.5, 3]}
          position={[0, 1.5, 0]}
          onIntersectionEnter={({ other }) => {
            if (other.rigidBodyObject?.name !== 'player') return;
            enterStation(meta.slug);
            // the player will probably open this project: get its demo ready
            preloadShowcase(project);
          }}
          onIntersectionExit={({ other }) => {
            if (other.rigidBodyObject?.name === 'player') leaveStation(meta.slug);
          }}
        />
      </RigidBody>

      {/* title that always faces the camera */}
      <Billboard position={[0, labelHeight, 0]}>
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
