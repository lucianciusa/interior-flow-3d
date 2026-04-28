import { create } from "zustand";
import type { Layout, Style, Preference, RoomDims } from "@/lib/types";

export type WizardPhase = "step1" | "step2" | "step3" | "generating" | "result";

type WizardStore = {
  phase: WizardPhase;
  dims: RoomDims;
  style: Style | null;
  preferences: Preference[];
  layout: Layout | null;
  seed: number | null;
  setPhase: (phase: WizardPhase) => void;
  setDims: (dims: RoomDims) => void;
  setStyle: (style: Style) => void;
  setPreferences: (prefs: Preference[]) => void;
  setLayout: (layout: Layout) => void;
  setSeed: (seed: number | null) => void;
  reset: () => void;
};

const DEFAULT_DIMS: RoomDims = { width_m: 4, length_m: 5, height_m: 2.6 };

export const useWizardStore = create<WizardStore>((set) => ({
  phase: "step1",
  dims: DEFAULT_DIMS,
  style: null,
  preferences: [],
  layout: null,
  seed: null,
  setPhase: (phase) => set({ phase }),
  setDims: (dims) => set({ dims }),
  setStyle: (style) => set({ style }),
  setPreferences: (prefs) => set({ preferences: prefs }),
  setLayout: (layout) => set({ layout }),
  setSeed: (seed) => set({ seed }),
  reset: () =>
    set({
      phase: "step1",
      style: null,
      preferences: [],
      layout: null,
      seed: null,
      dims: DEFAULT_DIMS,
    }),
}));
