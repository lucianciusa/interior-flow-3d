import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface QuotaState {
  generations: number;
  increment: () => void;
  // Hard limit for UI purposes (actual enforcement in backend rate-limit middleware)
  limit: number;
  hasReachedLimit: boolean;
}

export const useQuotaStore = create<QuotaState>()(
  persist(
    (set, get) => ({
      generations: 0,
      limit: 10,
      increment: () => set((state) => ({ generations: state.generations + 1 })),
      get hasReachedLimit() {
        return get().generations >= get().limit;
      },
    }),
    {
      name: "interior-flow-quota",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);