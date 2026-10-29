import type { StationSound } from '../projects/types';
import { createNoise, filter, gain, startLoop, wobble } from './nodes';

// Sounds heard near the project stations, one per kind of station. Each one
// plays all the time into its own layer; the layer's volume (set by
// AmbientSound, from the player's distance) decides whether it is heard.

// calls `plan(now)` five times a second while the sound is running, to plan
// the sounds of the next moments ahead (Web Audio plays planned sounds at the
// exact time, a timer alone would be uneven)
function everyMoment(context: AudioContext, plan: (now: number) => void) {
  setInterval(() => {
    if (context.state === 'running') plan(context.currentTime);
  }, 200);
}

// a short sine tone that starts at once and fades out: a ping, a chime
function tone(
  context: AudioContext,
  destination: AudioNode,
  frequency: number,
  at: number,
  length: number,
  loudness: number,
) {
  const envelope = gain(context, 0);
  envelope.connect(destination);
  envelope.gain.setValueAtTime(0, at);
  envelope.gain.linearRampToValueAtTime(loudness, at + 0.01);
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + length);
  const oscillator = context.createOscillator();
  oscillator.frequency.value = frequency;
  oscillator.connect(envelope);
  oscillator.start(at);
  oscillator.stop(at + length + 0.05);
}

// someone typing on a keyboard: short soft clicks in bursts, like a command
// being typed, a slightly louder one for Enter, then a pause
function typing(context: AudioContext, destination: AudioNode) {
  // one key click: a few milliseconds of noise that dies away very fast
  const length = Math.floor(context.sampleRate * 0.035);
  const click = context.createBuffer(1, length, context.sampleRate);
  const data = click.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (context.sampleRate * 0.004));
  }

  // a plastic, muffled click rather than a sharp tick
  const color = filter(context, 'bandpass', 2200, 0.8);
  const soften = filter(context, 'lowpass', 4500);
  color.connect(soften).connect(destination);

  const press = (at: number, pitch: number, loudness: number) => {
    const source = context.createBufferSource();
    source.buffer = click;
    source.playbackRate.value = pitch; // a little different for every key
    const level = gain(context, loudness);
    source.connect(level).connect(color);
    source.start(at);
  };

  let nextKeyAt = context.currentTime + 1;
  let keysLeft = 0; // keys left in the current word or command
  everyMoment(context, (now) => {
    if (nextKeyAt < now - 1) nextKeyAt = now + 0.3;
    while (nextKeyAt < now + 0.6) {
      if (keysLeft === 0) keysLeft = 5 + Math.floor(Math.random() * 14);
      keysLeft -= 1;
      if (keysLeft > 0) {
        press(nextKeyAt, 0.85 + Math.random() * 0.4, 0.5 + Math.random() * 0.5);
        nextKeyAt += 0.07 + Math.random() * 0.12;
      } else {
        press(nextKeyAt, 0.65, 1); // Enter
        nextKeyAt += 0.9 + Math.random() * 2; // reading the answer
      }
    }
  });
}

// a short burst of noise through a filter, fading out: the hiss of air, the
// crack of a metal hit
function noiseBurst(
  context: AudioContext,
  destination: AudioNode,
  noise: AudioBuffer,
  at: number,
  length: number,
  loudness: number,
  type: BiquadFilterType,
  frequency: number,
) {
  const source = context.createBufferSource();
  source.buffer = noise;
  const shape = filter(context, type, frequency, 0.8);
  const envelope = gain(context, 0);
  source.connect(shape).connect(envelope).connect(destination);
  envelope.gain.setValueAtTime(0, at);
  envelope.gain.linearRampToValueAtTime(loudness, at + Math.min(0.02, length / 4));
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + length);
  source.start(at, Math.random() * 4);
  source.stop(at + length + 0.05);
}

// the satellite: radio static that crackles, and every few seconds a burst
// of quick electronic blips, like data being sent down; square waves and
// noise, so it doesn't sound like the music's soft bells
function satellite(context: AudioContext, destination: AudioNode) {
  const staticLevel = gain(context, 0);
  const staticTone = filter(context, 'bandpass', 2600, 0.7);
  startLoop(context, createNoise(context, 'white'), staticTone);
  staticTone.connect(staticLevel).connect(destination);

  const blipTone = filter(context, 'lowpass', 3800);
  blipTone.connect(destination);
  const blip = (at: number, frequency: number) => {
    const envelope = gain(context, 0);
    envelope.connect(blipTone);
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(0.18, at + 0.004);
    envelope.gain.setValueAtTime(0.18, at + 0.035);
    envelope.gain.linearRampToValueAtTime(0, at + 0.05);
    const oscillator = context.createOscillator();
    oscillator.type = 'square';
    oscillator.frequency.value = frequency;
    oscillator.connect(envelope);
    oscillator.start(at);
    oscillator.stop(at + 0.06);
  };

  let nextCrackleAt = context.currentTime;
  let nextBurstAt = context.currentTime + 1.5;
  everyMoment(context, (now) => {
    if (nextCrackleAt < now - 1) nextCrackleAt = now;
    if (nextBurstAt < now - 1) nextBurstAt = now + 0.5;
    // the static gets louder and quieter at random, many times a second
    while (nextCrackleAt < now + 0.6) {
      staticLevel.gain.setTargetAtTime(0.05 + Math.random() * 0.25, nextCrackleAt, 0.02);
      nextCrackleAt += 0.04 + Math.random() * 0.06;
    }
    while (nextBurstAt < now + 0.6) {
      const blips = 6 + Math.floor(Math.random() * 8);
      for (let i = 0; i < blips; i++) {
        blip(nextBurstAt + i * 0.065, 1400 + Math.random() * 2200);
      }
      nextBurstAt += 2.5 + Math.random() * 2.5;
    }
  });
}

