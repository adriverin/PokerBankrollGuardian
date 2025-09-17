import { executeSql } from '@/db/sqlite';

export async function getSyncCursor(): Promise<string | undefined> {
  const result = await executeSql(`SELECT cursor FROM sync_cursor WHERE id = 0`);
  if (result.rows.length === 0) {
    return undefined;
  }
  return result.rows.item(0).cursor as string | undefined;
}

export async function setSyncCursor(cursor: string) {
  await executeSql(`INSERT OR REPLACE INTO sync_cursor (id, cursor) VALUES (0, ?)`, [cursor]);
}

export async function clearSyncCursor() {
  await executeSql(`DELETE FROM sync_cursor WHERE id = 0`);
}
