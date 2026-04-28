import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";

type AuthStore = {
  session: Session | null;
  user: User | null;
  ready: boolean;
  setSession: (session: Session | null) => void;
  setReady: (ready: boolean) => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  user: null,
  ready: false,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setReady: (ready) => set({ ready }),
}));
