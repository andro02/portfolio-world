import { create } from 'zustand';
import { DEFAULT_ZOOM, clampZoom } from '../world/player/cameraZoom';

// sound settings are remembered between visits; storage can be unavailable
// (private mode, blocked cookies), then the defaults are used
function readSetting(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function saveSetting(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // nothing to do, the setting just isn't remembered
  }
}

function readVolume(key: string): number {
  const value = Number(readSetting(key) ?? NaN);
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : DEFAULT_VOLUME;
}

const SOUND_KEY = 'sound-on';
const MUSIC_KEY = 'music-volume';
const SOUNDS_KEY = 'sounds-volume';
const DEFAULT_VOLUME = 0.8;

interface GameState {
  nearbyProject: string | null; // slug of the station the player is standing at
  openProject: string | null; // slug of the project whose panel is open
  zoom: number; // zoom level picked by the player (see cameraZoom.ts)
  // a request for the player to jump to a station; the Player component
  // carries it out and clears it (the id makes every request a new one)
  teleport: { slug: string; id: number } | null;
  soundOn: boolean; // sound switched on (remembered between visits)
  musicVolume: number; // 0..1, the music slider
  soundsVolume: number; // 0..1, the slider for all the other sounds
  enterStation: (slug: string) => void;
  leaveStation: (slug: string) => void;
  openNearbyProject: () => void;
  closeProject: () => void;
  showProject: (slug: string) => void;
  travelTo: (slug: string) => void;
  finishTeleport: () => void;
  toggleSound: () => void;
  setMusicVolume: (volume: number) => void;
  setSoundsVolume: (volume: number) => void;
  setZoom: (zoom: number) => void;
  resetZoom: () => void;
}

export const useGameStore = create<GameState>()((set) => ({
  nearbyProject: null,
  openProject: null,
  zoom: DEFAULT_ZOOM,
  teleport: null,
  soundOn: readSetting(SOUND_KEY) !== 'false', // on, unless switched off on an earlier visit
  musicVolume: readVolume(MUSIC_KEY),
  soundsVolume: readVolume(SOUNDS_KEY),

  enterStation: (slug) => set({ nearbyProject: slug }),

  // only clear if we are leaving the station we are registered at
  leaveStation: (slug) =>
    set((state) => (state.nearbyProject === slug ? { nearbyProject: null } : {})),

  openNearbyProject: () => set((state) => ({ openProject: state.nearbyProject })),

  closeProject: () => set({ openProject: null }),

  // opens a project's panel directly, without being at its station
  showProject: (slug) => set({ openProject: slug }),

  travelTo: (slug) =>
    set((state) => ({ teleport: { slug, id: (state.teleport?.id ?? 0) + 1 }, openProject: null })),

  finishTeleport: () => set({ teleport: null }),

  toggleSound: () =>
    set((state) => {
      saveSetting(SOUND_KEY, String(!state.soundOn));
      return { soundOn: !state.soundOn };
    }),

  // moving a slider up while the sound is off switches it on
  setMusicVolume: (volume) =>
    set((state) => {
      saveSetting(MUSIC_KEY, String(volume));
      if (volume > 0 && !state.soundOn) saveSetting(SOUND_KEY, 'true');
      return { musicVolume: volume, soundOn: state.soundOn || volume > 0 };
    }),

  setSoundsVolume: (volume) =>
    set((state) => {
      saveSetting(SOUNDS_KEY, String(volume));
      if (volume > 0 && !state.soundOn) saveSetting(SOUND_KEY, 'true');
      return { soundsVolume: volume, soundOn: state.soundOn || volume > 0 };
    }),

  setZoom: (zoom) => set({ zoom: clampZoom(zoom) }),

  resetZoom: () => set({ zoom: DEFAULT_ZOOM }),
}));
