import { create } from 'zustand';

type SecurityState = {
  locked: boolean;
  setLocked: (locked: boolean) => void;
};

export const useSecurityStore = create<SecurityState>((set) => ({
  locked: false,
  setLocked: (locked) => set({ locked })
}));
