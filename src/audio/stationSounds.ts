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

// the satellite: a soft electronic hum, and every few seconds a scanning ping
function satellite(context: AudioContext, destination: AudioNode) {
  const hum = gain(context, 0.35);
  wobble(context, hum.gain, 0.5, 0.1);
  for (const frequency of [196, 293.7]) {
    const oscillator = context.createOscillator();
    oscillator.frequency.value = frequency;
    oscillator.connect(hum);
    oscillator.start();
  }
  hum.connect(filter(context, 'lowpass', 900)).connect(destination);

  let nextPingAt = context.currentTime + 1.5;
  everyMoment(context, (now) => {
    if (nextPingAt < now - 1) nextPingAt = now + 0.5;
    while (nextPingAt < now + 0.6) {
      tone(context, destination, 1318.5, nextPingAt, 1.2, 0.35);
      tone(context, destination, 1318.5, nextPingAt + 0.35, 0.9, 0.12); // a faint echo
      nextPingAt += 3.5 + Math.random() * 2;
    }
  });
}

// the factory: a low hum of machines and a soft, steady thump, like a press
function machines(context: AudioContext, destination: AudioNode) {
  const hum = context.createOscillator();
  hum.type = 'sawtooth';
  hum.frequency.value = 55;
  const humTone = filter(context, 'lowpass', 180, 0.6);
  hum.connect(humTone).connect(gain(context, 0.2)).connect(destination);
  hum.start();

  const rumble = filter(context, 'bandpass', 300, 0.6);
  startLoop(context, createNoise(context, 'brown'), rumble);
  rumble.connect(gain(context, 0.35)).connect(destination);

  let nextThumpAt = context.currentTime + 1;
  everyMoment(context, (now) => {
    if (nextThumpAt < now - 1) nextThumpAt = now + 0.3;
    while (nextThumpAt < now + 0.6) {
      tone(context, destination, 90, nextThumpAt, 0.3, 0.4);
      nextThumpAt += 1.25;
    }
  });
}

// the smart home: now and then a soft two-note chime of a device
function beeps(context: AudioContext, destination: AudioNode) {
  const notes = [
    [880, 1318.5], // up
    [1318.5, 987.8], // down
    [1046.5, 1568], // up, higher
  ];
  let nextChimeAt = context.currentTime + 2;
  everyMoment(context, (now) => {
    if (nextChimeAt < now - 1) nextChimeAt = now + 0.5;
    while (nextChimeAt < now + 0.6) {
      const [first, second] = notes[Math.floor(Math.random() * notes.length)];
      tone(context, destination, first, nextChimeAt, 0.5, 0.3);
      tone(context, destination, second, nextChimeAt + 0.14, 0.7, 0.3);
      nextChimeAt += 4 + Math.random() * 4;
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
