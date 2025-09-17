import { create } from 'zustand';
import { nanoid } from 'nanoid/non-secure';
import dayjs from '@/utils/dayjs';
import type { CashSession, MttSession } from '@/types';

export type SessionFilter = {
  range?: { start: string; end: string };
  tags?: string[];
  venue?: string;
  game?: string;
};

type State = {
  cashById: Record<string, CashSession>;
  mttById: Record<string, MttSession>;
  addCashSession: (session: Omit<CashSession, 'id' | 'updatedAt'> & { id?: string }) => CashSession;
  updateCashSession: (id: string, patch: Partial<CashSession>) => void;
  softDeleteCashSession: (id: string) => void;
  addMttSession: (session: Omit<MttSession, 'id' | 'updatedAt'> & { id?: string }) => MttSession;
  updateMttSession: (id: string, patch: Partial<MttSession>) => void;
  softDeleteMttSession: (id: string) => void;
  hydrateCashSessions: (sessions: CashSession[]) => void;
  hydrateMttSessions: (sessions: MttSession[]) => void;
  clear: () => void;
};

export const useSessionStore = create<State>((set) => ({
  cashById: {},
  mttById: {},
  addCashSession: (session) => {
    const id = session.id ?? nanoid();
    const now = dayjs().toISOString();
    const cashSession: CashSession = {
      ...session,
      id,
      updatedAt: now,
      dirty: session.dirty ?? true
    } as CashSession;
    set((state) => ({
      cashById: {
        ...state.cashById,
        [id]: cashSession
      }
    }));
    return cashSession;
  },
  updateCashSession: (id, patch) => {
    set((state) => {
      const existing = state.cashById[id];
      if (!existing) {
        return state;
      }
      return {
        cashById: {
          ...state.cashById,
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
  softDeleteCashSession: (id) => {
    set((state) => {
      const existing = state.cashById[id];
      if (!existing) {
        return state;
      }
      return {
        cashById: {
          ...state.cashById,
          [id]: {
            ...existing,
            deletedAt: dayjs().toISOString(),
            dirty: true
          }
        }
      };
    });
  },
  addMttSession: (session) => {
    const id = session.id ?? nanoid();
    const now = dayjs().toISOString();
    const mttSession: MttSession = {
      ...session,
      id,
      updatedAt: now,
      dirty: session.dirty ?? true
    } as MttSession;
    set((state) => ({
      mttById: {
        ...state.mttById,
        [id]: mttSession
      }
    }));
    return mttSession;
  },
  updateMttSession: (id, patch) => {
    set((state) => {
      const existing = state.mttById[id];
      if (!existing) {
        return state;
      }
      return {
        mttById: {
          ...state.mttById,
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
  softDeleteMttSession: (id) => {
    set((state) => {
      const existing = state.mttById[id];
      if (!existing) {
        return state;
      }
      return {
        mttById: {
          ...state.mttById,
          [id]: {
            ...existing,
            deletedAt: dayjs().toISOString(),
            dirty: true
          }
        }
      };
    });
  },
  hydrateCashSessions: (sessions) => {
    set(() => ({
      cashById: sessions.reduce<Record<string, CashSession>>((acc, session) => {
        acc[session.id] = session;
        return acc;
      }, {})
    }));
  },
  hydrateMttSessions: (sessions) => {
    set(() => ({
      mttById: sessions.reduce<Record<string, MttSession>>((acc, session) => {
        acc[session.id] = session;
        return acc;
      }, {})
    }));
  },
  clear: () => set({ cashById: {}, mttById: {} })
}));
