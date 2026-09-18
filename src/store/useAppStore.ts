import { create } from "zustand";
import { getStore } from "@/data";
import type { Progress } from "@/data/store";
import { applyTheme, type ThemeName } from "@/lib/theme";

export type View = "decks" | "deckDetail" | "study" | "stats" | "settings";

export interface Route {
  view: View;
  deckId?: number;
}

interface AppState {
  route: Route;
  progress: Progress | null;
  navigate: (route: Route) => void;
  bootstrap: () => Promise<void>;
  refreshProgress: () => Promise<void>;
  setTheme: (theme: ThemeName) => Promise<void>;
  addXp: (delta: number) => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  route: { view: "decks" },
  progress: null,

  navigate: (route) => set({ route }),

  bootstrap: async () => {
    const store = await getStore();
    const progress = await store.getProgress();
    applyTheme(progress.theme);
    set({ progress });
  },

  refreshProgress: async () => {
    const store = await getStore();
    set({ progress: await store.getProgress() });
  },

  setTheme: async (theme) => {
    const store = await getStore();
    await store.setTheme(theme);
    applyTheme(theme);
    set((s) => ({ progress: s.progress ? { ...s.progress, theme } : s.progress }));
  },

  addXp: async (delta) => {
    const store = await getStore();
    const progress = await store.addXp(delta);
    set({ progress });
  },
}));
