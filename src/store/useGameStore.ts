import { create } from 'zustand';
import { DEFAULT_ZOOM, clampZoom } from '../world/player/cameraZoom';

interface GameState {
  nearbyProject: string | null; // slug of the station the player is standing at
  openProject: string | null; // slug of the project whose panel is open
  zoom: number; // zoom level picked by the player (see cameraZoom.ts)
  enterStation: (slug: string) => void;
  leaveStation: (slug: string) => void;
  openNearbyProject: () => void;
  closeProject: () => void;
  setZoom: (zoom: number) => void;
  resetZoom: () => void;
}

export const useGameStore = create<GameState>()((set) => ({
  nearbyProject: null,
  openProject: null,
  zoom: DEFAULT_ZOOM,

  enterStation: (slug) => set({ nearbyProject: slug }),

  // only clear if we are leaving the station we are registered at
  leaveStation: (slug) =>
    set((state) => (state.nearbyProject === slug ? { nearbyProject: null } : {})),

  openNearbyProject: () => set((state) => ({ openProject: state.nearbyProject })),

  closeProject: () => set({ openProject: null }),

  setZoom: (zoom) => set({ zoom: clampZoom(zoom) }),

  resetZoom: () => set({ zoom: DEFAULT_ZOOM }),
}));
