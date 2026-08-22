import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { colors, spacing, radii, shadows } from '../../theme';
import Header from '../../components/Header';
import ConfirmModal from '../../components/ConfirmModal';
import { subscribeToOrders, updateOrderStatus, markNoShow } from '../../adapters/OrderAdapter';
import { logout } from '../../adapters/AuthAdapter';
import { maskPhone } from '../../utils/phoneMask';
import { NO_SHOW_TOLERANCE_MINUTES } from '../../config';
import { showAlert } from '../../utils/showAlert';

// Referência de tempo pra janela de tolerância do "Cliente Não Retirou":
// prefere ready_at (quando o pastel ficou pronto, esperando no balcão) e
// cai pra created_at nos raros casos de sumiço antes de chegar em "pronto".
const noShowReferenceDate = (item) => {
  if (item.ready_at?.toDate) return item.ready_at.toDate();
  if (item.created_at?.toDate) return item.created_at.toDate();
  return null;
};

export default function AdminFilaScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);
  const [noShowTarget, setNoShowTarget] = useState(null);
  const [noShowLoading, setNoShowLoading] = useState(false);
  // Só existe pra forçar um re-render por minuto e o texto/estado do botão
  // "Cliente Não Retirou" avançar sozinho conforme a janela de tolerância
  // vai passando, sem precisar o Paulinho puxar a tela pra atualizar.
  const [, forceTick] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToOrders(setOrders);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => forceTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const advanceStatus = async (orderId, currentStatus) => {
    setUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, currentStatus);
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  // Minutos restantes até o botão "Cliente Não Retirou" liberar (ver
  // NO_SHOW_TOLERANCE_MINUTES em config.js). null = já liberado.
  const minutesUntilNoShowAllowed = (item) => {
    const ref = noShowReferenceDate(item);
    if (!ref) return null;
    const elapsedMin = (Date.now() - ref.getTime()) / 60000;
    const remaining = Math.ceil(NO_SHOW_TOLERANCE_MINUTES - elapsedMin);
    return remaining > 0 ? remaining : null;
  };

  const confirmNoShow = async () => {
    if (!noShowTarget) return;
    setNoShowLoading(true);
    try {
      await markNoShow(noShowTarget);
      setNoShowTarget(null);
    } catch (e) {
      console.error(e);
      showAlert('Erro', e.message || 'Não deu pra marcar esse pedido agora. Tenta de novo.');
    } finally {
      setNoShowLoading(false);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'received') return colors.warning;
    if (status === 'preparing') return colors.primary;
    if (status === 'ready') return colors.success;
    return '#CCC';
  };

  const getStatusText = (status, paymentMethod) => {
    if (status === 'received') {
      return paymentMethod === 'on_pickup' ? 'Novo · Retirada' : 'Novo · Pix';
    }
    if (status === 'preparing') return 'No Fogo 🔥';
    if (status === 'ready') return 'Pronto ✅';
    return status;
  };

  const getActionLabel = (status, paymentMethod) => {
    if (status === 'received') {
      return paymentMethod === 'on_pickup' ? 'Iniciar Preparo' : 'Confirmar Pix';
    }
    if (status === 'ready') {
      // Pix já foi confirmado como pago lá no início ("Confirmar Pix"), não
      // faz sentido perguntar de novo aqui — só falta o cliente retirar.
      // Cartão/dinheiro na retirada é diferente: só é cobrado nesse momento
      // final, então "Finalizado" cobre pagamento + entrega de uma vez.
      return paymentMethod === 'on_pickup' ? 'Finalizado ✅' : 'Entregue ✅';
    }
    return 'Marcar Pronto';
  };

  const getClientLabel = (item) => {
    if (item.client_name) return item.client_name;
    const digits = item.client_email?.split('@')[0];
    if (!digits) return 'Desconhecido';
    return /^\d+$/.test(digits) ? maskPhone(digits) : digits;
  };

  const getOrderTime = (item) => {
    if (!item.created_at?.toDate) return '';
    const d = item.created_at.toDate();
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const renderItem = ({ item }) => {
    const remainingMin = minutesUntilNoShowAllowed(item);
    const noShowReady = remainingMin === null;

    return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>Pedido {item.id.slice(0, 5).toUpperCase()}</Text>
        <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.badgeText} numberOfLines={1}>{getStatusText(item.status, item.payment_method)}</Text>
        </View>
      </View>

      <View style={styles.paymentRow}>
        <Text style={styles.paymentBadge}>
          {item.payment_method === 'on_pickup' ? '💳 Cartão/Dinheiro na retirada' : '🔑 Pix'}
          {getOrderTime(item) ? ` · ⏰ ${getOrderTime(item)}` : ''}
        </Text>
      </View>

      <Text style={styles.clientPhone}>Cliente: {getClientLabel(item)}</Text>

      <View style={styles.itemsList}>
        {item.items?.map((prod, i) => (
          <Text key={i} style={styles.itemRow}>• {prod.quantity}x {prod.name}</Text>
        ))}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.totalText}>R$ {item.total?.toFixed(2).replace('.', ',')}</Text>

        <TouchableOpacity
          style={[
            styles.actionButton,
            item.status === 'ready' && styles.actionButtonPaid,
            updatingId === item.id && { opacity: 0.5 },
          ]}
          onPress={() => advanceStatus(item.id, item.status)}
          disabled={updatingId === item.id}
        >
          <Text style={styles.actionButtonText} numberOfLines={1}>
            {updatingId === item.id ? 'Atualizando...' : getActionLabel(item.status, item.payment_method)}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.noShowButton, !noShowReady && styles.noShowButtonDisabled]}
        onPress={() => setNoShowTarget(item)}
        disabled={!noShowReady}
      >
        <Text style={[styles.noShowButtonText, !noShowReady && styles.noShowButtonTextDisabled]}>
          {noShowReady ? 'Cliente Não Retirou' : `Cliente Não Retirou (libera em ${remainingMin}min)`}
        </Text>
      </TouchableOpacity>
    </View>
    );
  };

  // "completed" = já foi marcado como pago/retirado (botão "Pago ✅") — some
  // da fila pra não acumular pedido antigo empurrando os novos pra baixo e
  // obrigando o Paulinho a ficar rolando a tela no meio do corre.
  const activeOrders = orders.filter(o => o.status !== 'completed');

  return (
    <View style={styles.container}>
      <Header title="Fila do Paulinho 🧑‍🍳" subtitle={`${activeOrders.length} pedidos na fila`} logo onLogout={handleLogout} />

      {activeOrders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🧺</Text>
          <Text style={styles.emptyText}>Nenhum pedido na fila ainda.</Text>
        </View>
      ) : (
        <FlatList
          data={activeOrders}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}

      <ConfirmModal
        visible={!!noShowTarget}
        title="Cliente não retirou?"
        message={
          noShowTarget?.payment_method === 'pix'
            ? 'Confirma que o cliente não veio buscar esse pedido? Já foi pago via Pix, então só sai da fila — ninguém fica devendo nada.'
            : 'Confirma que o cliente não veio buscar/pagar esse pedido? A conta dele será bloqueada até quitar ou você perdoar a dívida (aba Bloqueados).'
        }
        confirmLabel={noShowLoading ? 'Confirmando...' : 'Confirmar'}
        danger
        onCancel={() => !noShowLoading && setNoShowTarget(null)}
        onConfirm={confirmNoShow}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyEmoji: { fontSize: 40, marginBottom: spacing.sm },
  emptyText: { color: colors.textSecondary, fontSize: 15 },
  list: { padding: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  orderId: { fontSize: 16, fontWeight: '900', color: colors.text },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radii.sm, maxWidth: '60%' },
  badgeText: { color: colors.surface, fontSize: 12, fontWeight: 'bold' },
  clientPhone: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.sm },
  paymentRow: { marginBottom: spacing.xs },
  paymentBadge: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  itemsList: {
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
  },
  itemRow: { fontSize: 14, color: colors.text, marginBottom: 4 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  totalText: { fontSize: 18, fontWeight: 'bold', color: colors.primary },
  actionButton: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    maxWidth: '65%',
  },
  // Destaca o botão final ("Pago ✅") em verde — é a ação que tira o pedido
  // da fila de vez, então vale diferenciar visualmente das outras (que só
  // avançam o status).
  actionButtonPaid: {
    backgroundColor: colors.success,
  },
  actionButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  noShowButton: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.alert,
    borderRadius: radii.full,
    paddingVertical: 8,
    alignItems: 'center',
  },
  noShowButtonDisabled: { borderColor: colors.border },
  noShowButtonText: { color: colors.alert, fontWeight: '700', fontSize: 12 },
  noShowButtonTextDisabled: { color: colors.textSecondary },
});
