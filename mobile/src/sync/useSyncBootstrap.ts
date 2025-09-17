import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useAuthStore } from '@/store/authStore';
import { useSessionStore } from '@/store/sessionStore';
import { useLedgerStore } from '@/store/ledgerStore';
import { usePolicyStore } from '@/store/policyStore';
import { useSimStore } from '@/store/simStore';
import { useSyncStore } from '@/store/syncStore';
import { listCashSessions, listLedgerEntries, listMttSessions, listPolicies, listSimRuns } from '@/db/repository';
import { clearOutbox, getPendingMutations, markMutationApplied } from '@/sync/outbox';
import { clearSyncCursor, getSyncCursor, setSyncCursor } from '@/sync/cursor';
import { apiClient } from '@/services/api/client';
import dayjs from '@/utils/dayjs';
import type { SyncMutation } from '@/types';

export function useSyncBootstrap() {
  const status = useAuthStore((state) => state.status);
  const hydrateCash = useSessionStore((state) => state.hydrateCashSessions);
  const hydrateMtt = useSessionStore((state) => state.hydrateMttSessions);
  const hydrateLedger = useLedgerStore((state) => state.hydrate);
  const hydratePolicies = usePolicyStore((state) => state.hydrate);
  const hydrateSims = useSimStore((state) => state.hydrate);
  const clearSessions = useSessionStore((state) => state.clear);
  const clearLedger = useLedgerStore((state) => state.clear);
  const setStatus = useSyncStore((state) => state.setStatus);
  const setLastSyncedAt = useSyncStore((state) => state.setLastSyncedAt);
  const setError = useSyncStore((state) => state.setError);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (status !== 'authenticated') {
      setHydrated(false);
      clearSessions();
      clearLedger();
      clearOutbox().catch(() => undefined);
      clearSyncCursor().catch(() => undefined);
      return;
    }
    (async () => {
      try {
        const [cash, mtt, ledger, policies, sims] = await Promise.all([
          listCashSessions(),
          listMttSessions(),
          listLedgerEntries(),
          listPolicies(),
          listSimRuns()
        ]);
        if (cancelled) return;
        hydrateCash(cash);
        hydrateMtt(mtt);
        hydrateLedger(ledger);
        hydratePolicies(policies);
        hydrateSims(sims);
        setHydrated(true);
        setStatus('idle');
      } catch (error) {
        console.error('Failed to hydrate from SQLite', error);
        setError('Failed to load local data');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, hydrateCash, hydrateMtt, hydrateLedger, hydratePolicies, hydrateSims, clearSessions, clearLedger, setStatus, setError]);

  useEffect(() => {
    if (!hydrated || status !== 'authenticated') {
      return;
    }

    let isActive = true;
    const sync = async () => {
      try {
        await runSyncCycle();
        setStatus('idle');
        setLastSyncedAt(dayjs().toISOString());
      } catch (error) {
        console.error('Sync failed', error);
        setError(error instanceof Error ? error.message : 'Sync failed');
      }
    };

    sync();
    const interval = setInterval(sync, 60_000);
    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [hydrated, status, setStatus, setLastSyncedAt, setError]);
}

export async function runSyncCycle() {
  const connection = await NetInfo.fetch();
  if (!connection.isConnected) {
    useSyncStore.getState().setStatus('offline');
    throw new Error('Offline');
  }
  useSyncStore.getState().setStatus('syncing');
  const pending = await getPendingMutations();
  if (pending.length) {
    await pushMutations(pending);
  }
  const cursor = await getSyncCursor();
  const response = await apiClient.pull(cursor);
  await applyServerChanges(response);
  if (response.cursor) {
    await setSyncCursor(response.cursor);
  }
}

async function pushMutations(mutations: SyncMutation[]) {
  try {
    const response = await apiClient.push(mutations);
    for (const id of response.applied) {
      await markMutationApplied(id);
    }
    if (response.cursor) {
      await setSyncCursor(response.cursor);
    }
  } catch (error) {
    for (const mutation of mutations) {
      await markMutationApplied(mutation.id);
    }
    throw error;
  }
}

async function applyServerChanges(payload: Awaited<ReturnType<ApiClient['pull']>>) {
  const hydrateCash = useSessionStore.getState().hydrateCashSessions;
  const hydrateMtt = useSessionStore.getState().hydrateMttSessions;
  const hydrateLedger = useLedgerStore.getState().hydrate;
  const hydratePolicies = usePolicyStore.getState().hydrate;
  const hydrateSims = useSimStore.getState().hydrate;

  if (!payload) return;

  if (payload.cash_sessions) {
    hydrateCash(payload.cash_sessions);
  }
  if (payload.mtt_sessions) {
    hydrateMtt(payload.mtt_sessions);
  }
  if (payload.ledger_entries) {
    hydrateLedger(payload.ledger_entries);
  }
  if (payload.policies) {
    hydratePolicies(payload.policies);
  }
  if (payload.sim_runs) {
    hydrateSims(payload.sim_runs);
  }
}
