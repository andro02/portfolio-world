import { CylinderGeometry } from 'three';

// Shape of the tall rock columns used by the cliff ridges and the waterfall.

export const PILLAR_VARIANTS = 3;

// how far a pillar's corners are pushed in or out in a direction (local angle)
function push(localAngle: number, seed: number) {
  return 1 + 0.18 * Math.sin(localAngle * 3 + seed * 1.7);
}

// a cylinder with few sides whose corners are pushed in and out a little; the
// sides stay vertical, so the player can't climb them. The top is uneven,
// unless `flatTop` is set (for rocks that have something standing on them).
function createPillarGeometry(seed: number, flatTop: boolean) {
  const geometry = new CylinderGeometry(1, 1.1, 1, 7, 2);
  geometry.translate(0, 0.5, 0); // base at y = 0, top at y = 1
  const position = geometry.attributes.position;

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const angle = Math.atan2(z, x);
    const amount = push(angle, seed);
    const topBump = y > 0.99 && !flatTop ? 0.12 * Math.sin(angle * 2 + seed) : 0;
    position.setXYZ(i, x * amount, y + topBump, z * amount);
  }

  geometry.computeVertexNormals();
  return geometry;
}

const bumpyTops = Array.from({ length: PILLAR_VARIANTS }, (_, i) =>
  createPillarGeometry(i + 1, false),
);
const flatTops = Array.from({ length: PILLAR_VARIANTS }, (_, i) =>
  createPillarGeometry(i + 1, true),
);

export function pillarGeometry(variant: number, flatTop: boolean) {
  return (flatTop ? flatTops : bumpyTops)[variant];
}

// distance from a pillar's middle to its side at the top, in a world direction
// (an angle as returned by Math.atan2(z, x)); between two corners the side is a
// straight line, so this is the safe, smaller value: the distance to that line
export function pillarTopRadius(
  variant: number,
  radius: number,
  rotation: number,
  worldAngle: number,
) {
  // turning the pillar by `rotation` around y turns its angles the other way
  const local = worldAngle + rotation;
  const sideAngle = (Math.PI * 2) / 7;
  // three.js puts the first corner of a cylinder at +z, which is the angle PI / 2
  const corner = Math.PI / 2 + Math.floor((local - Math.PI / 2) / sideAngle) * sideAngle;
  const a = push(corner, variant + 1);
  const b = push(corner + sideAngle, variant + 1);
  // the side between the two neighbouring corners, as a straight line
  const ax = Math.cos(corner) * a;
  const az = Math.sin(corner) * a;
  const bx = Math.cos(corner + sideAngle) * b;
  const bz = Math.sin(corner + sideAngle) * b;
  const dirX = Math.cos(local);
  const dirZ = Math.sin(local);
  // where the ray from the middle in this direction crosses that line
  const t = (ax * (bz - az) - az * (bx - ax)) / (dirX * (bz - az) - dirZ * (bx - ax));
  return t * radius;
}
