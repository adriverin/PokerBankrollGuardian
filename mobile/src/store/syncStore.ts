import { create } from 'zustand';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

type SyncState = {
  status: SyncStatus;
  lastSyncedAt?: string;
  error?: string;
  setStatus: (status: SyncStatus) => void;
  setLastSyncedAt: (iso: string) => void;
  setError: (error?: string) => void;
};

export const useSyncStore = create<SyncState>((set) => ({
  status: 'idle',
  setStatus: (status) =>
    set((state) => ({
      status,
      error: status === 'error' ? state.error : undefined
    })),
  setLastSyncedAt: (iso) => set({ lastSyncedAt: iso }),
  setError: (error) => set({ error, status: error ? 'error' : 'idle' })
}));