// the factory: metal clanking in a steady rhythm, now and then the hiss of
// a pneumatic press, over a quiet hum of motors
function machines(context: AudioContext, destination: AudioNode) {
  const noise = createNoise(context, 'white');

  const hum = context.createOscillator();
  hum.type = 'sawtooth';
  hum.frequency.value = 55;
  hum
    .connect(filter(context, 'lowpass', 180, 0.6))
    .connect(gain(context, 0.15))
    .connect(destination);
  hum.start();

  // a metal hit: a few ringing tones that don't fit together (that's what
  // makes metal sound like metal) and a short crack of noise
  const clank = (at: number, loudness: number) => {
    for (const [frequency, part] of [
      [820, 1],
      [1290, 0.6],
      [1765, 0.4],
    ]) {
      tone(
        context,
        destination,
        frequency * (0.97 + Math.random() * 0.06),
        at,
        0.28,
        loudness * part * 0.35,
      );
    }
    noiseBurst(context, destination, noise, at, 0.04, loudness * 0.6, 'bandpass', 2400);
  };

  let nextClankAt = context.currentTime + 1;
  let beat = 0;
  let nextHissAt = context.currentTime + 3;
  everyMoment(context, (now) => {
    if (nextClankAt < now - 1) nextClankAt = now + 0.3;
    if (nextHissAt < now - 1) nextHissAt = now + 1;
    while (nextClankAt < now + 0.6) {
      clank(nextClankAt, beat % 2 === 0 ? 1 : 0.55); // strong, weak, strong, weak
      beat += 1;
      nextClankAt += 0.85;
    }
    while (nextHissAt < now + 0.6) {
      noiseBurst(context, destination, noise, nextHissAt, 0.6, 0.35, 'highpass', 2500);
      nextHissAt += 4 + Math.random() * 3;
    }
  });
}

// the smart home: short beeps of household devices (a square wave, like a
// washing machine or a microwave) and the click of a relay switching a light
function beeps(context: AudioContext, destination: AudioNode) {
  const noise = createNoise(context, 'white');
  const beepTone = filter(context, 'lowpass', 3500);
  beepTone.connect(destination);

  const beep = (at: number, frequency: number, length: number) => {
    const envelope = gain(context, 0);
    envelope.connect(beepTone);
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(0.2, at + 0.005);
    envelope.gain.setValueAtTime(0.2, at + length - 0.01);
    envelope.gain.linearRampToValueAtTime(0, at + length);
    const oscillator = context.createOscillator();
    oscillator.type = 'square';
    oscillator.frequency.value = frequency;
    oscillator.connect(envelope);
    oscillator.start(at);
    oscillator.stop(at + length + 0.02);
  };

  // a few device signals: three short beeps, a long and a short one, two
  // rising ones
  const signals: ((at: number) => void)[] = [
    (at) => [0, 0.18, 0.36].forEach((offset) => beep(at + offset, 2000, 0.09)),
    (at) => {
      beep(at, 1600, 0.35);
      beep(at + 0.5, 1600, 0.1);
    },
    (at) => {
      beep(at, 1500, 0.08);
      beep(at + 0.12, 2250, 0.12);
    },
  ];

  let nextSignalAt = context.currentTime + 2;
  let nextClickAt = context.currentTime + 4;
  everyMoment(context, (now) => {
    if (nextSignalAt < now - 1) nextSignalAt = now + 0.5;
    if (nextClickAt < now - 1) nextClickAt = now + 1;
    while (nextSignalAt < now + 0.6) {
      signals[Math.floor(Math.random() * signals.length)](nextSignalAt);
      nextSignalAt += 4 + Math.random() * 4;
    }
    while (nextClickAt < now + 0.6) {
      noiseBurst(context, destination, noise, nextClickAt, 0.025, 0.8, 'bandpass', 3000);
      nextClickAt += 2.5 + Math.random() * 3;
    }
  });
}

// the projector: a soft whirr of the motor, fluttering with the shutter
function projector(context: AudioContext, destination: AudioNode) {
  const whirr = filter(context, 'bandpass', 650, 0.9);
  startLoop(context, createNoise(context, 'pink'), whirr);
  const flutter = gain(context, 0.6);
  wobble(context, flutter.gain, 24, 0.25); // 24 pictures per second
  whirr.connect(flutter).connect(destination);
}

const SOUNDS: Record<StationSound, (context: AudioContext, destination: AudioNode) => void> = {
  typing,
  satellite,
  machines,
  beeps,
  projector,
};

export function startStationSound(
  context: AudioContext,
  sound: StationSound,
  destination: AudioNode,
) {
  SOUNDS[sound](context, destination);
}
