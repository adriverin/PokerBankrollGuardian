export type UUID = string;

export type BaseModel = {
  id: UUID;
  userId: UUID;
  updatedAt: string;
  deletedAt?: string | null;
  dirty?: boolean;
};

export type CashSession = BaseModel & {
  startTs: string;
  endTs?: string | null;
  venue?: string;
  game?: 'NLH' | 'PLO' | 'MIX' | 'OTHER' | string;
  sbCents: number;
  bbCents: number;
  buyinCents: number;
  cashoutCents?: number | null;
  tipsCents?: number | null;
  rakeModel?: string | null;
  notes?: string | null;
  tags?: string[];
  durationMinutes?: number | null;
};

export type MttSession = BaseModel & {
  startTs: string;
  endTs?: string | null;
  venue?: string;
  game?: string;
  buyinCents: number;
  feeCents?: number | null;
  reentries: number;
  cashCents?: number | null;
  bountiesCents?: number | null;
  position?: number | null;
  fieldSize?: number | null;
  notes?: string | null;
  tags?: string[];
};

export type LedgerEntry = BaseModel & {
  type: 'deposit' | 'withdrawal' | 'transfer' | 'bonus' | 'expense';
  amountCents: number;
  currency: string;
  occurredAt: string;
  notes?: string | null;
};

export type Policy = BaseModel & {
  name: string;
  kind: 'aggressive' | 'medium' | 'cautious' | 'custom';
  payload: Record<string, unknown>;
};

export type SimRun = BaseModel & {
  paramsHash: string;
  params: Record<string, unknown>;
  result?: Record<string, unknown>;
  status: 'pending' | 'running' | 'complete' | 'failed';
  createdAt: string;
};

export type Attachment = BaseModel & {
  filename: string;
  mimeType?: string | null;
  contentUri: string;
  metadata?: Record<string, unknown> | null;
  uploadRequired: boolean;
};

export type SyncMutation = {
  id: string;
  tableName: string;
  operation: 'insert' | 'update' | 'delete';
  entityId: string;
  payload: Record<string, unknown>;
  clientTs: string;
  attemptCount: number;
  lastError?: string | null;
  createdAt: string;
};
