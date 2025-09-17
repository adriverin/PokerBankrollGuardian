import * as SQLite from 'expo-sqlite';

const DB_NAME = 'poker_bankroll_guardian.db';

let database: SQLite.WebSQLDatabase | null = null;

export function getDatabase() {
  if (!database) {
    database = SQLite.openDatabase(DB_NAME);
  }
  return database;
}

export function executeSql<T = SQLite.SQLResultSet>(
  sql: string,
  params: SQLite.SQLStatementArg[] = []
): Promise<SQLite.SQLResultSet> {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.transaction((tx) => {
      tx.executeSql(
        sql,
        params,
        (_, result) => {
          resolve(result);
          return true;
        },
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
}

export function runTransaction(handler: (tx: SQLite.SQLTransaction) => void) {
  return new Promise<void>((resolve, reject) => {
    const db = getDatabase();
    db.transaction(
      (tx) => handler(tx),
      (error) => reject(error),
      () => resolve()
    );
  });
}
