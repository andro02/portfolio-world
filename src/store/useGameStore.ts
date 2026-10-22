import { create } from 'zustand';

interface GameState {
  nearbyProject: string | null; // slug of the station the player is standing at
  openProject: string | null; // slug of the project whose panel is open
  enterStation: (slug: string) => void;
  leaveStation: (slug: string) => void;
  openNearbyProject: () => void;
  closeProject: () => void;
}

export const useGameStore = create<GameState>()((set) => ({
  nearbyProject: null,
  openProject: null,

  enterStation: (slug) => set({ nearbyProject: slug }),

  // only clear if we are leaving the station we are registered at
  leaveStation: (slug) =>
    set((state) => (state.nearbyProject === slug ? { nearbyProject: null } : {})),

  openNearbyProject: () => set((state) => ({ openProject: state.nearbyProject })),

  closeProject: () => set({ openProject: null }),
}));
