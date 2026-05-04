import { create } from "zustand";
import type { Layout, Style, Preference, RoomDims, RoomType } from "@/lib/types";

export type WizardPhase = "step0" | "step1" | "step2" | "step3" | "generating" | "result";

type WizardStore = {
  phase: WizardPhase;
  roomType: RoomType;
  dims: RoomDims;
  style: Style | null;
  preferences: Preference[];
  layout: Layout | null;
  seed: number | null;
  isTemplateFlow: boolean;
  setIsTemplateFlow: (val: boolean) => void;
  setPhase: (phase: WizardPhase) => void;
  setRoomType: (roomType: RoomType) => void;
  setDims: (dims: RoomDims) => void;
  setStyle: (style: Style) => void;
  setPreferences: (prefs: Preference[]) => void;
  setLayout: (layout: Layout) => void;
  setSeed: (seed: number | null) => void;
  reset: () => void;
};

const DEFAULT_DIMS: RoomDims = { width_m: 4, length_m: 5, height_m: 2.6 };

export const useWizardStore = create<WizardStore>((set) => ({
  phase: "step0",
  roomType: "living_room",
  dims: DEFAULT_DIMS,
  style: null,
  preferences: [],
  layout: null,
  seed: null,
  isTemplateFlow: false,
  setIsTemplateFlow: (val) => set({ isTemplateFlow: val }),
  setPhase: (phase) => set({ phase }),
  setRoomType: (roomType) => set({ roomType }),
  setDims: (dims) => set({ dims }),
  setStyle: (style) => set({ style }),
  setPreferences: (prefs) => set({ preferences: prefs }),
  setLayout: (layout) => set({ layout }),
  setSeed: (seed) => set({ seed }),
  reset: () =>
    set({
      phase: "step0",
      roomType: "living_room",
      style: null,
      preferences: [],
      layout: null,
      seed: null,
      dims: DEFAULT_DIMS,
      isTemplateFlow: false,
    }),
}));
