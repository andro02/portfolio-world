import {
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  Quaternion,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Shapes of the palm trees. Every part carries its own colours (a "color"
// attribute per corner, used with vertexColors), so a whole trunk or a whole
// crown is one geometry and one mesh, even though it has several colours.

export const PALM_HEIGHT = 4.4;
const TRUNK_SEGMENTS = 10;
const BARK_COLORS = ['#a88560', '#8f6e4c'];
const FROND_BASE = '#9cc45a'; // light green along the middle of a leaf
const FROND_TIP = '#3f8a34'; // darker green at the tips of the leaflets
const DEAD_FROND = ['#b49a5a', '#8c7440'];
const COCONUT_COLORS = ['#6b4a2b', '#7a5532', '#9aa63a'];

const UP = new Vector3(0, 1, 0);

// gives every corner of a geometry the same colour
function paint(geometry: BufferGeometry, color: string) {
  const { r, g, b } = new Color(color);
  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) colors.set([r, g, b], i * 3);
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return geometry;
}

// the trunk leans to +x and bends, ending at the top of the palm
export function trunkCurve(lean: number) {
  return new CatmullRomCurve3([
    new Vector3(0, -0.3, 0),
    new Vector3(lean * 0.15, PALM_HEIGHT * 0.35, 0),
    new Vector3(lean * 0.55, PALM_HEIGHT * 0.7, 0),
    new Vector3(lean, PALM_HEIGHT, 0),
  ]);
}

// the trunk: a stack of short rings along the curve, each a little wider at
// its bottom, in two alternating shades of bark, getting thinner to the top
export function createTrunk(lean: number) {
  const curve = trunkCurve(lean);
  const rings: BufferGeometry[] = [];
  for (let i = 0; i < TRUNK_SEGMENTS; i++) {
    const t0 = i / TRUNK_SEGMENTS;
    const t1 = (i + 1) / TRUNK_SEGMENTS;
    const start = curve.getPoint(t0);
    const end = curve.getPoint(t1);
    const length = start.distanceTo(end);
    const radius = 0.24 - 0.1 * t0 + (i === 0 ? 0.06 : 0); // a wider foot
    const ring = new CylinderGeometry(radius * 0.82, radius, length * 1.04, 6).toNonIndexed();
    // turn the ring (which stands along y) along the curve, then move it there
    const direction = end.clone().sub(start).normalize();
    ring.applyQuaternion(new Quaternion().setFromUnitVectors(UP, direction));
    const middle = start.clone().add(end).multiplyScalar(0.5);
    ring.translate(middle.x, middle.y, middle.z);
    rings.push(paint(ring, BARK_COLORS[i % 2]));
  }
  const trunk = mergeGeometries(rings);
  trunk.computeVertexNormals();
  return trunk;
}

// one frond (palm leaf): a stem that arches out along +x and droops, with a
// row of thin pointed leaflets on both sides, widest in the middle of the leaf
function createFrond(length: number, droop: number, colors: [string, string]) {
  const positions: number[] = [];
  const colorValues: number[] = [];
  const base = new Color(colors[0]);
  const tip = new Color(colors[1]);
  const leaflets = 11;

  // a point on the stem, s from 0 (trunk) to 1 (tip of the leaf)
  const stem = (s: number) => new Vector3(s * length, 0.45 * s - droop * s * s, 0);

  const addCorner = (point: Vector3, color: Color) => {
    positions.push(point.x, point.y, point.z);
    colorValues.push(color.r, color.g, color.b);
  };

  for (let k = 0; k < leaflets; k++) {
    const s0 = k / leaflets;
    const s1 = (k + 1) / leaflets;
    const a = stem(s0);
    const b = stem(s1);
    const width = 0.55 * Math.sin(Math.PI * (s0 + s1) * 0.5) ** 0.7 + 0.05;
    for (const side of [-1, 1]) {
      // the leaflet points sideways, a bit forward and a bit down
      const leafletTip = stem(s1 + 0.04).add(new Vector3(0.12, -0.12 * width, side * width));
      addCorner(a, base);
      addCorner(b, base);
      addCorner(leafletTip, tip);
    }
  }

  const frond = new BufferGeometry();
  frond.setAttribute('position', new Float32BufferAttribute(positions, 3));
  frond.setAttribute('color', new Float32BufferAttribute(colorValues, 3));
  return frond;
}

// the crown: green fronds all around, some lifted, some hanging lower, two
// young ones pointing up in the middle, and a dry brown one hanging down
export function createCrown() {
  const fronds: BufferGeometry[] = [];
  const count = 8;
  for (let i = 0; i < count; i++) {
    const frond = createFrond(1.9 + (i % 3) * 0.15, 1.1 + (i % 2) * 0.35, [FROND_BASE, FROND_TIP]);
    frond.rotateZ((i % 2) * 0.15); // every other one a bit higher
    frond.rotateY((i / count) * Math.PI * 2 + (i % 2) * 0.25);
    fronds.push(frond);
  }
  for (const angle of [0.8, 3.9]) {
    const young = createFrond(1.1, 0.25, [FROND_BASE, FROND_TIP]);
    young.rotateZ(0.9); // pointing up
    young.rotateY(angle);
    fronds.push(young);
  }
  // one dry frond hanging down along the trunk
  const dead = createFrond(1.15, 0.3, DEAD_FROND as [string, string]);
  dead.rotateZ(-1.25);
  dead.rotateY(2.4);
  fronds.push(dead);
  const crown = mergeGeometries(fronds);
  crown.computeVertexNormals();
  return crown;
}

// a bunch of coconuts under the crown, around the top of the trunk; most are
// brown, some still green
export function createCoconuts() {
  const coconuts = [0, 1.3, 2.5, 3.8, 5.1].map((angle, index) => {
    const coconut = new IcosahedronGeometry(0.2, 0);
    const lower = index % 2 === 0 ? -0.42 : -0.3;
    coconut.translate(Math.cos(angle) * 0.24, lower, Math.sin(angle) * 0.24);
    return paint(coconut, COCONUT_COLORS[index % COCONUT_COLORS.length]);
  });
  return mergeGeometries(coconuts);
}
