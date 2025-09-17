import { executeSql } from '@/db/sqlite';
import type { Attachment, CashSession, LedgerEntry, MttSession, Policy, SimRun } from '@/types';

const toDbBoolean = (value?: boolean | number | null) => (value ? 1 : 0);

export async function listCashSessions(): Promise<CashSession[]> {
  const result = await executeSql(`SELECT * FROM cash_sessions`);
  const items: CashSession[] = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    const row = result.rows.item(i) as any;
    items.push({
      id: row.id,
      userId: row.user_id,
      startTs: row.start_ts,
      endTs: row.end_ts,
      venue: row.venue,
      game: row.game,
      sbCents: row.sb_cents,
      bbCents: row.bb_cents,
      buyinCents: row.buyin_cents,
      cashoutCents: row.cashout_cents,
      tipsCents: row.tips_cents,
      rakeModel: row.rake_model,
      notes: row.notes,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      durationMinutes: row.duration_minutes,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      dirty: Boolean(row.dirty)
    });
  }
  return items;
}

export async function upsertCashSession(session: CashSession) {
  await executeSql(
    `INSERT OR REPLACE INTO cash_sessions (
      id, user_id, start_ts, end_ts, venue, game, sb_cents, bb_cents, buyin_cents, cashout_cents,
      tips_cents, rake_model, notes, tags, duration_minutes, updated_at, deleted_at, dirty
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      .replace(/\s+/g, ' '),
    [
      session.id,
      session.userId,
      session.startTs,
      session.endTs ?? null,
      session.venue ?? null,
      session.game ?? null,
      session.sbCents,
      session.bbCents,
      session.buyinCents,
      session.cashoutCents ?? null,
      session.tipsCents ?? null,
      session.rakeModel ?? null,
      session.notes ?? null,
      session.tags ? JSON.stringify(session.tags) : null,
      session.durationMinutes ?? null,
      session.updatedAt,
      session.deletedAt ?? null,
      toDbBoolean(session.dirty)
    ]
  );
}

export async function listMttSessions(): Promise<MttSession[]> {
  const result = await executeSql(`SELECT * FROM mtt_sessions`);
  const items: MttSession[] = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    const row = result.rows.item(i) as any;
    items.push({
      id: row.id,
      userId: row.user_id,
      startTs: row.start_ts,
      endTs: row.end_ts,
      venue: row.venue,
      game: row.game,
      buyinCents: row.buyin_cents,
      feeCents: row.fee_cents,
      reentries: row.reentries,
      cashCents: row.cash_cents,
      bountiesCents: row.bounties_cents,
      position: row.position,
      fieldSize: row.field_size,
      notes: row.notes,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      dirty: Boolean(row.dirty)
    });
  }
  return items;
}

export async function upsertMttSession(session: MttSession) {
  await executeSql(
    `INSERT OR REPLACE INTO mtt_sessions (
      id, user_id, start_ts, end_ts, venue, game, buyin_cents, fee_cents, reentries, cash_cents,
      bounties_cents, position, field_size, notes, tags, updated_at, deleted_at, dirty
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      .replace(/\s+/g, ' '),
    [
      session.id,
      session.userId,
      session.startTs,
      session.endTs ?? null,
      session.venue ?? null,
      session.game ?? null,
      session.buyinCents,
      session.feeCents ?? null,
      session.reentries,
      session.cashCents ?? null,
      session.bountiesCents ?? null,
      session.position ?? null,
      session.fieldSize ?? null,
      session.notes ?? null,
      session.tags ? JSON.stringify(session.tags) : null,
      session.updatedAt,
      session.deletedAt ?? null,
      toDbBoolean(session.dirty)
    ]
  );
}

export async function listLedgerEntries(): Promise<LedgerEntry[]> {
  const result = await executeSql(`SELECT * FROM ledger_entries`);
  const items: LedgerEntry[] = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    const row = result.rows.item(i) as any;
    items.push({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      amountCents: row.amount_cents,
      currency: row.currency,
      occurredAt: row.occurred_at,
      notes: row.notes,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      dirty: Boolean(row.dirty)
    });
  }
  return items;
}

