import { useMemo } from 'react';
import { DoubleSide, PlaneGeometry } from 'three';
import { WATER_COLOR, useFlowTexture } from './water';

// A sheet of falling water. It starts at the group's origin, falls down by
// `height` and curves forward (+z) like real water leaving an edge: fast at
// first, then more and more straight down. It also gets a little wider.

interface WaterSheetProps {
  width: number;
  height: number;
  forward?: number; // how far forward the bottom is from the top
  widen?: number; // how much wider the bottom is, as a part of the width
  speed?: number;
  opacity?: number;
}

function createSheetGeometry(width: number, height: number, forward: number, widen: number) {
  const geometry = new PlaneGeometry(width, height, 4, 12);
  geometry.translate(0, -height / 2, 0); // top edge at y = 0
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    // 0 at the top, 1 at the bottom (never a tiny bit below 0, which sqrt can't take)
    const fall = Math.max(0, -position.getY(i) / height);
    position.setX(i, position.getX(i) * (1 + widen * fall));
    position.setZ(i, forward * Math.sqrt(fall));
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function WaterSheet({
  width,
  height,
  forward = 0.6,
  widen = 0.25,
  speed = 1.6,
  opacity = 0.85,
}: WaterSheetProps) {
  const geometry = useMemo(
    () => createSheetGeometry(width, height, forward, widen),
    [width, height, forward, widen],
  );
  // the texture is repeated along the height, so taller sheets don't stretch it
  const flow = useFlowTexture(speed, 2, Math.max(1, height / 2));

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={WATER_COLOR}
        map={flow}
        alphaMap={flow}
        transparent
        opacity={opacity}
        depthWrite={false}
        side={DoubleSide}
      />
    </mesh>
  );
}
