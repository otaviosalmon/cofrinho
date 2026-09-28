import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';
import type { Gasto, ResumoCategoria } from './types';

const databasePromise = SQLite.openDatabaseAsync('cofrinho.db');

export type GastoSync = {
  syncId: string;
  descricao: string;
  categoria: string;
  valor: number;
  dataGasto: string;
  updatedAt: string;
};

export async function initializeDatabase() {
  const database = await databasePromise;

  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS gastos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sync_id TEXT NOT NULL UNIQUE,
      descricao TEXT NOT NULL,
      categoria TEXT NOT NULL,
      valor REAL NOT NULL,
      data_gasto TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      updated_at TEXT NOT NULL
    );
  `);
}

export async function getGastos() {
  const database = await databasePromise;
  return database.getAllAsync<Gasto>(`
    SELECT id, sync_id AS syncId, descricao, categoria, valor,
           data_gasto AS dataGasto, updated_at AS updatedAt,
           sync_status AS syncStatus
    FROM gastos
    ORDER BY data_gasto DESC;
  `);
}

export async function getResumo() {
  const database = await databasePromise;
  return database.getAllAsync<ResumoCategoria>(`
    SELECT categoria, SUM(valor) AS total, COUNT(*) AS quantidade
    FROM gastos
    GROUP BY categoria
    ORDER BY total DESC;
  `);
}

export async function insertGasto(
  descricao: string,
  categoria: string,
  valor: number,
) {
  const database = await databasePromise;
  const now = new Date().toISOString();

  await database.runAsync(
    `INSERT INTO gastos
       (sync_id, descricao, categoria, valor, data_gasto, sync_status, updated_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?);`,
    Crypto.randomUUID(),
    descricao,
    categoria,
    valor,
    now,
    now,
  );
}

export async function getGastosPendentes() {
  const database = await databasePromise;
  return database.getAllAsync<GastoSync>(`
    SELECT sync_id AS syncId, descricao, categoria, valor,
           data_gasto AS dataGasto, updated_at AS updatedAt
    FROM gastos
    WHERE sync_status = 'pending';
  `);
}

export async function marcarGastoSincronizado(syncId: string) {
  const database = await databasePromise;
  await database.runAsync(
    "UPDATE gastos SET sync_status = 'synced' WHERE sync_id = ?;",
    syncId,
  );
}

export async function salvarGastoDaNuvem(gasto: GastoSync) {
  const database = await databasePromise;
  await database.runAsync(
    `INSERT INTO gastos
       (sync_id, descricao, categoria, valor, data_gasto, sync_status, updated_at)
     VALUES (?, ?, ?, ?, ?, 'synced', ?)
     ON CONFLICT(sync_id) DO UPDATE SET
       descricao = excluded.descricao,
       categoria = excluded.categoria,
       valor = excluded.valor,
       data_gasto = excluded.data_gasto,
       sync_status = 'synced',
       updated_at = excluded.updated_at
     WHERE excluded.updated_at >= gastos.updated_at;`,
    gasto.syncId,
    gasto.descricao,
    gasto.categoria,
    gasto.valor,
    gasto.dataGasto,
    gasto.updatedAt,
  );
}
