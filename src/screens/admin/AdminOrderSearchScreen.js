import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, spacing, radii, shadows } from '../../theme';
import Header from '../../components/Header';
import { subscribeToOrders, updateOrderStatus } from '../../adapters/OrderAdapter';
import { maskPhone } from '../../utils/phoneMask';

// ETAPA 3 (23/08/2026) — "a pessoa chega e fala o código dela, o Paulinho
// digita e já vê tudo": o código de 5 caracteres mostrado em cada card
// ("Pedido OL2SJ") já é só os 5 primeiros caracteres do próprio ID do
// documento no Firestore (maiúsculo) — não existe um campo separado pra
// isso. Como subscribeToOrders já traz TODOS os pedidos (não só os ativos
// da fila — é a mesma fonte usada pelo Financeiro), dá pra pesquisar esse
// código sem precisar de nenhum campo novo nem consulta nova ao banco: é
// só filtrar a lista já carregada comparando o prefixo do ID. Cobre pedidos
// de qualquer dia, não só os que ainda estão na fila ativa.
const getOrderCode = (order) => order.id.slice(0, 5).toUpperCase();

export default function AdminOrderSearchScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToOrders((data) => {
      setOrders(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const normalizedCode = code.trim().toUpperCase();

  // Colisão de dois pedidos com os mesmos 5 primeiros caracteres de ID é
  // rara, mas não impossível — por isso é uma LISTA de resultados, não um
  // único pedido. Com o código completo (5 caracteres) e a base de pedidos
  // deste app, a chance real de dois pedidos diferentes começarem
  // exatamente iguais é bem pequena, mas exibir todos os que baterem evita
  // qualquer ambiguidade silenciosa (mostrar só "o primeiro que achou" sem
  // avisar seria pior).
  const results = useMemo(() => {
    if (normalizedCode.length < 3) return [];
    return orders.filter(o => getOrderCode(o).startsWith(normalizedCode));
  }, [orders, normalizedCode]);

  const getStatusColor = (status) => {
    if (status === 'received') return colors.warning;
    if (status === 'preparing') return colors.primary;
    if (status === 'ready') return colors.success;
    if (status === 'completed') return colors.textSecondary;
    if (status === 'no_show') return colors.alert;
    return '#CCC';
  };

  const getStatusText = (status) => {
    if (status === 'received') return 'Recebido';
    if (status === 'preparing') return 'Fritando 🔥';
    if (status === 'ready') return 'Pronto ✅';
    if (status === 'completed') return 'Retirado ✅';
    if (status === 'no_show') return 'Não Retirado';
    return status;
  };

  const getActionLabel = (status, paymentMethod) => {
    if (status === 'received') return paymentMethod === 'on_pickup' ? 'Iniciar Preparo' : 'Confirmar Pix';
    if (status === 'preparing') return 'Marcar Pronto';
    if (status === 'ready') return paymentMethod === 'on_pickup' ? 'Finalizado ✅' : 'Entregue ✅';
    return null; // 'completed'/'no_show' não têm mais ação de avanço
  };

  const getClientLabel = (item) => {
    if (item.client_name) return item.client_name;
    const digits = item.client_email?.split('@')[0];
    if (!digits) return 'Desconhecido';
    return /^\d+$/.test(digits) ? maskPhone(digits) : digits;
  };

  const getOrderDateTime = (item) => {
    if (!item.created_at?.toDate) return '';
    const d = item.created_at.toDate();
    const isToday = d.toDateString() === new Date().toDateString();
    const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return isToday ? time : `${d.toLocaleDateString('pt-BR')} · ${time}`;
  };

  const handleAdvance = async (order) => {
    setUpdatingId(order.id);
    try {
      await updateOrderStatus(order.id, order.status);
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Buscar Pedido" onBack={() => navigation.goBack()} />

      <View style={styles.searchBox}>
        <Text style={styles.searchLabel}>Código do pedido</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Ex: OL2SJ"
          placeholderTextColor={colors.placeholder}
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={5}
        />
        <Text style={styles.searchHint}>Peça pro cliente falar os 5 caracteres do código do pedido dele.</Text>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : normalizedCode.length < 3 ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyText}>Digite pelo menos 3 caracteres do código pra buscar.</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyText}>Nenhum pedido encontrado com esse código.</Text>
        </View>
      ) : (
        results.map(item => {
          const actionLabel = getActionLabel(item.status, item.payment_method);
          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.orderId}>Pedido {getOrderCode(item)}</Text>
                <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
                  <Text style={styles.badgeText} numberOfLines={1}>{getStatusText(item.status)}</Text>
                </View>
              </View>

              <Text style={styles.paymentBadge}>
                {item.payment_method === 'on_pickup' ? '💳 Cartão/Dinheiro na retirada' : '🔑 Pix'}
                {getOrderDateTime(item) ? ` · ⏰ ${getOrderDateTime(item)}` : ''}
              </Text>

              <Text style={styles.clientLabel}>Cliente: {getClientLabel(item)}</Text>

              <View style={styles.itemsList}>
                {item.items?.map((prod, i) => (
                  <Text key={i} style={styles.itemRow}>• {prod.quantity}x {prod.name}</Text>
                ))}
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.totalText}>R$ {item.total?.toFixed(2).replace('.', ',')}</Text>
                {actionLabel && (
                  <TouchableOpacity
                    style={[styles.actionButton, updatingId === item.id && { opacity: 0.5 }]}
                    onPress={() => handleAdvance(item)}
                    disabled={updatingId === item.id}
                  >
                    <Text style={styles.actionButtonText}>
                      {updatingId === item.id ? 'Atualizando...' : actionLabel}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBox: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchLabel: { fontSize: 12, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.6, marginBottom: spacing.xs },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 4,
    color: colors.text,
    textAlign: 'center',
  },
  searchHint: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    margin: spacing.lg,
    marginBottom: 0,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...shadows.card,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  orderId: { fontSize: 16, fontWeight: '900', color: colors.text },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radii.sm, maxWidth: 170 },
  badgeText: { color: colors.surface, fontSize: 12, fontWeight: 'bold' },
  paymentBadge: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', marginBottom: spacing.xs },
  clientLabel: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.sm },
  itemsList: { backgroundColor: colors.background, padding: spacing.sm, borderRadius: radii.sm, marginBottom: spacing.sm },
  itemRow: { fontSize: 14, color: colors.text, marginBottom: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  totalText: { fontSize: 18, fontWeight: 'bold', color: colors.primary },
  actionButton: { backgroundColor: '#1A1A1A', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.full, maxWidth: '65%' },
  actionButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
});
