import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { colors, spacing, radii, shadows } from '../../theme';
import Header from '../../components/Header';
import ConfirmModal from '../../components/ConfirmModal';
import { subscribeToBlockedUsers, logout } from '../../adapters/AuthAdapter';
import { resolveNoShow } from '../../adapters/OrderAdapter';
import { maskPhone } from '../../utils/phoneMask';
import { showAlert } from '../../utils/showAlert';

// Aba "Bloqueados" do admin (ver docs/feature-bloqueio-no-show.md) — lista
// em tempo real toda conta de cliente bloqueada por não retirar/pagar um
// pedido, com o "recibo" (guardado como snapshot em markNoShow) e duas
// ações: "Pago" (cliente acertou depois — conta como venda no dia da
// quitação) ou "Perdoar Dívida" (Paulinho relevou — vira prejuízo no
// Financeiro em vez de venda).
export default function AdminBlockedScreen({ navigation }) {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [confirmTarget, setConfirmTarget] = useState(null); // { user, resolution }
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToBlockedUsers(setBlockedUsers);
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const askResolve = (user, resolution) => setConfirmTarget({ user, resolution });

  const confirmResolve = async () => {
    if (!confirmTarget) return;
    const { user, resolution } = confirmTarget;
    const orderId = user.blocked_order_id || user.blocked_order_snapshot?.order_id;
    if (!orderId) {
      showAlert('Erro', 'Esse bloqueio não tem um pedido associado — fale com o Felipe.');
      setConfirmTarget(null);
      return;
    }
    setResolving(true);
    try {
      await resolveNoShow(orderId, user.id, resolution);
      setConfirmTarget(null);
    } catch (e) {
      console.error(e);
      showAlert('Erro', e.message || 'Não deu pra resolver esse bloqueio agora. Tenta de novo.');
    } finally {
      setResolving(false);
    }
  };

  const getClientLabel = (user) => {
    if (user.name) return user.name;
    if (user.phone) return maskPhone(user.phone);
    return 'Desconhecido';
  };

  const getBlockedDate = (user) => {
    if (!user.blocked_at?.toDate) return '';
    return user.blocked_at.toDate().toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  };

  const renderItem = ({ item }) => {
    const snapshot = item.blocked_order_snapshot;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.clientName}>{getClientLabel(item)}</Text>
          {!!item.phone && <Text style={styles.clientPhone}>{maskPhone(item.phone)}</Text>}
        </View>
        {!!getBlockedDate(item) && (
          <Text style={styles.blockedSince}>Bloqueado desde {getBlockedDate(item)}</Text>
        )}
        {snapshot && (
          <View style={styles.itemsList}>
            {(snapshot.items || []).map((prod, i) => (
              <Text key={i} style={styles.itemRow}>• {prod.quantity}x {prod.name}</Text>
            ))}
          </View>
        )}
        <View style={styles.cardFooter}>
          <Text style={styles.totalText}>R$ {(snapshot?.total || 0).toFixed(2).replace('.', ',')}</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.forgiveButton]}
              onPress={() => askResolve(item, 'forgiven')}
            >
              <Text style={styles.forgiveButtonText}>Perdoar Dívida</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.paidButton]}
              onPress={() => askResolve(item, 'paid')}
            >
              <Text style={styles.paidButtonText}>Pago ✅</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Bloqueados 🔒" subtitle={`${blockedUsers.length} conta(s) bloqueada(s)`} logo onLogout={handleLogout} />

      {blockedUsers.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🎉</Text>
          <Text style={styles.emptyText}>Nenhuma conta bloqueada no momento.</Text>
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}

      <ConfirmModal
        visible={!!confirmTarget}
        title={confirmTarget?.resolution === 'forgiven' ? 'Perdoar essa dívida?' : 'Marcar como pago?'}
        message={
          confirmTarget?.resolution === 'forgiven'
            ? 'A conta é desbloqueada e a venda NÃO entra no Financeiro — o custo do ingrediente perdido aparece como prejuízo.'
            : 'A conta é desbloqueada e o valor entra normalmente nas vendas de hoje.'
        }
        confirmLabel={resolving ? 'Confirmando...' : 'Confirmar'}
        danger={confirmTarget?.resolution === 'forgiven'}
        onCancel={() => !resolving && setConfirmTarget(null)}
        onConfirm={confirmResolve}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg },
  emptyEmoji: { fontSize: 40, marginBottom: spacing.sm },
  emptyText: { color: colors.textSecondary, fontSize: 15, textAlign: 'center' },
  list: { padding: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.alert,
    ...shadows.card,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  clientName: { fontSize: 16, fontWeight: '900', color: colors.text },
  clientPhone: { fontSize: 13, color: colors.textSecondary },
  blockedSince: { fontSize: 12, color: colors.textSecondary, marginBottom: spacing.sm },
  itemsList: {
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
  },
  itemRow: { fontSize: 14, color: colors.text, marginBottom: 4 },
  cardFooter: { marginTop: spacing.xs },
  totalText: { fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: spacing.sm },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  actionButton: { flex: 1, paddingVertical: spacing.sm, borderRadius: radii.full, alignItems: 'center' },
  forgiveButton: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.alert },
  forgiveButtonText: { color: colors.alert, fontWeight: '700', fontSize: 13 },
  paidButton: { backgroundColor: colors.success },
  paidButtonText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});
