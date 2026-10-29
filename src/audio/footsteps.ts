import type { Surface } from '../world/surface';
import { createNoise, filter, gain } from './nodes';

// The sound of one step, different on every kind of ground: made of short
// bursts of noise through filters, and for some grounds a short tone.

// noise to cut the bursts from, made once per audio context
const noiseFor = new WeakMap<BaseAudioContext, AudioBuffer>();

function noise(context: AudioContext) {
  let buffer = noiseFor.get(context);
  if (!buffer) {
    buffer = createNoise(context, 'white');
    noiseFor.set(context, buffer);
  }
  return buffer;
}

// a short burst of filtered noise that fades out
function burst(
  context: AudioContext,
  destination: AudioNode,
  at: number,
  length: number,
  loudness: number,
  type: BiquadFilterType,
  frequency: number,
  q = 0.8,
) {
  const source = context.createBufferSource();
  source.buffer = noise(context);
  const shape = filter(context, type, frequency, q);
  const envelope = gain(context, 0);
  source.connect(shape).connect(envelope).connect(destination);
  envelope.gain.setValueAtTime(0, at);
  envelope.gain.linearRampToValueAtTime(loudness, at + 0.004);
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + length);
  source.start(at, Math.random() * 4);
  source.stop(at + length + 0.02);
}

// a short tone that slides from one pitch to another and fades out
function blip(
  context: AudioContext,
  destination: AudioNode,
  at: number,
  from: number,
  to: number,
  length: number,
  loudness: number,
) {
  const envelope = gain(context, 0);
  envelope.connect(destination);
  envelope.gain.setValueAtTime(0, at);
  envelope.gain.linearRampToValueAtTime(loudness, at + 0.004);
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + length);
  const oscillator = context.createOscillator();
  oscillator.frequency.setValueAtTime(from, at);
  oscillator.frequency.exponentialRampToValueAtTime(to, at + length);
  oscillator.connect(envelope);
  oscillator.start(at);
  oscillator.stop(at + length + 0.02);
}

// plays one step on a surface; `strength` 1 for a step, more for landing
export function playStep(
  context: AudioContext,
  destination: AudioNode,
  surface: Surface,
  strength: number,
) {
  const at = context.currentTime + 0.01;
  const vary = () => 0.85 + Math.random() * 0.3; // no two steps quite the same
  const loud = (value: number) => value * strength * vary();

  switch (surface) {
    case 'grass':
      // a soft swish of blades
      burst(context, destination, at, 0.09, loud(0.35), 'bandpass', 2800 * vary(), 0.6);
      break;
    case 'sand':
      // a crunch: a few tiny grains one after another, quite low
      for (let i = 0; i < 3; i++) {
        burst(context, destination, at + i * 0.012, 0.05, loud(0.4), 'lowpass', 1600 * vary());
      }
      break;
    case 'dirt':
      // a dull, soft thud
      burst(context, destination, at, 0.07, loud(0.6), 'lowpass', 500 * vary());
      blip(context, destination, at, 130, 90, 0.06, loud(0.25));
      break;
    case 'stone':
      // a hard little tap of claws on stone
      burst(context, destination, at, 0.025, loud(0.45), 'highpass', 2500);
      blip(context, destination, at, 1100 * vary(), 900, 0.04, loud(0.12));
      break;
    case 'water':
      // a splash, and sometimes a little bubbly "plip" after it
      burst(context, destination, at, 0.18, loud(0.5), 'bandpass', 1100 * vary(), 0.5);
      burst(context, destination, at + 0.03, 0.12, loud(0.25), 'highpass', 3000);
      if (Math.random() < 0.5) blip(context, destination, at + 0.06, 500, 1400, 0.08, loud(0.1));
      break;
  }
}
