import { create } from "zustand";

import type { ResolvedItem } from "@/lib/types";

export type CameraPreset = "top" | "quarter" | "eye";

type ViewerStore = {
  selectedItem: ResolvedItem | null;
  setSelectedItem: (item: ResolvedItem | null) => void;
  cameraPreset: CameraPreset;
  setCameraPreset: (preset: CameraPreset) => void;
};

export const useViewerStore = create<ViewerStore>((set) => ({
  selectedItem: null,
  setSelectedItem: (item) => set({ selectedItem: item }),
  cameraPreset: "quarter",
  setCameraPreset: (preset) => set({ cameraPreset: preset }),
}));
