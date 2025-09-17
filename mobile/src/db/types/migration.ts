import type { SQLTransaction } from 'expo-sqlite';

export type Migration = {
  id: number;
  name: string;
  run: (tx: SQLTransaction) => void;
};
