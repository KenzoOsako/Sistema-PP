import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { colors, spacing, radii, shadows } from '../../theme';
import Header from '../../components/Header';
import { subscribeToOrders, updateOrderStatus } from '../../adapters/OrderAdapter';
import { logout } from '../../adapters/AuthAdapter';
import { maskPhone } from '../../utils/phoneMask';

export default function AdminFilaScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToOrders(setOrders);
    return () => unsubscribe();
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
    if (status === 'ready') return 'Pago ✅';
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

  const renderItem = ({ item }) => (
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
    </View>
  );

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
  actionButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 }
});
