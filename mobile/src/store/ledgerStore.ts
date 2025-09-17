import { create } from 'zustand';
import { nanoid } from 'nanoid/non-secure';
import dayjs from '@/utils/dayjs';
import type { LedgerEntry } from '@/types';

type State = {
  ledgerById: Record<string, LedgerEntry>;
  addEntry: (entry: Omit<LedgerEntry, 'id' | 'updatedAt'> & { id?: string }) => LedgerEntry;
  updateEntry: (id: string, patch: Partial<LedgerEntry>) => void;
  softDeleteEntry: (id: string) => void;
  hydrate: (entries: LedgerEntry[]) => void;
  clear: () => void;
};

export const useLedgerStore = create<State>((set) => ({
  ledgerById: {},
  addEntry: (entry) => {
    const id = entry.id ?? nanoid();
    const now = dayjs().toISOString();
    const entity: LedgerEntry = {
      ...entry,
      id,
      updatedAt: now,
      dirty: entry.dirty ?? true
    } as LedgerEntry;
    set((state) => ({
      ledgerById: { ...state.ledgerById, [id]: entity }
    }));
    return entity;
  },
  updateEntry: (id, patch) => {
    set((state) => {
      const existing = state.ledgerById[id];
      if (!existing) return state;
      return {
        ledgerById: {
          ...state.ledgerById,
          [id]: {
            ...existing,
            ...patch,
            dirty: true,
            updatedAt: dayjs().toISOString()
          }
        }
      };
    });
  },
  softDeleteEntry: (id) => {
    set((state) => {
      const existing = state.ledgerById[id];
      if (!existing) return state;
      return {
        ledgerById: {
          ...state.ledgerById,
          [id]: {
            ...existing,
            deletedAt: dayjs().toISOString(),
            dirty: true
          }
        }
      };
    });
  },
  hydrate: (entries) =>
    set(() => ({
      ledgerById: entries.reduce<Record<string, LedgerEntry>>((acc, entry) => {
        acc[entry.id] = entry;
        return acc;
      }, {})
    })),
  clear: () => set({ ledgerById: {} })
}));
