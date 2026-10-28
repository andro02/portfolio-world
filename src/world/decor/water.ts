import { useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, RepeatWrapping } from 'three';
import { between, createRandom } from '../island/random';

// Shared look of the small water features (fountain, waterfall, stream).

export const WATER_COLOR = '#5cc8e2';
export const FOAM_COLOR = '#ffffff';

// light grey texture with brighter vertical streaks; scrolled along its
// height, it looks like water flowing or falling
function createFlowTexture() {
  const width = 64;
  const height = 128;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d')!;

  context.fillStyle = 'rgb(185, 185, 185)';
  context.fillRect(0, 0, width, height);

  const random = createRandom(3);
  for (let i = 0; i < 45; i++) {
    const x = random() * width;
    const y = random() * height;
    const streakWidth = between(random, 1, 3);
    const streakLength = between(random, 10, 45);
    const brightness = Math.round(between(random, 215, 255));
    context.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
    context.fillRect(x, y, streakWidth, streakLength);
    // streaks that run past the bottom continue at the top, so the texture repeats seamlessly
    context.fillRect(x, y - height, streakWidth, streakLength);
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  return texture;
}

// a flow texture of its own that moves towards lower texture coordinates (v)
// by `speed` texture heights per second; `repeat` is how many times it is
// repeated across (u) and along (v) the surface
export function useFlowTexture(speed: number, repeatU: number, repeatV: number) {
  const [texture] = useState(() => {
    const flow = createFlowTexture();
    flow.repeat.set(repeatU, repeatV);
    return flow;
  });

  useFrame((_, delta) => {
    texture.offset.setY((texture.offset.y + speed * delta) % 1);
  });

  return texture;
}
