import type { Migration } from '@/db/types/migration';

const initialMigration: Migration = {
  id: 1,
  name: 'initial-schema',
  run: (tx) => {
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        run_at TEXT NOT NULL
      );
    `);

    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY NOT NULL,
        email TEXT NOT NULL UNIQUE,
        display_name TEXT,
        avatar_url TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS ledger_entries (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        currency TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        notes TEXT,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        dirty INTEGER DEFAULT 0,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
    `);
    tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_ledger_user ON ledger_entries(user_id, occurred_at DESC);`);

    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS cash_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        start_ts TEXT NOT NULL,
        end_ts TEXT,
        venue TEXT,
        game TEXT,
        sb_cents INTEGER NOT NULL,
        bb_cents INTEGER NOT NULL,
        buyin_cents INTEGER NOT NULL,
        cashout_cents INTEGER,
        tips_cents INTEGER,
        rake_model TEXT,
        notes TEXT,
        tags TEXT,
        duration_minutes INTEGER,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        dirty INTEGER DEFAULT 0,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
    `);
    tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_cash_user ON cash_sessions(user_id, start_ts DESC);`);

    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS mtt_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        start_ts TEXT NOT NULL,
        end_ts TEXT,
        venue TEXT,
        game TEXT,
        buyin_cents INTEGER NOT NULL,
        fee_cents INTEGER,
        reentries INTEGER DEFAULT 0,
        cash_cents INTEGER,
        bounties_cents INTEGER,
        position INTEGER,
        field_size INTEGER,
        notes TEXT,
        tags TEXT,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        dirty INTEGER DEFAULT 0,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
    `);
    tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_mtt_user ON mtt_sessions(user_id, start_ts DESC);`);

    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS policies (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        dirty INTEGER DEFAULT 0,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
    `);

    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS sim_runs (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        params_hash TEXT NOT NULL,
        params TEXT NOT NULL,
        result TEXT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        dirty INTEGER DEFAULT 0,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
    `);

    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS sync_outbox (
        id TEXT PRIMARY KEY NOT NULL,
        table_name TEXT NOT NULL,
        operation TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        client_ts TEXT NOT NULL,
        attempt_count INTEGER DEFAULT 0,
        last_error TEXT,
        created_at TEXT NOT NULL
      );
    `);

    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS sync_cursor (
        id INTEGER PRIMARY KEY CHECK (id = 0),
        cursor TEXT
      );
    `);

    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS attachments (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        mime_type TEXT,
        content_uri TEXT NOT NULL,
        metadata TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        upload_required INTEGER DEFAULT 0,
        dirty INTEGER DEFAULT 0,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
    `);
  }
};

export default initialMigration;
