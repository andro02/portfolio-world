// Small helpers for building Web Audio graphs, shared by the ambient sounds
// and the music.

const NOISE_SECONDS = 6;

export type NoiseColor = 'white' | 'pink' | 'brown';

// a few seconds of stereo noise:
// - white: all pitches equally loud (hiss)
// - pink: lower pitches louder (rushing water)
// - brown: much more low than high (rumble, surf)
// The end is blended into the start, so the loop has no click.
export function createNoise(context: BaseAudioContext, color: NoiseColor) {
  const length = Math.floor(context.sampleRate * NOISE_SECONDS);
  const fade = 4096;
  const buffer = context.createBuffer(2, length, context.sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const raw = new Float32Array(length + fade);
    const p = [0, 0, 0, 0, 0, 0, 0]; // pink noise filter state
    let last = 0; // brown noise state
    for (let i = 0; i < raw.length; i++) {
      const white = Math.random() * 2 - 1;
      if (color === 'white') {
        raw[i] = white * 0.5;
      } else if (color === 'pink') {
        // Paul Kellet's pink noise filter
        p[0] = 0.99886 * p[0] + white * 0.0555179;
        p[1] = 0.99332 * p[1] + white * 0.0750759;
        p[2] = 0.969 * p[2] + white * 0.153852;
        p[3] = 0.8665 * p[3] + white * 0.3104856;
        p[4] = 0.55 * p[4] + white * 0.5329522;
        p[5] = -0.7616 * p[5] - white * 0.016898;
        raw[i] = (p[0] + p[1] + p[2] + p[3] + p[4] + p[5] + p[6] + white * 0.5362) * 0.11;
        p[6] = white * 0.115926;
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

// plays a noise buffer over and over into `destination`
export function startLoop(context: BaseAudioContext, buffer: AudioBuffer, destination: AudioNode) {
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(destination);
  // every loop starts somewhere else, so layers don't repeat in step
  source.start(0, Math.random() * NOISE_SECONDS);
}

export function filter(
  context: BaseAudioContext,
  type: BiquadFilterType,
  frequency: number,
  q = 0.7,
) {
  const node = context.createBiquadFilter();
  node.type = type;
  node.frequency.value = frequency;
  node.Q.value = q;
  return node;
}

export function gain(context: BaseAudioContext, value: number) {
  const node = context.createGain();
  node.gain.value = value;
  return node;
}

// keeps moving a param up and down around its value, `rate` times per second
// (a "low frequency oscillator", LFO)
export function wobble(context: BaseAudioContext, param: AudioParam, rate: number, depth: number) {
  const oscillator = context.createOscillator();
  oscillator.frequency.value = rate;
  const amount = gain(context, depth);
  oscillator.connect(amount).connect(param);
  oscillator.start();
}

// reverb: the sound of a room or a wide space, made by a "convolver" with an
// impulse response of fading noise (what a single clap would sound like there)
export function createReverb(context: BaseAudioContext, seconds: number) {
  const length = Math.floor(context.sampleRate * seconds);
  const impulse = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
    }
  }
  const convolver = context.createConvolver();
  convolver.buffer = impulse;
  return convolver;
}
