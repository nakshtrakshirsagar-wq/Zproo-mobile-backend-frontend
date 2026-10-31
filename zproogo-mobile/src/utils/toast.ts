import { create } from 'zustand';

type ToastState = { msg: string | null; kind: 'info' | 'error' | 'success'; show: (msg: string, kind?: 'info' | 'error' | 'success') => void; hide: () => void };
let timer: ReturnType<typeof setTimeout> | undefined;
export const useToast = create<ToastState>((set) => ({
  msg: null, kind: 'info',
  show: (msg, kind = 'info') => {
    if (timer) clearTimeout(timer);
    set({ msg, kind });
    timer = setTimeout(() => set({ msg: null }), kind === 'error' ? 7000 : 2600); // errors stay long enough to read
  },
  hide: () => set({ msg: null }),
}));
export const toast = (msg: string, kind?: 'info' | 'error' | 'success') => useToast.getState().show(msg, kind);
