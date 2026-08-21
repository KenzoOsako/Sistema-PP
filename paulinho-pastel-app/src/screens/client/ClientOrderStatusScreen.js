import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Vibration } from 'react-native';
import { colors, spacing, radii, shadows } from '../../theme';
import Button from '../../components/Button';
import Header from '../../components/Header';
import { db, auth } from '../../services/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { requestNotificationPermission, notifyOrderReady } from '../../services/notifications';
import { showAlert } from '../../utils/showAlert';

export default function ClientOrderStatusScreen({ navigation }) {
  const [myOrders, setMyOrders] = useState([]);
  const [notifiedSet] = useState(new Set());

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Ver comentário completo em OrderAdapter.subscribeToOrders: um erro
    // transitório (token expirado, rede instável) mata o listener pra
    // sempre sem retry automático do Firestore — por isso reconecta sozinho
    // em vez de só logar o erro, senão "Meus Pedidos" pode travar sem
    // atualizar mesmo com pedidos novos chegando.
    let currentUnsubscribe = null;
    let stopped = false;

    const start = () => {
      const q = query(
        collection(db, 'orders'),
        where('client_id', '==', auth.currentUser.uid),
        orderBy('created_at', 'desc')
      );

      currentUnsubscribe = onSnapshot(q, (snapshot) => {
        const ordersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Notificação push real (dispara mesmo com o app em segundo plano) +
        // reforço in-app (vibração e alerta) para quem estiver com a tela aberta.
        ordersData.forEach(o => {
          if (o.status === 'ready' && !notifiedSet.has(o.id)) {
            notifiedSet.add(o.id);
            Vibration.vibrate([1000, 500, 1000]);
            notifyOrderReady(o.id);
            showAlert('🔔 PI PI PI!', `O pedido ${o.id.slice(0, 5).toUpperCase()} está pronto e quentinho! Pode retirar.`);
          }
        });

        setMyOrders(ordersData);
      }, async (error) => {
        console.error('Erro ao ouvir meus pedidos em tempo real — reconectando:', error);
        if (stopped) return;
        try { await auth.currentUser?.getIdToken(true); } catch (e) { /* ignora, tenta mesmo assim */ }
        setTimeout(() => { if (!stopped) start(); }, 3000);
      });
    };

    start();

    return () => {
      stopped = true;
      if (currentUnsubscribe) currentUnsubscribe();
    };
  }, []);

  const lastOrder = myOrders[0];

  const handleRepeatOrder = () => {
    if (!lastOrder?.items?.length) return;
    const repeatedCart = lastOrder.items.map(item => ({
      id: item.productId,
      name: item.name,
      price: item.unit_price_at_time_of_sale,
      quantity: item.quantity,
    }));
    const repeatedTotal = repeatedCart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    navigation.navigate('Cart', { cart: repeatedCart, cartTotal: repeatedTotal });
  };

  const getStatusText = (status) => {
    if (status === 'received') return 'Pedido Recebido (Aguardando Confirmação)';
    if (status === 'preparing') return 'No Fogo 🔥 (Fritando)';
    if (status === 'ready') return 'Pronto para Retirar ✅';
    if (status === 'completed') return 'Retirado ✅';
    return 'Desconhecido';
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>Pedido {item.id.slice(0, 5).toUpperCase()}</Text>
        <Text style={styles.totalText}>R$ {item.total?.toFixed(2).replace('.', ',')}</Text>
      </View>

      <View style={styles.itemsList}>
        {item.items?.map((prod, i) => (
          <Text key={i} style={styles.itemRow}>• {prod.quantity}x {prod.name}</Text>
        ))}
      </View>

      <View style={styles.statusBox}>
        <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header title="Meus Pedidos" onBack={() => navigation.goBack()} />

      {lastOrder && (
        <View style={styles.repeatBox}>
          <Button title="🔁 Repetir último pedido" variant="outline" onPress={handleRepeatOrder} />
        </View>
      )}

      {myOrders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ color: colors.textSecondary }}>Você ainda não fez pedidos hoje.</Text>
        </View>
      ) : (
        <FlatList
          data={myOrders}
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
  list: { padding: spacing.lg },
  repeatBox: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.md, ...shadows.card },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  orderId: { fontSize: 16, fontWeight: '900', color: colors.text },
  totalText: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  itemsList: { marginBottom: spacing.md },
  itemRow: { fontSize: 14, color: colors.textSecondary, marginBottom: 4 },
  statusBox: { backgroundColor: '#FFF5EB', padding: spacing.sm, borderRadius: radii.sm, alignItems: 'center' },
  statusText: { fontSize: 14, fontWeight: 'bold', color: colors.primary },
});
