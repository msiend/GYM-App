import { create } from "zustand";
export const useUI = create<{
  toast: string;
  notify: (message: string) => void;
}>((set) => ({
  toast: "",
  notify: (toast) => {
    set({ toast });
    setTimeout(() => set({ toast: "" }), 5000);
  },
}));
