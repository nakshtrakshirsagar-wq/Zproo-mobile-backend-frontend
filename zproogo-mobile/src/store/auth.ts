import { create } from 'zustand';

export type User = { id: string; name: string | null; mobile: string | null; email: string | null; photoUrl: string | null;
  gender: string | null; points: number; womenModeDefault: boolean; irctcUsername: string | null };

type AuthState = {
  user: User | null;
  ready: boolean;
  /** action to resume after the login gate closes successfully (e.g. continue to passenger details) */
  pending: (() => void) | null;
  setUser: (u: User | null) => void;
  setPending: (f: (() => void) | null) => void;
};

export const useAuth = create<AuthState>((set) => ({
  user: null, ready: false, pending: null,
  setUser: (user) => set({ user, ready: true }),
  setPending: (pending) => set({ pending }),
}));