export async function upsertLedgerEntry(entry: LedgerEntry) {
  await executeSql(
    `INSERT OR REPLACE INTO ledger_entries (
      id, user_id, type, amount_cents, currency, occurred_at, notes, updated_at, deleted_at, dirty
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      .replace(/\s+/g, ' '),
    [
      entry.id,
      entry.userId,
      entry.type,
      entry.amountCents,
      entry.currency,
      entry.occurredAt,
      entry.notes ?? null,
      entry.updatedAt,
      entry.deletedAt ?? null,
      toDbBoolean(entry.dirty)
    ]
  );
}

export async function listPolicies(): Promise<Policy[]> {
  const result = await executeSql(`SELECT * FROM policies`);
  const items: Policy[] = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    const row = result.rows.item(i) as any;
    items.push({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      kind: row.kind,
      payload: JSON.parse(row.payload),
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      dirty: Boolean(row.dirty)
    });
  }
  return items;
}

export async function upsertPolicy(policy: Policy) {
  await executeSql(
    `INSERT OR REPLACE INTO policies (id, user_id, name, kind, payload, updated_at, deleted_at, dirty)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `.replace(/\s+/g, ' '),
    [
      policy.id,
      policy.userId,
      policy.name,
      policy.kind,
      JSON.stringify(policy.payload),
      policy.updatedAt,
      policy.deletedAt ?? null,
      toDbBoolean(policy.dirty)
    ]
  );
}

export async function listSimRuns(): Promise<SimRun[]> {
  const result = await executeSql(`SELECT * FROM sim_runs`);
  const items: SimRun[] = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    const row = result.rows.item(i) as any;
    items.push({
      id: row.id,
      userId: row.user_id,
      paramsHash: row.params_hash,
      params: JSON.parse(row.params),
      result: row.result ? JSON.parse(row.result) : undefined,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      dirty: Boolean(row.dirty)
    });
  }
  return items;
}

export async function upsertSimRun(simRun: SimRun) {
  await executeSql(
    `INSERT OR REPLACE INTO sim_runs (
      id, user_id, params_hash, params, result, status, created_at, updated_at, dirty
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      .replace(/\s+/g, ' '),
    [
      simRun.id,
      simRun.userId,
      simRun.paramsHash,
      JSON.stringify(simRun.params),
      simRun.result ? JSON.stringify(simRun.result) : null,
      simRun.status,
      simRun.createdAt,
      simRun.updatedAt,
      toDbBoolean(simRun.dirty)
    ]
  );
}

export async function listAttachments(): Promise<Attachment[]> {
  const result = await executeSql(`SELECT * FROM attachments`);
  const items: Attachment[] = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    const row = result.rows.item(i) as any;
    items.push({
      id: row.id,
      userId: row.user_id,
      filename: row.filename,
      mimeType: row.mime_type,
      contentUri: row.content_uri,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      uploadRequired: Boolean(row.upload_required),
      dirty: Boolean(row.dirty)
    });
  }
  return items;
}

export async function upsertAttachment(attachment: Attachment) {
  await executeSql(
    `INSERT OR REPLACE INTO attachments (
      id, user_id, filename, mime_type, content_uri, metadata, created_at, updated_at, upload_required, dirty
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      .replace(/\s+/g, ' '),
    [
      attachment.id,
      attachment.userId,
      attachment.filename,
      attachment.mimeType ?? null,
      attachment.contentUri,
      attachment.metadata ? JSON.stringify(attachment.metadata) : null,
      attachment.createdAt,
      attachment.updatedAt,
      toDbBoolean(attachment.uploadRequired),
      toDbBoolean(attachment.dirty)
    ]
  );
}
