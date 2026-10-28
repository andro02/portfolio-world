import { startMusic } from './music';
import { createNoise, filter, gain, startLoop, wobble } from './nodes';

// Sound of the island, made in the browser with the Web Audio API instead of
// loaded from audio files: calm background music (music.ts) and soft ambient
// sounds of water, each its own layer, so the mix can follow the player.
//
// Web Audio works as a graph of nodes: sources (noise, oscillators) are
// connected through filters and volume controls ("gain") to the speakers. A
// node's settings ("params") can be changed smoothly over time, now or at a
// planned moment.
//
// Every water sound is noise with its high, hissy part filtered away, which
// is what makes synthesized noise sound harsh.
//
// Browsers only allow sound after the visitor has clicked, tapped or pressed
// a key on the page, so the engine is created on the first such interaction.

export type Layer = 'waves' | 'waterfall' | 'river' | 'fountain';

// loudness of each layer when the player is right next to it; the water
// stays in the background, under the music
const MAX_LEVEL: Record<Layer, number> = {
  waves: 0.35,
  waterfall: 0.16,
  river: 0.12,
  fountain: 0.1,
};

const MUSIC_LEVEL = 0.45;
const MASTER_LEVEL = 0.75;
const SMOOTHING = 0.35; // seconds a volume change takes (roughly)

interface Engine {
  context: AudioContext;
  master: GainNode;
  layers: Record<Layer, { gain: GainNode; pan: StereoPannerNode }>;
}

let engine: Engine | null = null;
let masterVolume = 0; // 0..1, as last asked for (also before the engine exists)

// waves: each wave rolls in (the surf gets louder and brighter), breaks and
// pulls back, then it's quiet until the next one; a steady sound would be
// heard as wind instead
function startWaves(context: AudioContext, destination: AudioNode) {
  const swell = gain(context, 0.05);
  const tone = filter(context, 'lowpass', 300, 0.4);
  startLoop(context, createNoise(context, 'brown'), tone);
  tone.connect(swell).connect(destination);

  let nextWaveAt = context.currentTime + 1;
  setInterval(() => {
    if (context.state !== 'running') return;
    const now = context.currentTime;
    if (nextWaveAt < now - 1) nextWaveAt = now + 0.5;
    if (nextWaveAt > now + 0.6) return;

    const at = nextWaveAt;
    const strength = 0.7 + Math.random() * 0.3; // waves are not all the same
    // rolls in...
    swell.gain.setTargetAtTime(strength, at, 0.7);
    tone.frequency.setTargetAtTime(500 + 300 * strength, at, 0.7);
    // ...breaks and fades out slowly
    swell.gain.setTargetAtTime(0.05, at + 2, 1.6);
    tone.frequency.setTargetAtTime(280, at + 2, 1.8);
    nextWaveAt = at + 6 + Math.random() * 4;
  }, 200);
}

function createEngine(): Engine {
  const context = new AudioContext();
  const master = gain(context, 0);
  master.connect(context.destination);

  const music = gain(context, MUSIC_LEVEL);
  music.connect(master);
  startMusic(context, music);

  // every water layer ends in its own volume and left/right position
  const makeOutput = () => {
    const pan = context.createStereoPanner();
    const level = gain(context, 0);
    pan.connect(level).connect(master);
    return { gain: level, pan };
  };
  const layers = {
    waves: makeOutput(),
    waterfall: makeOutput(),
    river: makeOutput(),
    fountain: makeOutput(),
  };

  const pink = createNoise(context, 'pink');
  const brown = createNoise(context, 'brown');

  startWaves(context, layers.waves.pan);

  // waterfall: a soft, steady rush with a low rumble underneath
  {
    const rush = filter(context, 'lowpass', 1300, 0.5);
    startLoop(context, pink, rush);
    rush.connect(layers.waterfall.pan);
    const rumble = filter(context, 'lowpass', 160);
    startLoop(context, brown, rumble);
    rumble.connect(gain(context, 0.8)).connect(layers.waterfall.pan);
  }

  // river: a gentle murmur that rises and falls a little
  {
    const murmur = gain(context, 0.8);
    wobble(context, murmur.gain, 0.6, 0.15);
    wobble(context, murmur.gain, 1.7, 0.08);
    const tone = filter(context, 'bandpass', 800, 0.5);
    startLoop(context, pink, tone);
    tone.connect(murmur).connect(layers.river.pan);
  }

  // fountain: soft trickling
  {
    const trickle = gain(context, 0.8);
    wobble(context, trickle.gain, 2.3, 0.12);
    const tone = filter(context, 'bandpass', 1400, 0.6);
    startLoop(context, pink, tone);
    tone.connect(trickle).connect(layers.fountain.pan);
  }

  // no sound while the tab is in the background
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) void context.suspend();
    else if (masterVolume > 0) void context.resume();
  });

  return { context, master, layers };
}

// creates the sound (on the first call) and lets it play; call it from a
// click, tap or key press, which browsers require before playing sound
export function startAmbience() {
  engine ??= createEngine();
  if (masterVolume > 0) void engine.context.resume();
  setAmbienceVolume(masterVolume);
}

// overall volume, 0..1, changed smoothly; at 0 the sound is paused shortly
// after fading out, so it doesn't use the processor for nothing
export function setAmbienceVolume(volume: number) {
  const previous = masterVolume;
  masterVolume = volume;
  if (!engine) return;
  const { context, master } = engine;
  if (volume > 0 && context.state === 'suspended' && !document.hidden) void context.resume();
  master.gain.setTargetAtTime(volume * MASTER_LEVEL, context.currentTime, 0.4);
  if (volume === 0 && previous > 0) {
    setTimeout(() => {
      if (masterVolume === 0) void context.suspend();
    }, 2000);
  }
}

// how loud one water layer is (0..1) and where it comes from (-1 left .. 1 right)
export function setLayer(layer: Layer, level: number, pan = 0) {
  if (!engine) return;
  const { context, layers } = engine;
  const now = context.currentTime;
  layers[layer].gain.gain.setTargetAtTime(level * MAX_LEVEL[layer], now, SMOOTHING);
  layers[layer].pan.pan.setTargetAtTime(pan, now, SMOOTHING);
}
