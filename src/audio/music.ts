import { createReverb, filter, gain } from './nodes';

// Calm background music, composed while it plays: slow, soft chords, and now
// and then a gentle bell-like note from a scale in which any two notes sound
// good together (the pentatonic scale). Everything goes through a long reverb.
// It never repeats exactly, and there is no music file to download.

const CHORD_SECONDS = 8;

// frequencies in Hz; the progression Fmaj7 - C(add9) - Am7 - G6 loops
const CHORDS = [
  [174.61, 220.0, 261.63, 329.63], // F A C E
  [130.81, 196.0, 293.66, 329.63], // C G D E
  [220.0, 261.63, 329.63, 392.0], // A C E G
  [196.0, 246.94, 293.66, 329.63], // G B D E
];

// C major pentatonic, two octaves up: C D E G A
const MELODY_NOTES = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66];

// how far ahead (in seconds) notes are planned; the timer below runs more
// often than that, so there is never a gap
const LOOKAHEAD = 0.6;
const TIMER_MS = 200;

// one soft pad note: two slightly detuned triangle waves, a slow swell in and
// a slow fade out, so the chords melt into each other
function padNote(
  context: AudioContext,
  destination: AudioNode,
  frequency: number,
  start: number,
  length: number,
) {
  const envelope = gain(context, 0);
  envelope.connect(destination);
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(0.05, start + 2.5);
  envelope.gain.setValueAtTime(0.05, start + length - 0.5);
  envelope.gain.linearRampToValueAtTime(0, start + length + 2.5);

  for (const detune of [-6, 6]) {
    const oscillator = context.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.value = frequency;
    oscillator.detune.value = detune; // in hundredths of a semitone
    oscillator.connect(envelope);
    oscillator.start(start);
    oscillator.stop(start + length + 3);
  }
}

// one bell-like melody note: a sine wave with a quick start and a long fade
function bellNote(context: AudioContext, destination: AudioNode, frequency: number, start: number) {
  const envelope = gain(context, 0);
  envelope.connect(destination);
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(0.045, start + 0.02);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + 2.8);

  const oscillator = context.createOscillator();
  oscillator.frequency.value = frequency;
  oscillator.connect(envelope);
  oscillator.start(start);
  oscillator.stop(start + 3);
}

// starts the music into `destination`; it keeps composing for as long as the
// page is open (while the audio context is paused, nothing is planned)
export function startMusic(context: AudioContext, destination: AudioNode) {
  // soft, warm sound: no sharp highs, and a lot of reverb
  const tone = filter(context, 'lowpass', 1800);
  const dry = gain(context, 0.55);
  const wet = gain(context, 0.6);
  const reverb = createReverb(context, 4);
  tone.connect(dry).connect(destination);
  tone.connect(reverb).connect(wet).connect(destination);

  let nextChordAt = context.currentTime + 0.1;
  let chordIndex = 0;
  let nextBellAt = context.currentTime + 3;

  setInterval(() => {
    if (context.state !== 'running') return;
    const now = context.currentTime;
    // after a pause, carry on from now instead of catching up
    if (nextChordAt < now - 1) nextChordAt = now + 0.1;
    if (nextBellAt < now - 1) nextBellAt = now + 1;
    const until = now + LOOKAHEAD;

    while (nextChordAt < until) {
      for (const frequency of CHORDS[chordIndex]) {
        padNote(context, tone, frequency, nextChordAt, CHORD_SECONDS);
      }
      chordIndex = (chordIndex + 1) % CHORDS.length;
      nextChordAt += CHORD_SECONDS;
    }

    while (nextBellAt < until) {
      const note = MELODY_NOTES[Math.floor(Math.random() * MELODY_NOTES.length)];
      bellNote(context, tone, note, nextBellAt);
      // sometimes a second note right after, like a little phrase
      if (Math.random() < 0.3) {
        const next = MELODY_NOTES[Math.floor(Math.random() * MELODY_NOTES.length)];
        bellNote(context, tone, next, nextBellAt + 0.45);
      }
      nextBellAt += 1.8 + Math.random() * 3;
    }
  }, TIMER_MS);
}
