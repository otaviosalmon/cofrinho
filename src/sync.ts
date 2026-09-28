import {
  getGastosPendentes,
  marcarGastoSincronizado,
  salvarGastoDaNuvem,
} from './database';
import { ensureAnonymousSession, supabase } from './supabase';
import type { SyncResult } from './types';

type GastoNuvemRow = {
  sync_id: string;
  descricao: string;
  categoria: string;
  valor: number | string;
  data_gasto: string;
  updated_at: string;
};

export async function synchronizeData(): Promise<SyncResult> {
  const userId = await ensureAnonymousSession();

  // 1. envia o que está pendente no SQLite
  const pendentes = await getGastosPendentes();

  if (pendentes.length > 0) {
    const { error } = await supabase.from('gastos').upsert(
      pendentes.map((item) => ({
        sync_id: item.syncId,
        user_id: userId,
        descricao: item.descricao,
        categoria: item.categoria,
        valor: item.valor,
        data_gasto: item.dataGasto,
        updated_at: item.updatedAt,
      })),
      { onConflict: 'sync_id' },
    );
    if (error) throw error;

    for (const item of pendentes) {
      await marcarGastoSincronizado(item.syncId);
    }
  }

  // 2. baixa tudo da nuvem e salva no SQLite
  const { data, error } = await supabase
    .from('gastos')
    .select('sync_id,descricao,categoria,valor,data_gasto,updated_at')
    .order('updated_at', { ascending: true });
  if (error) throw error;

  const linhas = (data ?? []) as GastoNuvemRow[];

  for (const item of linhas) {
    await salvarGastoDaNuvem({
      syncId: item.sync_id,
      descricao: item.descricao,
      categoria: item.categoria,
      valor: Number(item.valor),
      dataGasto: new Date(item.data_gasto).toISOString(),
      updatedAt: new Date(item.updated_at).toISOString(),
    });
  }

  return { enviados: pendentes.length, baixados: linhas.length };
}
