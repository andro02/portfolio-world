import { create } from 'zustand';
import { DEFAULT_ZOOM, clampZoom } from '../world/player/cameraZoom';

const SOUND_KEY = 'sound-on';

// whether sound was on or off on the previous visit (on the first one: on);
// storage can be unavailable (private mode, blocked cookies)
function readSoundOn(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'false';
  } catch {
    return true;
  }
}

function saveSoundOn(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, String(on));
  } catch {
    // nothing to do, the choice just isn't remembered
  }
}

interface GameState {
  nearbyProject: string | null; // slug of the station the player is standing at
  openProject: string | null; // slug of the project whose panel is open
  zoom: number; // zoom level picked by the player (see cameraZoom.ts)
  // a request for the player to jump to a station; the Player component
  // carries it out and clears it (the id makes every request a new one)
  teleport: { slug: string; id: number } | null;
  soundOn: boolean; // ambient sound switched on (remembered between visits)
  enterStation: (slug: string) => void;
  leaveStation: (slug: string) => void;
  openNearbyProject: () => void;
  closeProject: () => void;
  showProject: (slug: string) => void;
  travelTo: (slug: string) => void;
  finishTeleport: () => void;
  toggleSound: () => void;
  setZoom: (zoom: number) => void;
  resetZoom: () => void;
}

export const useGameStore = create<GameState>()((set) => ({
  nearbyProject: null,
  openProject: null,
  zoom: DEFAULT_ZOOM,
  teleport: null,
  soundOn: readSoundOn(),

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
      saveSoundOn(!state.soundOn);
      return { soundOn: !state.soundOn };
    }),

  setZoom: (zoom) => set({ zoom: clampZoom(zoom) }),

  resetZoom: () => set({ zoom: DEFAULT_ZOOM }),
}));
