import { executeSql } from '@/db/sqlite';
import type { SyncMutation } from '@/types';

export async function enqueueMutation(mutation: SyncMutation) {
  await executeSql(
    `INSERT INTO sync_outbox (id, table_name, operation, entity_id, payload, client_ts, attempt_count, last_error, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      .replace(/\s+/g, ' '),
    [
      mutation.id,
      mutation.tableName,
      mutation.operation,
      mutation.entityId,
      JSON.stringify(mutation.payload),
      mutation.clientTs,
      mutation.attemptCount ?? 0,
      mutation.lastError ?? null,
      mutation.createdAt
    ]
  );
}

export async function getPendingMutations(limit = 50): Promise<SyncMutation[]> {
  const result = await executeSql(
    `SELECT id, table_name as tableName, operation, entity_id as entityId, payload, client_ts as clientTs,
            attempt_count as attemptCount, last_error as lastError, created_at as createdAt
       FROM sync_outbox
       ORDER BY created_at ASC
       LIMIT ?`,
    [limit]
  );
  const items: SyncMutation[] = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    const row = result.rows.item(i) as any;
    items.push({
      ...row,
      payload: JSON.parse(row.payload)
    });
  }
  return items;
}

export async function markMutationApplied(id: string) {
  await executeSql(`DELETE FROM sync_outbox WHERE id = ?`, [id]);
}

export async function markMutationFailed(id: string, error: Error) {
  await executeSql(
    `UPDATE sync_outbox SET attempt_count = attempt_count + 1, last_error = ? WHERE id = ?`,
    [error.message, id]
  );
}

export async function clearOutbox() {
  await executeSql(`DELETE FROM sync_outbox`);
}
