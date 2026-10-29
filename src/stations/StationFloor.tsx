// Round floor every station stands on: almost level with the ground, so the
// player walks onto it, with a glowing ring around its edge while the player
// is at the station.

const HIGHLIGHT = '#ffd166';

interface StationFloorProps {
  highlighted: boolean;
  color?: string;
  radius?: number;
}

export function StationFloor({ highlighted, color = '#9a978d', radius = 1.75 }: StationFloorProps) {
  return (
    <>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[radius, radius + 0.1, 0.08, 8]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      {highlighted && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
          <ringGeometry args={[radius - 0.15, radius, 8]} />
          <meshBasicMaterial color={HIGHLIGHT} />
        </mesh>
      )}
    </>
  );
}
