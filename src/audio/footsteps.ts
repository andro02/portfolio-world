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
  attack = 0.004, // seconds to reach full loudness; longer is softer
  sweepTo?: number, // if given, the filter slides to this frequency over the burst
) {
  const source = context.createBufferSource();
  source.buffer = noise(context);
  const shape = filter(context, type, frequency, q);
  if (sweepTo) {
    shape.frequency.setValueAtTime(frequency, at);
    shape.frequency.exponentialRampToValueAtTime(sweepTo, at + length);
  }
  const envelope = gain(context, 0);
  source.connect(shape).connect(envelope).connect(destination);
  envelope.gain.setValueAtTime(0, at);
  envelope.gain.linearRampToValueAtTime(loudness, at + attack);
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
      // a soft rustle of blades: low and slow to start, so it doesn't click
      burst(context, destination, at, 0.16, loud(0.22), 'bandpass', 1400 * vary(), 0.5, 0.025);
      burst(context, destination, at + 0.03, 0.12, loud(0.1), 'lowpass', 2200, 0.7, 0.02);
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
      // the soft pat of paw pads on stone, with just a hint of a tap
      burst(context, destination, at, 0.06, loud(0.45), 'lowpass', 900 * vary(), 0.7, 0.006);
      burst(context, destination, at, 0.02, loud(0.06), 'bandpass', 3000, 1, 0.003);
      break;
    case 'rock':
      // a dull pat on hard rock, with a little grit crunching under the paw
      burst(context, destination, at, 0.07, loud(0.5), 'lowpass', 450 * vary(), 0.7, 0.005);
      for (let i = 0, t = at + 0.008; i < 4; i++, t += 0.008 + Math.random() * 0.012) {
        burst(
          context,
          destination,
          t,
          0.015,
          loud(0.035),
          'bandpass',
          2800 + Math.random() * 1200,
          2,
        );
      }
      break;
    case 'water':
      // a paw going into water: a "shlop" (noise through a filter that slides
      // down, which sounds like water closing over the paw), a low plunk for
      // its weight, and a bubble or two rising after it. Bubbles go up in pitch.
      burst(context, destination, at, 0.22, loud(0.3), 'lowpass', 1600 * vary(), 1.5, 0.015, 350);
      blip(context, destination, at, 180 * vary(), 90, 0.1, loud(0.05));
      for (let i = 0; i < 1 + Math.round(Math.random()); i++) {
        const pitch = 400 + Math.random() * 300;
        const delay = 0.06 + Math.random() * 0.14;
        blip(context, destination, at + delay, pitch, pitch * 1.8, 0.06, loud(0.04));
      }
      break;
  }
}
