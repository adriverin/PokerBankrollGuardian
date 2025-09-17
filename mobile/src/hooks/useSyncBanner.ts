import { useMemo } from 'react';
import { useSyncStore } from '@/store/syncStore';

export function useSyncBanner() {
  const status = useSyncStore((state) => state.status);
  const lastSyncedAt = useSyncStore((state) => state.lastSyncedAt);
  const error = useSyncStore((state) => state.error);

  return useMemo(() => {
    if (status === 'syncing') {
      return { tone: 'info' as const, message: 'Syncing with cloud…' };
    }
    if (status === 'offline') {
      return { tone: 'warning' as const, message: 'Offline – changes will sync when you reconnect.' };
    }
    if (error) {
      return { tone: 'danger' as const, message: `Sync error: ${error}` };
    }
    if (lastSyncedAt) {
      return { tone: 'success' as const, message: `Last synced ${new Date(lastSyncedAt).toLocaleTimeString()}` };
    }
    return null;
  }, [status, lastSyncedAt, error]);
}
