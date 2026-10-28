import { create } from 'zustand';
import { DEFAULT_ZOOM, clampZoom } from '../world/player/cameraZoom';

interface GameState {
  nearbyProject: string | null; // slug of the station the player is standing at
  openProject: string | null; // slug of the project whose panel is open
  zoom: number; // zoom level picked by the player (see cameraZoom.ts)
  // a request for the player to jump to a station; the Player component
  // carries it out and clears it (the id makes every request a new one)
  teleport: { slug: string; id: number } | null;
  enterStation: (slug: string) => void;
  leaveStation: (slug: string) => void;
  openNearbyProject: () => void;
  closeProject: () => void;
  showProject: (slug: string) => void;
  travelTo: (slug: string) => void;
  finishTeleport: () => void;
  setZoom: (zoom: number) => void;
  resetZoom: () => void;
}

export const useGameStore = create<GameState>()((set) => ({
  nearbyProject: null,
  openProject: null,
  zoom: DEFAULT_ZOOM,
  teleport: null,

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

  setZoom: (zoom) => set({ zoom: clampZoom(zoom) }),

  resetZoom: () => set({ zoom: DEFAULT_ZOOM }),
}));
