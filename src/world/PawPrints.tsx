import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  CircleGeometry,
  Color,
  InstancedBufferAttribute,
  MeshBasicMaterial,
  Object3D,
  RingGeometry,
  type BufferGeometry,
  type InstancedMesh,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { smoothstep } from './island/islandShape';
import { onStep, type Step } from './player/steps';

// Traces the fox leaves behind:
// - paw prints in sand and on the paths, fading away after a while
// - wet, dark paw prints on any hard ground for a few steps after walking
//   through water
// - a small ring on the water where a paw goes in
//
// There can be a hundred prints at once, so they are one instanced mesh: a
// fixed number of copies of one shape, reused in turn (the oldest print makes
// way for the newest). Each copy has its own position, colour and opacity.

const PRINTS = 120;
const RIPPLES = 12;
const RIPPLE_LIFE = 0.9; // seconds
const WET_STEPS = 10; // steps that leave wet prints after leaving the water

// where the paws of each diagonal pair touch the ground, relative to the
// middle of the fox (x to its side, z forward), for the fox's size in the game
const PAW_X = 0.16;
const PAW_Z = 0.32;
const PRINT_SCALE = 1.5;

interface PrintStyle {
  color: string;
  opacity: number;
  life: number; // seconds until it has faded away
}

const STYLES = {
  sand: { color: '#9c7440', opacity: 0.6, life: 12 },
  dirt: { color: '#4a3424', opacity: 0.55, life: 10 },
  wet: { color: '#3f3328', opacity: 0.5, life: 6 },
} satisfies Record<string, PrintStyle>;

// one paw print, lying flat with the toes towards +z: a round pad and four toes
function createPawGeometry() {
  const parts: BufferGeometry[] = [];
  const pad = new CircleGeometry(0.05, 10);
  pad.scale(1, 0.85, 1);
  parts.push(pad);
  for (const [x, y] of [
    [-0.045, -0.055],
    [0.045, -0.055],
    [-0.016, -0.078],
    [0.016, -0.078],
  ]) {
    const toe = new CircleGeometry(0.02, 8);
    toe.translate(x, y, 0);
    parts.push(toe);
  }
  const paw = mergeGeometries(parts);
  // drawn a bit bigger than the fox's real paws, so they can be seen from the camera
  paw.scale(PRINT_SCALE, PRINT_SCALE, 1);
  // circles are drawn upright; turned to lie flat (and their -y becomes +z)
  paw.rotateX(-Math.PI / 2);
  return paw;
}

// a flat material whose copies each have their own opacity: every copy gets a
// number "aAlpha", which the shader multiplies into the colour's opacity
function createFadingMaterial() {
  const material = new MeshBasicMaterial({
    transparent: true,
    depthWrite: false,
    // drawn a little in front of the ground under it, so it doesn't flicker
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute float aAlpha;\nvarying float vAlpha;',
      )
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlpha = aAlpha;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vAlpha;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vAlpha;');
  };
  return material;
}

// a pool of copies of one mesh, all hidden at the start
function useInstancePool(count: number) {
  const mesh = useRef<InstancedMesh>(null);
  const alphas = useRef(new Float32Array(count));

  useLayoutEffect(() => {
    if (!mesh.current) return;
    const hidden = new Object3D();
    hidden.scale.setScalar(0);
    hidden.updateMatrix();
    for (let i = 0; i < count; i++) {
      mesh.current.setMatrixAt(i, hidden.matrix);
      mesh.current.setColorAt(i, new Color('#ffffff'));
    }
    mesh.current.geometry.setAttribute('aAlpha', new InstancedBufferAttribute(alphas.current, 1));
    // the copies are spread all over the island: never skip drawing them
    mesh.current.frustumCulled = false;
  }, [count]);

  return [mesh, alphas] as const;
}

// tells three.js that the copies' places and opacities have changed
function markChanged(mesh: InstancedMesh) {
  mesh.instanceMatrix.needsUpdate = true;
  mesh.geometry.getAttribute('aAlpha').needsUpdate = true;
}

interface Trace {
  born: number;
  style: PrintStyle;
}

