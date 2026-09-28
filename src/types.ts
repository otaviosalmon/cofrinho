export type SyncStatus = 'pending' | 'synced';

export type Gasto = {
  id: number;
  syncId: string;
  descricao: string;
  categoria: string;
  valor: number;
  dataGasto: string;
  updatedAt: string;
  syncStatus: SyncStatus;
};

export type ResumoCategoria = {
  categoria: string;
  total: number;
  quantidade: number;
};

export type SyncResult = {
  enviados: number;
  baixados: number;
};
