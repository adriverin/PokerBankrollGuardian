import { nanoid } from 'nanoid/non-secure';
import dayjs from '@/utils/dayjs';
import { enqueueMutation } from '@/sync/outbox';
import type { SyncMutation } from '@/types';

export async function queueMutation(
  tableName: SyncMutation['tableName'],
  operation: SyncMutation['operation'],
  entityId: string,
  payload: Record<string, unknown>
) {
  const mutation: SyncMutation = {
    id: nanoid(),
    tableName,
    operation,
    entityId,
    payload,
    clientTs: dayjs().toISOString(),
    attemptCount: 0,
    createdAt: dayjs().toISOString()
  };
  await enqueueMutation(mutation);
}
