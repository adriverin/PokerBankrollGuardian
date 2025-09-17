import * as SQLite from 'expo-sqlite';

const DB_NAME = 'poker_bankroll_guardian.db';

let database: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!database) {
    database = SQLite.openDatabaseSync(DB_NAME);
  }
  return database;
}

export function executeSql(sql: string, params: SQLite.SQLiteBindParams = []): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const db = getDatabase();
    const statement = await db.prepareAsync(sql);
    try {
      const execResult = await statement.executeAsync(params as any);
      const rowsArray = await execResult.getAllAsync<any>();
      const rows = {
        length: rowsArray.length,
        item: (index: number) => rowsArray[index]
      } as any;
      resolve({ rows });
    } catch (error) {
      reject(error);
    } finally {
      await statement.finalizeAsync();
    }
  });
}

export async function runTransaction(handler: (tx: SQLite.SQLiteDatabase) => void | Promise<void>) {
  const db = getDatabase();
  await db.withExclusiveTransactionAsync(async (txn) => {
    const txShim = {
      executeSql: async (sql: string, params: SQLite.SQLiteBindParams = []) => {
        const statement = await txn.prepareAsync(sql);
        try {
          const execResult = await statement.executeAsync(params as any);
          const rowsArray = await execResult.getAllAsync<any>();
          return {
            rows: {
              length: rowsArray.length,
              item: (index: number) => rowsArray[index]
            }
          } as any;
        } finally {
          await statement.finalizeAsync();
        }
      }
    } as any;

    await handler(txShim);
  });
}