export function PawPrints() {
  const pawGeometry = useMemo(() => createPawGeometry(), []);
  const ringGeometry = useMemo(() => {
    const ring = new RingGeometry(0.1, 0.13, 20);
    ring.rotateX(-Math.PI / 2);
    return ring;
  }, []);
  const printMaterial = useMemo(() => createFadingMaterial(), []);
  const rippleMaterial = useMemo(() => createFadingMaterial(), []);

  const [printMesh, printAlphas] = useInstancePool(PRINTS);
  const [rippleMesh, rippleAlphas] = useInstancePool(RIPPLES);

  // what each copy shows and since when (null: unused)
  const printTraces = useRef<(Trace | null)[]>(Array(PRINTS).fill(null));
  const rippleBirths = useRef<(number | null)[]>(Array(RIPPLES).fill(null));
  const ripplePlaces = useRef<{ x: number; y: number; z: number }[]>(
    Array.from({ length: RIPPLES }, () => ({ x: 0, y: 0, z: 0 })),
  );
  const next = useRef({ print: 0, ripple: 0, wetSteps: 0, now: 0 });

  useEffect(() => {
    const helper = new Object3D();
    const color = new Color();

    const addPrint = (x: number, y: number, z: number, heading: number, style: PrintStyle) => {
      const mesh = printMesh.current;
      if (!mesh) return;
      const index = next.current.print;
      next.current.print = (index + 1) % PRINTS;
      helper.position.set(x, y + 0.02, z);
      helper.rotation.set(0, heading, 0);
      helper.scale.setScalar(1);
      helper.updateMatrix();
      mesh.setMatrixAt(index, helper.matrix);
      mesh.setColorAt(index, color.set(style.color));
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      printTraces.current[index] = { born: next.current.now, style };
    };

    const addRipple = (x: number, y: number, z: number) => {
      const index = next.current.ripple;
      next.current.ripple = (index + 1) % RIPPLES;
      rippleBirths.current[index] = next.current.now;
      ripplePlaces.current[index] = { x, y, z };
    };

    return onStep((step: Step) => {
      const { x, y, z, heading, surface, side } = step;
      // the two paws of the diagonal pair that just landed
      const sin = Math.sin(heading);
      const cos = Math.cos(heading);
      const paws = [
        { lx: side * PAW_X, lz: PAW_Z },
        { lx: -side * PAW_X, lz: -PAW_Z },
      ].map(({ lx, lz }) => ({ x: x + lx * cos + lz * sin, z: z - lx * sin + lz * cos }));

      if (surface === 'water') {
        next.current.wetSteps = WET_STEPS;
        for (const paw of paws) addRipple(paw.x, y + 0.08, paw.z);
        return;
      }

      // after the water, paws stay wet for a few steps
      let style: PrintStyle | null = null;
      if (next.current.wetSteps > 0 && surface !== 'grass') {
        next.current.wetSteps -= 1;
        style = STYLES.wet;
      } else if (surface === 'sand') {
        style = STYLES.sand;
      } else if (surface === 'dirt') {
        style = STYLES.dirt;
      }
      if (style) for (const paw of paws) addPrint(paw.x, y, paw.z, heading, style);
    });
  }, [printMesh]);

  useFrame(({ clock }) => {
    const now = clock.elapsedTime;
    next.current.now = now;

    // prints: fully visible at first, fading out over their last two seconds
    const prints = printMesh.current;
    if (prints) {
      printTraces.current.forEach((trace, index) => {
        if (!trace) return;
        const age = now - trace.born;
        const fade = 1 - smoothstep(trace.style.life - 2, trace.style.life, age);
        printAlphas.current[index] = trace.style.opacity * fade;
        if (fade <= 0) printTraces.current[index] = null;
      });
      markChanged(prints);
    }

    // ripples: a ring that spreads out and fades
    const ripples = rippleMesh.current;
    if (ripples) {
      const helper = new Object3D();
      rippleBirths.current.forEach((born, index) => {
        if (born === null) return;
        const t = (now - born) / RIPPLE_LIFE;
        const { x, y, z } = ripplePlaces.current[index];
        helper.position.set(x, y, z);
        helper.scale.setScalar(t >= 1 ? 0 : 0.6 + t * 2.4);
        helper.updateMatrix();
        ripples.setMatrixAt(index, helper.matrix);
        rippleAlphas.current[index] = t >= 1 ? 0 : 0.7 * (1 - t);
        if (t >= 1) rippleBirths.current[index] = null;
      });
      markChanged(ripples);
    }
  });

  return (
    <>
      <instancedMesh ref={printMesh} args={[pawGeometry, printMaterial, PRINTS]} />
      <instancedMesh ref={rippleMesh} args={[ringGeometry, rippleMaterial, RIPPLES]} />
    </>
  );
}
