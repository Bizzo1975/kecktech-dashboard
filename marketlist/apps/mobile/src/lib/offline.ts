import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const getDb = () => {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('marketlist.db');
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS outbox (
          id TEXT PRIMARY KEY NOT NULL,
          method TEXT NOT NULL,
          path TEXT NOT NULL,
          body TEXT,
          created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS meta (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT
        );
        CREATE TABLE IF NOT EXISTS list_items_mirror (
          id TEXT PRIMARY KEY NOT NULL,
          list_id TEXT NOT NULL,
          json TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS pantry_mirror (
          id TEXT PRIMARY KEY NOT NULL,
          household_id TEXT NOT NULL,
          json TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS recipes_mirror (
          id TEXT PRIMARY KEY NOT NULL,
          json TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS meals_mirror (
          id TEXT PRIMARY KEY NOT NULL,
          json TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS prices_mirror (
          id TEXT PRIMARY KEY NOT NULL,
          kind TEXT NOT NULL,
          json TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS catalog_mirror (
          id TEXT PRIMARY KEY NOT NULL,
          json TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_list_items_mirror_list ON list_items_mirror(list_id);
        CREATE INDEX IF NOT EXISTS idx_pantry_mirror_household ON pantry_mirror(household_id);
        CREATE INDEX IF NOT EXISTS idx_prices_mirror_kind ON prices_mirror(kind);
      `);
      return db;
    })();
  }
  return dbPromise;
};

export const newOutboxId = () =>
  `ob-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const enqueueOutbox = async (entry: {
  id: string;
  method: string;
  path: string;
  body?: unknown;
}) => {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO outbox (id, method, path, body, created_at) VALUES (?, ?, ?, ?, ?)',
    entry.id,
    entry.method,
    entry.path,
    entry.body !== undefined ? JSON.stringify(entry.body) : null,
    Date.now(),
  );
};

export const listOutbox = async () => {
  const db = await getDb();
  return db.getAllAsync<{ id: string; method: string; path: string; body: string | null }>(
    'SELECT * FROM outbox ORDER BY created_at ASC',
  );
};

export const removeOutbox = async (id: string) => {
  const db = await getDb();
  await db.runAsync('DELETE FROM outbox WHERE id = ?', id);
};

export const setMeta = async (key: string, value: string) => {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', key, value);
};

export const getMeta = async (key: string) => {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM meta WHERE key = ?', key);
  return row?.value ?? null;
};

const mirrorRows = async (
  table: string,
  idColumn: string,
  scopeColumn: string | null,
  scopeValue: string | null,
  items: Array<{ id: string }>,
) => {
  const db = await getDb();
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    if (scopeColumn && scopeValue != null) {
      await db.runAsync(`DELETE FROM ${table} WHERE ${scopeColumn} = ?`, scopeValue);
    } else {
      await db.runAsync(`DELETE FROM ${table}`);
    }
    for (const item of items) {
      if (scopeColumn && scopeValue != null) {
        await db.runAsync(
          `INSERT OR REPLACE INTO ${table} (${idColumn}, ${scopeColumn}, json, updated_at) VALUES (?, ?, ?, ?)`,
          item.id,
          scopeValue,
          JSON.stringify(item),
          now,
        );
      } else {
        await db.runAsync(
          `INSERT OR REPLACE INTO ${table} (${idColumn}, json, updated_at) VALUES (?, ?, ?)`,
          item.id,
          JSON.stringify(item),
          now,
        );
      }
    }
  });
};

const readMirrored = async <T>(table: string, whereSql = '', params: (string | number)[] = []) => {
  const db = await getDb();
  const rows = await db.getAllAsync<{ json: string }>(
    `SELECT json FROM ${table} ${whereSql} ORDER BY updated_at DESC`,
    ...params,
  );
  return rows.map((row) => JSON.parse(row.json) as T);
};

export const mirrorListItems = async <T extends { id: string }>(listId: string, items: T[]) => {
  await mirrorRows('list_items_mirror', 'id', 'list_id', listId, items);
};

export const getMirroredListItems = async <T = unknown>(listId: string): Promise<T[]> =>
  readMirrored<T>('list_items_mirror', 'WHERE list_id = ?', [listId]);

export const mirrorPantry = async <T extends { id: string }>(householdId: string, items: T[]) => {
  await mirrorRows('pantry_mirror', 'id', 'household_id', householdId, items);
};

export const getMirroredPantry = async <T = unknown>(householdId: string): Promise<T[]> =>
  readMirrored<T>('pantry_mirror', 'WHERE household_id = ?', [householdId]);

export const mirrorRecipes = async <T extends { id: string }>(items: T[]) => {
  await mirrorRows('recipes_mirror', 'id', null, null, items);
};

export const getMirroredRecipes = async <T = unknown>(): Promise<T[]> =>
  readMirrored<T>('recipes_mirror');

export const mirrorMeals = async <T extends { id: string }>(items: T[]) => {
  await mirrorRows('meals_mirror', 'id', null, null, items);
};

export const getMirroredMeals = async <T = unknown>(): Promise<T[]> =>
  readMirrored<T>('meals_mirror');

export const mirrorCatalog = async <T extends { id: string }>(items: T[]) => {
  await mirrorRows('catalog_mirror', 'id', null, null, items);
};

export const getMirroredCatalog = async <T = unknown>(): Promise<T[]> =>
  readMirrored<T>('catalog_mirror');

export const mirrorPrices = async <T extends { id: string }>(
  kind: 'stores' | 'deals' | 'history',
  items: T[],
) => {
  const db = await getDb();
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM prices_mirror WHERE kind = ?', kind);
    for (const item of items) {
      await db.runAsync(
        'INSERT OR REPLACE INTO prices_mirror (id, kind, json, updated_at) VALUES (?, ?, ?, ?)',
        item.id,
        kind,
        JSON.stringify(item),
        now,
      );
    }
  });
};

export const getMirroredPrices = async <T = unknown>(
  kind: 'stores' | 'deals' | 'history',
): Promise<T[]> => {
  const db = await getDb();
  const rows = await db.getAllAsync<{ json: string }>(
    'SELECT json FROM prices_mirror WHERE kind = ? ORDER BY updated_at DESC',
    kind,
  );
  return rows.map((row) => JSON.parse(row.json) as T);
};
