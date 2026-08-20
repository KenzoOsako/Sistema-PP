import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { colors, spacing, radii } from '../../theme';
import { subscribeToOrders, updateOrderStatus } from '../../adapters/OrderAdapter';

export default function AdminFilaScreen() {
  const [orders, setOrders] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToOrders(setOrders);
    return () => unsubscribe();
  }, []);

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

  const getStatusText = (status) => {
    if (status === 'received') return 'Novo (Esperando Pix)';
    if (status === 'preparing') return 'No Fogo 🔥';
    if (status === 'ready') return 'Pronto ✅';
    return status;
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>Pedido {item.id.slice(0, 5).toUpperCase()}</Text>
        <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.badgeText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      
      <Text style={styles.clientPhone}>Cliente: {item.client_email?.split('@')[0] || 'Desconhecido'}</Text>

      <View style={styles.itemsList}>
        {item.items?.map((prod, i) => (
          <Text key={i} style={styles.itemRow}>• {prod.quantity}x {prod.name}</Text>
        ))}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.totalText}>R$ {item.total?.toFixed(2).replace('.', ',')}</Text>
        
        {item.status !== 'ready' && (
          <TouchableOpacity 
            style={[styles.actionButton, updatingId === item.id && { opacity: 0.5 }]} 
            onPress={() => advanceStatus(item.id, item.status)}
            disabled={updatingId === item.id}
          >
            <Text style={styles.actionButtonText}>
              {updatingId === item.id ? 'Atualizando...' : (item.status === 'received' ? 'Confirmar Pix e Fritar' : 'Marcar como Pronto')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fila do Paulinho 🧑‍🍳</Text>
        <Text style={styles.headerSubtitle}>{orders.length} pedidos na fila</Text>
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ color: colors.textSecondary }}>Nenhum pedido na fila ainda.</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  badgeText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: 'bold',
  },
  clientPhone: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  itemsList: {
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
  },
  itemRow: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  actionButton: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  }
});
