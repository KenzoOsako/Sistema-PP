import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, spacing, radii, shadows } from '../../theme';
import Header from '../../components/Header';
import ConfirmModal from '../../components/ConfirmModal';
import { subscribeToStoreStatus, setStoreOpen } from '../../adapters/StoreStatusAdapter';
import { showAlert } from '../../utils/showAlert';

// ETAPA 2 (23/08/2026) — antes disso, abrir/fechar a loja era um Switch
// dentro do menu dropdown da Fase 3: um único toque sem querer (ou um dedo
// escorregando ao rolar a lista de opções) já mudava esse status na hora,
// sem chance de desfazer. Essa decisão afeta literalmente TODO cliente que
// abrir o app naquele momento — merece mais respeito que um interruptor
// dentro de um menu. Por isso virou uma tela própria: explica com todas as
// letras o que "aberto"/"fechado" significa pro cliente, só oferece uma ação
// CLICÁVEL e explícita (nunca deslizar), rotulada com o que ela realmente vai
// fazer ("Abrir loja"/"Fechar loja", nunca um texto ambíguo), e ainda por
// cima exige uma segunda confirmação num pop-up antes de aplicar de verdade
// — duas barreiras deliberadas entre "eu só tava olhando" e "acabei de
// desligar os pedidos de todo mundo".
export default function AdminStoreStatusScreen({ navigation }) {
  const [storeOpen, setStoreOpenState] = useState(true);
  const [loading, setLoading] = useState(true);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToStoreStatus((open) => {
      setStoreOpenState(open);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // O botão de ação só propõe o OPOSTO do estado atual — não existe um botão
  // "abrir" e outro "fechar" ao mesmo tempo na tela (isso voltaria a parecer
  // um toggle disfarçado). Fica claro pelo rótulo e pela cor qual ação faz
  // sentido a partir de onde a loja está agora.
  const targetOpen = !storeOpen;

  const handleApply = async () => {
    setApplying(true);
    try {
      await setStoreOpen(targetOpen);
      setConfirmVisible(false);
    } catch (e) {
      console.error(e);
      showAlert('Erro', e.message || 'Não deu pra mudar o status da loja agora. Tenta de novo.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Status da Loja" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <View style={styles.content}>
          <View style={[styles.statusCard, storeOpen ? styles.statusCardOpen : styles.statusCardClosed]}>
            <Text style={styles.statusEmoji}>{storeOpen ? '🟢' : '🔴'}</Text>
            <Text style={styles.statusLabel}>{storeOpen ? 'Loja aberta' : 'Loja fechada'}</Text>
            <Text style={styles.statusExplain}>
              {storeOpen
                ? 'Os clientes estão vendo o cardápio e conseguem fechar pedidos normalmente.'
                : 'O cardápio continua visível pros clientes, mas ninguém consegue fechar um pedido novo até você reabrir.'}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.actionButton, targetOpen ? styles.actionOpen : styles.actionClose]}
            onPress={() => setConfirmVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.actionButtonText}>
              {targetOpen ? '🟢  Abrir loja' : '🔴  Fechar loja'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.actionHint}>
            {targetOpen
              ? 'Assim que abrir, os clientes voltam a poder fechar pedidos na hora.'
              : 'Assim que fechar, nenhum cliente consegue mais finalizar um pedido novo — o cardápio continua visível, e os pedidos já feitos seguem normalmente na fila.'}
          </Text>
        </View>
      )}

      <ConfirmModal
        visible={confirmVisible}
        title={targetOpen ? 'Abrir a loja agora?' : 'Fechar a loja agora?'}
        message={
          targetOpen
            ? 'Os clientes vão voltar a conseguir fechar pedidos imediatamente.'
            : 'Nenhum cliente vai conseguir fechar um pedido novo até você abrir de novo. Pedidos já feitos continuam normalmente na fila.'
        }
        confirmLabel={applying ? 'Aplicando...' : (targetOpen ? 'Sim, abrir' : 'Sim, fechar')}
        danger={!targetOpen}
        onCancel={() => !applying && setConfirmVisible(false)}
        onConfirm={handleApply}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, padding: spacing.lg },
  statusCard: {
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
    borderWidth: 1,
    ...shadows.card,
  },
  statusCardOpen: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  statusCardClosed: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  statusEmoji: { fontSize: 40, marginBottom: spacing.sm },
  statusLabel: { fontSize: 22, fontWeight: '900', color: colors.text, marginBottom: spacing.xs },
  statusExplain: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  actionButton: {
    borderRadius: radii.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadows.button,
  },
  actionOpen: { backgroundColor: colors.success },
  actionClose: { backgroundColor: colors.alert },
  actionButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  actionHint: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 18,
    paddingHorizontal: spacing.md,
  },
});
