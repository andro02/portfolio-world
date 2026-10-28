// Ambient sound of the island, made in the browser with the Web Audio API
// instead of loaded from audio files: every sound is noise shaped by filters
// and slowly changing volumes. Nothing extra to download, no audible loop, and
// every layer has its own volume, so the mix can follow the player around.
//
// Web Audio works as a graph of nodes: sources (here: noise) are connected
// through filters and volume controls ("gain") to the speakers. A node's
// settings ("params") can be changed smoothly over time, and an oscillator
// can be connected to a param to keep moving it up and down (an "LFO").
//
// Browsers only allow sound after the visitor has clicked, tapped or pressed
// a key on the page, so the engine is created on the first such interaction.

export type Layer = 'waves' | 'waterfall' | 'river' | 'fountain';

// loudness of each layer when the player is right next to it
const MAX_LEVEL: Record<Layer, number> = {
  waves: 0.55,
  waterfall: 0.6,
  river: 0.3,
  fountain: 0.22,
};

const MASTER_LEVEL = 0.7;
const NOISE_SECONDS = 6;
const SMOOTHING = 0.25; // seconds a volume change takes (roughly)

interface Engine {
  context: AudioContext;
  master: GainNode;
  layers: Record<Layer, { gain: GainNode; pan: StereoPannerNode }>;
}

let engine: Engine | null = null;
let masterVolume = 0; // 0..1, as last asked for (also before the engine exists)

type NoiseColor = 'white' | 'pink' | 'brown';

// a few seconds of stereo noise:
// - white: all pitches equally loud (hiss)
// - pink: lower pitches louder (rushing water)
// - brown: much more low than high (rumble, distant surf)
// The end is blended into the start, so the loop has no click.
function createNoise(context: AudioContext, color: NoiseColor) {
  const length = Math.floor(context.sampleRate * NOISE_SECONDS);
  const fade = 4096;
  const buffer = context.createBuffer(2, length, context.sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const raw = new Float32Array(length + fade);
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0; // pink noise filter state
    let last = 0; // brown noise state
    for (let i = 0; i < raw.length; i++) {
      const white = Math.random() * 2 - 1;
      if (color === 'white') {
        raw[i] = white * 0.5;
      } else if (color === 'pink') {
        // Paul Kellet's pink noise filter
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        raw[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      } else {
        last = (last + 0.02 * white) / 1.02;
        raw[i] = last * 3.5;
      }
    }

    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const blend = i < fade ? i / fade : 1;
      data[i] = raw[i] * blend + (i < fade ? raw[length + i] * (1 - blend) : 0);
    }
  }
  return buffer;
}

function startLoop(context: AudioContext, buffer: AudioBuffer, destination: AudioNode) {
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(destination);
  // every loop starts somewhere else, so layers don't repeat in step
  source.start(0, Math.random() * NOISE_SECONDS);
}

function filter(context: AudioContext, type: BiquadFilterType, frequency: number, q = 0.7) {
  const node = context.createBiquadFilter();
  node.type = type;
  node.frequency.value = frequency;
  node.Q.value = q;
  return node;
}

function gain(context: AudioContext, value: number) {
  const node = context.createGain();
  node.gain.value = value;
  return node;
}

// keeps moving a param up and down around its value, `rate` times per second
function wobble(context: AudioContext, param: AudioParam, rate: number, depth: number) {
  const oscillator = context.createOscillator();
  oscillator.frequency.value = rate;
  const amount = gain(context, depth);
  oscillator.connect(amount).connect(param);
  oscillator.start();
}

function createEngine(): Engine {
  const context = new AudioContext();
  const master = gain(context, 0);
  master.connect(context.destination);

  const noise = {
    white: createNoise(context, 'white'),
    pink: createNoise(context, 'pink'),
    brown: createNoise(context, 'brown'),
  };

  // every layer ends in its own volume and left/right position
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

  // waves: deep surf whose volume and brightness swell slowly, like waves
  // rolling in; two slow wobbles at odd rates so no two swells are the same
  {
    const swell = gain(context, 0.6);
    wobble(context, swell.gain, 0.11, 0.3);
    wobble(context, swell.gain, 0.047, 0.15);
    const tone = filter(context, 'lowpass', 520, 0.5);
    wobble(context, tone.frequency, 0.11, 320);
    startLoop(context, noise.brown, tone);
    const wash = gain(context, 0.25); // a little hiss of foam on top
    const washTone = filter(context, 'lowpass', 1600);
    startLoop(context, noise.pink, washTone);
    washTone.connect(wash).connect(swell);
    tone.connect(swell).connect(layers.waves.pan);
  }

  // waterfall: steady rushing water with a low rumble underneath
  {
    const flutter = gain(context, 0.9);
    wobble(context, flutter.gain, 6.3, 0.05);
    const rush = filter(context, 'highpass', 260);
    const rushTop = filter(context, 'lowpass', 5200);
    startLoop(context, noise.pink, rush);
    rush.connect(rushTop).connect(gain(context, 0.9)).connect(flutter);
    const rumble = filter(context, 'lowpass', 170);
    startLoop(context, noise.brown, rumble);
    rumble.connect(gain(context, 1.2)).connect(flutter);
    flutter.connect(layers.waterfall.pan);
  }

  // river: higher, babbling water; its pitch and volume flicker quickly
  {
    const babble = gain(context, 0.6);
    wobble(context, babble.gain, 3.3, 0.22);
    wobble(context, babble.gain, 5.1, 0.13);
    const tone = filter(context, 'bandpass', 2300, 0.7);
    wobble(context, tone.frequency, 0.7, 600);
    startLoop(context, noise.white, tone);
    tone.connect(babble).connect(layers.river.pan);
  }

  // fountain: light splashing
  {
    const splash = gain(context, 0.7);
    wobble(context, splash.gain, 4.2, 0.18);
    const tone = filter(context, 'bandpass', 3800, 1.1);
    startLoop(context, noise.white, tone);
    tone.connect(splash).connect(layers.fountain.pan);
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

// how loud one layer is (0..1) and where it comes from (-1 left .. 1 right)
export function setLayer(layer: Layer, level: number, pan = 0) {
  if (!engine) return;
  const { context, layers } = engine;
  const now = context.currentTime;
  layers[layer].gain.gain.setTargetAtTime(level * MAX_LEVEL[layer], now, SMOOTHING);
  layers[layer].pan.pan.setTargetAtTime(pan, now, SMOOTHING);
}
