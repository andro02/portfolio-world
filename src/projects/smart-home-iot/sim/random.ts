// Seeded randomness: the same seed always gives the same numbers, so every
// visitor sees the same simulated day, and nothing has to be stored.

// a 32-bit hash of a string (FNV-1a)
export function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// a 32-bit hash of an integer (from the "lowbias32" mixer)
function hashInt(value: number): number {
  let x = value | 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

export interface Random {
  next(): number; // in [0, 1)
  between(min: number, max: number): number;
  int(min: number, max: number): number; // both ends included
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
}

// mulberry32: small and fast, good enough for a simulation
export function createRandom(seed: number): Random {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    between: (min, max) => min + (max - min) * next(),
    int: (min, max) => min + Math.floor((max - min + 1) * next()),
    chance: (probability) => next() < probability,
    pick: (items) => items[Math.floor(next() * items.length)],
  };
}

// Smooth noise in [-1, 1] along one axis: random values at whole numbers,
// blended in between, so readings drift instead of jumping.
export function smoothNoise(seed: number, x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const a = hashInt(hashInt(i) ^ seed) / 4294967295;
  const b = hashInt(hashInt(i + 1) ^ seed) / 4294967295;
  const blend = (1 - Math.cos(f * Math.PI)) / 2;
  return (a + (b - a) * blend) * 2 - 1;
}
