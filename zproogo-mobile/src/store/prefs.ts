import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../security/secureStore';

type Prefs = {
  theme: 'system' | 'light' | 'dark';
  onboarded: boolean;
  locationAsked: boolean;
  womenMode: boolean;
  city: string;
  liveCity: string;
  set: (p: Partial<Omit<Prefs, 'set'>>) => void;
};

export const usePrefs = create<Prefs>()(persist((set) => ({
  theme: 'system', onboarded: false, locationAsked: false, womenMode: false, city: 'Pune', liveCity: '',
  set: (p) => set(p),
}), { name: 'prefs', storage: createJSONStorage(() => mmkvStorage) }));
