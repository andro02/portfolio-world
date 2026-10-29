import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { setAmbienceVolume, setLayer, setMixVolumes, startAmbience } from '../audio/ambience';
import { projects } from '../projects/registry';
import { useGameStore } from '../store/useGameStore';
import { POND, distanceToStream } from './decor/waterfallLayout';
import { shoreDistance, smoothstep } from './island/islandShape';
import { playerWorldPosition } from './player/playerState';

// Mixes the sound of the island (audio/ambience.ts) by where the fox is: the
// music plays everywhere at the same volume, the sea gets louder towards the
// beach, and the waterfall, the river, the fountain and each station's own
// sound get louder as the fox comes closer. Most are heard from their side
// (the camera always looks the same way, so left and right on the screen are
// always the same directions on the island).

const UPDATE_EVERY = 0.1; // seconds; the volumes glide between updates anyway

// every station that makes a sound, with where it stands
const SOUNDING_STATIONS = projects.flatMap(({ meta, station }) =>
  station?.sound ? [{ sound: station.sound, x: meta.position[0], z: meta.position[2] }] : [],
);

// 1 within `near` of a source, 0 beyond `far`, smooth in between
function closeness(distance: number, near: number, far: number) {
  return 1 - smoothstep(near, far, distance);
}

// left/right position of a source that is `dx` to the side of the fox
function panFor(dx: number, width: number) {
  return Math.max(-0.8, Math.min(0.8, dx / width));
}

export function AmbientSound() {
  const sinceUpdate = useRef(0);

  // browsers allow sound only after the visitor has interacted with the page:
  // start it on the first click, tap or key press, if sound is switched on
  useEffect(() => {
    const onFirstInteraction = () => {
      if (useGameStore.getState().soundOn) startAmbience();
      window.removeEventListener('pointerdown', onFirstInteraction);
      window.removeEventListener('keydown', onFirstInteraction);
    };
    window.addEventListener('pointerdown', onFirstInteraction);
    window.addEventListener('keydown', onFirstInteraction);
    return () => {
      window.removeEventListener('pointerdown', onFirstInteraction);
      window.removeEventListener('keydown', onFirstInteraction);
    };
  }, []);

  useFrame((_, delta) => {
    sinceUpdate.current += delta;
    if (sinceUpdate.current < UPDATE_EVERY) return;
    sinceUpdate.current = 0;

    // quieter while a project panel is open, so the sound doesn't get in the way
    const { soundOn, openProject, musicVolume, soundsVolume } = useGameStore.getState();
    setAmbienceVolume(soundOn ? (openProject ? 0.35 : 1) : 0);
    setMixVolumes(musicVolume, soundsVolume);

    const { x, z } = playerWorldPosition;

    // the sea: faint inland, clear on the beach
    setLayer('waves', 0.04 + 0.96 * smoothstep(0.6, 0.95, shoreDistance(x, z)));

    const toPond = Math.hypot(POND.x - x, POND.z - z);
    setLayer('waterfall', closeness(toPond, 3, 16), panFor(POND.x - x, 12));

    setLayer('river', closeness(distanceToStream(x, z), 0.5, 7));

    // a station's sound is heard only near it, from its side
    for (const station of SOUNDING_STATIONS) {
      const distance = Math.hypot(station.x - x, station.z - z);
      setLayer(station.sound, closeness(distance, 2.5, 8), panFor(station.x - x, 6));
    }

    // the fountain stands in the middle of the island, at (0, 0)
    setLayer('fountain', closeness(Math.hypot(x, z), 2.5, 9), panFor(-x, 6));
  });

  return null;
}
