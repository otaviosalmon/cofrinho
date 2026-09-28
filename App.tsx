import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getGastos,
  getResumo,
  initializeDatabase,
  insertGasto,
} from './src/database';
import { synchronizeData } from './src/sync';
import type { Gasto, ResumoCategoria } from './src/types';

type Screen = 'gastos' | 'novo' | 'resumo';

const CATEGORIAS = ['Comida', 'Transporte', 'Lazer', 'Estudos', 'Outros'];

function formatarValor(valor: number) {
  return 'R$ ' + valor.toFixed(2).replace('.', ',');
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('gastos');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('Comida');
  const [valor, setValor] = useState('');
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [resumo, setResumo] = useState<ResumoCategoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('Aguardando sincronização');
  const syncingRef = useRef(false);

  const total = gastos.reduce((soma, item) => soma + item.valor, 0);

  async function refreshLocalData() {
    const [storedGastos, storedResumo] = await Promise.all([
      getGastos(),
      getResumo(),
    ]);
    setGastos(storedGastos);
    setResumo(storedResumo);
  }

  async function syncNow(showAlert = false) {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    setSyncMessage('Sincronizando com a nuvem...');

    try {
      const result = await synchronizeData();
      await refreshLocalData();
      setSyncMessage(`Sincronizado. ${result.enviados} envio(s).`);
      if (showAlert) {
        Alert.alert('Pronto', 'Seus gastos estão salvos na nuvem.');
      }
    } catch (error) {
      console.error(error);
      setSyncMessage('Sem conexão. Os dados continuam salvos no celular.');
      if (showAlert) {
        Alert.alert(
          'Não foi possível sincronizar',
          'Os gastos continuam salvos no celular. Tente de novo quando tiver internet.',
        );
      }
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }

  useEffect(() => {
    async function prepareApplication() {
      try {
        await initializeDatabase();
        await refreshLocalData();
        setLoading(false);
        await syncNow(false);
      } catch (error) {
        console.error(error);
        Alert.alert('Erro', 'Não foi possível abrir o banco de dados local.');
        setLoading(false);
      }
    }
    void prepareApplication();
  }, []);

  async function addGasto() {
    const valorNumero = Math.round(Number(valor.replace(',', '.')) * 100) / 100;

    if (!descricao.trim()) {
      Alert.alert('Campo obrigatório', 'Preencha a descrição do gasto.');
      return;
    }

    if (!Number.isFinite(valorNumero) || valorNumero <= 0) {
      Alert.alert('Valor inválido', 'Digite um valor maior que zero. Ex.: 12,50');
      return;
    }

    try {
      setSaving(true);
      await insertGasto(descricao.trim(), categoria, valorNumero);
      await refreshLocalData();
      setDescricao('');
      setValor('');
      setCategoria('Comida');
      setScreen('gastos');
      void syncNow(false);
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível salvar o gasto.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View>
        <Text style={styles.title}>Cofrinho</Text>
        <Text style={styles.subtitle}>Controle de gastos para estudantes</Text>
      </View>

      <View style={styles.syncRow}>
        <Text style={styles.syncStatus}>{syncMessage}</Text>
        <Pressable
          style={[styles.syncButton, syncing && styles.buttonDisabled]}
          disabled={syncing}
          onPress={() => void syncNow(true)}
        >
          <Text style={styles.syncButtonText}>
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.nav}>
        <Pressable onPress={() => setScreen('gastos')}>
          <Text style={styles.navText}>Gastos</Text>
        </Pressable>
        <Pressable onPress={() => setScreen('novo')}>
          <Text style={styles.navText}>Novo</Text>
        </Pressable>
        <Pressable onPress={() => setScreen('resumo')}>
          <Text style={styles.navText}>Resumo</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={styles.muted}>Abrindo banco de dados...</Text>
        </View>
      ) : (
        <>
          {screen === 'gastos' && (
            <View style={styles.content}>
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Total gasto</Text>
                <Text style={styles.totalValue}>{formatarValor(total)}</Text>
              </View>

              <Text style={styles.sectionTitle}>Meus gastos</Text>
              <FlatList
                data={gastos}
                keyExtractor={(item) => item.syncId}
                ListEmptyComponent={
                  <Text style={styles.empty}>Nenhum gasto cadastrado.</Text>
                }
                renderItem={({ item }) => (
                  <View style={styles.card}>
                    <View style={styles.cardRow}>
                      <Text style={styles.cardTitle}>{item.descricao}</Text>
                      <Text style={styles.cardValue}>
                        {formatarValor(item.valor)}
                      </Text>
                    </View>
                    <Text style={styles.muted}>{item.categoria}</Text>
                    <Text style={styles.muted}>
                      {new Date(item.dataGasto).toLocaleString('pt-BR')}
                    </Text>
                    <Text style={styles.syncLabel}>
                      {item.syncStatus === 'synced' ? 'Na nuvem' : 'Pendente'}
                    </Text>
                  </View>
                )}
              />
            </View>
          )}

          {screen === 'novo' && (
            <View style={styles.content}>
              <Text style={styles.sectionTitle}>Novo gasto</Text>

              <Text style={styles.label}>Descrição</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex.: Lanche na cantina"
                value={descricao}
                onChangeText={setDescricao}
              />

              <Text style={styles.label}>Categoria</Text>
              <View style={styles.chips}>
                {CATEGORIAS.map((cat) => (
                  <Pressable
                    key={cat}
                    style={[styles.chip, categoria === cat && styles.chipSelected]}
                    onPress={() => setCategoria(cat)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        categoria === cat && styles.chipTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Valor (R$)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex.: 12,50"
                keyboardType="decimal-pad"
                value={valor}
                onChangeText={setValor}
              />

              <Pressable
                style={[styles.button, saving && styles.buttonDisabled]}
                disabled={saving}
                onPress={() => void addGasto()}
              >
                <Text style={styles.buttonText}>
                  {saving ? 'Salvando...' : 'Salvar gasto'}
                </Text>
              </Pressable>
            </View>
          )}

          {screen === 'resumo' && (
            <View style={styles.content}>
              <Text style={styles.sectionTitle}>Resumo por categoria</Text>
              <FlatList
                data={resumo}
                keyExtractor={(item) => item.categoria}
                ListEmptyComponent={
                  <Text style={styles.empty}>Nada para resumir ainda.</Text>
                }
                renderItem={({ item }) => (
                  <View style={styles.card}>
                    <View style={styles.cardRow}>
                      <Text style={styles.cardTitle}>{item.categoria}</Text>
                      <Text style={styles.cardValue}>
                        {formatarValor(item.total)}
                      </Text>
                    </View>
                    <Text style={styles.muted}>
                      {item.quantidade} gasto(s) •{' '}
                      {total > 0 ? Math.round((item.total / total) * 100) : 0}% do total
                    </Text>
                  </View>
                )}
              />
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f6f7f9' },
  title: { fontSize: 30, fontWeight: 'bold' },
  subtitle: { fontSize: 16, color: '#6b7280', marginTop: 4 },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
  },
  syncStatus: { flex: 1, color: '#4b5563', fontSize: 12 },
  syncButton: {
    backgroundColor: '#0f766e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  syncButtonText: { color: '#ffffff', fontWeight: '600' },
  syncLabel: { color: '#0f766e', fontSize: 12, marginTop: 8 },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  navText: { fontSize: 16, fontWeight: '600', color: '#16a34a' },
  content: { flex: 1, marginTop: 24 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 32 },
  totalCard: {
    backgroundColor: '#16a34a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  totalLabel: { color: '#dcfce7', fontSize: 14 },
  totalValue: { color: '#ffffff', fontSize: 28, fontWeight: 'bold', marginTop: 4 },
  card: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 12 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  cardValue: { fontSize: 18, fontWeight: 'bold', color: '#dc2626' },
  muted: { color: '#6b7280', marginTop: 4 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
    color: '#374151',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
  },
  chipSelected: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  chipText: { color: '#374151' },
  chipTextSelected: { color: '#ffffff', fontWeight: '600' },
  button: {
    backgroundColor: '#16a34a',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#ffffff', fontWeight: '600' },
});
