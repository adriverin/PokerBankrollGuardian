import { create } from 'zustand';
import type { SimRun } from '@/types';

interface SimState {
  runs: Record<string, SimRun>;
  hydrate: (runs: SimRun[]) => void;
  upsert: (run: SimRun) => void;
}

export const useSimStore = create<SimState>((set) => ({
  runs: {},
  hydrate: (runs) =>
    set(() => ({
      runs: runs.reduce<Record<string, SimRun>>((acc, run) => {
        acc[run.id] = run;
        return acc;
      }, {})
    })),
  upsert: (run) =>
    set((state) => ({
      runs: {
        ...state.runs,
        [run.id]: run
      }
    }))
}));
