import dayjs from '@/utils/dayjs';
import { executeSql, runTransaction } from '@/db/sqlite';
import { MIGRATIONS } from '@/db/migrations';

let migrationsRan = false;

export async function runMigrations() {
  if (migrationsRan) {
    return;
  }
  const now = dayjs().toISOString();
  await executeSql(
    `CREATE TABLE IF NOT EXISTS migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL, run_at TEXT NOT NULL);`
  );
  const { rows } = await executeSql(`SELECT id FROM migrations`);
  const appliedIds = new Set<number>();
  for (let i = 0; i < rows.length; i += 1) {
    appliedIds.add(rows.item(i).id as number);
  }

  for (const migration of MIGRATIONS) {
    if (appliedIds.has(migration.id)) {
      continue;
    }
    await runTransaction((tx) => {
      migration.run(tx);
      tx.executeSql(`INSERT INTO migrations (id, name, run_at) VALUES (?, ?, ?)`, [
        migration.id,
        migration.name,
        now
      ]);
    });
  }
  migrationsRan = true;
}
