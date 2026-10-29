import { startMusic } from './music';
import type { StationSound } from '../projects/types';
import { createNoise, filter, gain, startLoop, wobble } from './nodes';
import { startStationSound } from './stationSounds';

// Sound of the island, made in the browser with the Web Audio API instead of
// loaded from audio files: calm background music (music.ts) and soft ambient
// sounds (water, and a sound at each project station, see stationSounds.ts),
// each its own layer, so the mix can follow the player.
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

// water sounds of the island, and the sounds of the project stations
export type Layer = 'waves' | 'waterfall' | 'river' | 'fountain' | StationSound;

// loudness of each layer when the player is right next to it; the water
// stays in the background, under the music
const MAX_LEVEL: Record<Layer, number> = {
  waves: 0.3,
  waterfall: 0.1,
  river: 0.12,
  fountain: 0.06,
  typing: 0.22,
  satellite: 0.16,
  machines: 0.24,
  beeps: 0.12,
  projector: 0.12,
};

const STATION_SOUNDS: StationSound[] = ['typing', 'satellite', 'machines', 'beeps', 'projector'];

const MUSIC_LEVEL = 0.45;
const MASTER_LEVEL = 0.75;
const SMOOTHING = 0.35; // seconds a volume change takes (roughly)

interface Engine {
  context: AudioContext;
  master: GainNode;
  music: GainNode; // volume of the music
  sounds: GainNode; // volume of all the other sounds together
  layers: Record<Layer, { gain: GainNode; pan: StereoPannerNode }>;
}

let engine: Engine | null = null;
let masterVolume = 0; // 0..1, as last asked for (also before the engine exists)
let musicVolume = 1; // the player's music and sounds sliders, 0..1
let soundsVolume = 1;

// waves: each wave rolls in, breaks and pulls back, then it's quiet until
// the next one. A wave on a beach is mostly a wide "shhh" in the middle
// pitches, so it is made from pink noise with the deep rumble (heard as
// thunder) and the sharp hiss filtered away. Only the volume follows the
// wave: a filter opening and closing would be heard as wind.
function startWaves(context: AudioContext, destination: AudioNode) {
  const wash = gain(context, 0);
  const washLow = filter(context, 'highpass', 220, 0.5);
  const washHigh = filter(context, 'lowpass', 1900, 0.5);
  startLoop(context, createNoise(context, 'pink'), washLow);
  washLow.connect(washHigh).connect(wash).connect(destination);

  // the fizz of the foam running back down the sand, a moment after the break
  const foam = gain(context, 0);
  const foamTone = filter(context, 'bandpass', 2600, 0.6);
  startLoop(context, createNoise(context, 'white'), foamTone);
  foamTone.connect(gain(context, 0.18)).connect(foam).connect(destination);

  let nextWaveAt = context.currentTime + 1;
  setInterval(() => {
    if (context.state !== 'running') return;
    const now = context.currentTime;
    if (nextWaveAt < now - 1) nextWaveAt = now + 0.5;
    if (nextWaveAt > now + 0.6) return;

    const at = nextWaveAt;
    const strength = 0.65 + Math.random() * 0.35; // waves are not all the same
    // rolls in slowly...
    wash.gain.setTargetAtTime(strength, at, 0.9);
    // ...breaks, and the water slides back for a few seconds
    wash.gain.setTargetAtTime(0.03, at + 2.4, 1.5);
    foam.gain.setTargetAtTime(strength, at + 2, 0.4);
    foam.gain.setTargetAtTime(0, at + 2.6, 1.4);
    nextWaveAt = at + 7 + Math.random() * 4;
  }, 200);
}

function createEngine(): Engine {
  const context = new AudioContext();
  const master = gain(context, 0);
  master.connect(context.destination);

  const music = gain(context, MUSIC_LEVEL * musicVolume);
  music.connect(master);
  startMusic(context, music);

  // all the other sounds go through one volume control, for the sounds slider
  const sounds = gain(context, soundsVolume);
  sounds.connect(master);

  // every water layer ends in its own volume and left/right position
  const makeOutput = () => {
    const pan = context.createStereoPanner();
    const level = gain(context, 0);
    pan.connect(level).connect(sounds);
    return { gain: level, pan };
  };
  const layers = {
    waves: makeOutput(),
    waterfall: makeOutput(),
    river: makeOutput(),
    fountain: makeOutput(),
    typing: makeOutput(),
    satellite: makeOutput(),
    machines: makeOutput(),
    beeps: makeOutput(),
    projector: makeOutput(),
  };

  const pink = createNoise(context, 'pink');
  const brown = createNoise(context, 'brown');

  startWaves(context, layers.waves.pan);
  for (const sound of STATION_SOUNDS) startStationSound(context, sound, layers[sound].pan);

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

  return { context, master, music, sounds, layers };
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

// the player's volume for the music and for all the other sounds, 0..1
export function setMixVolumes(music: number, sounds: number) {
  musicVolume = music;
  soundsVolume = sounds;
  if (!engine) return;
  const now = engine.context.currentTime;
  engine.music.gain.setTargetAtTime(MUSIC_LEVEL * music, now, 0.1);
  engine.sounds.gain.setTargetAtTime(sounds, now, 0.1);
}

// how loud one layer is (0..1) and where it comes from (-1 left .. 1 right)
export function setLayer(layer: Layer, level: number, pan = 0) {
  if (!engine) return;
  const { context, layers } = engine;
  const now = context.currentTime;
  layers[layer].gain.gain.setTargetAtTime(level * MAX_LEVEL[layer], now, SMOOTHING);
  layers[layer].pan.pan.setTargetAtTime(pan, now, SMOOTHING);
}
