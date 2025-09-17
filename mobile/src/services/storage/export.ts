import * as FileSystem from 'expo-file-system';
import { useSessionStore } from '@/store/sessionStore';
import { useLedgerStore } from '@/store/ledgerStore';
import { usePolicyStore } from '@/store/policyStore';

export async function exportLocalJson() {
  const cash = Object.values(useSessionStore.getState().cashById);
  const mtt = Object.values(useSessionStore.getState().mttById);
  const ledger = Object.values(useLedgerStore.getState().ledgerById);
  const policies = Object.values(usePolicyStore.getState().policies);
  const payload = JSON.stringify({ cash, mtt, ledger, policies }, null, 2);
  const path = `${FileSystem.documentDirectory}poker-bankroll-export.json`;
  await FileSystem.writeAsStringAsync(path, payload, { encoding: FileSystem.EncodingType.UTF8 });
  return path;
}
