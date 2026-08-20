import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Vibration } from 'react-native';
import { colors, spacing, radii } from '../../theme';
import { db, auth } from '../../services/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

export default function ClientOrderStatusScreen({ navigation }) {
  const [myOrders, setMyOrders] = useState([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'orders'), 
      where('client_id', '==', auth.currentUser.uid),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Simulação de Push Notification in-app se algum pedido acabou de ficar pronto
      const hasNewlyReady = ordersData.find(o => o.status === 'ready' && !o.notified);
      if (hasNewlyReady) {
        Vibration.vibrate([1000, 500, 1000]);
        Alert.alert('🔔 PI PI PI!', 'Seu pastel está pronto e quentinho! Pode ir retirar no balcão.');
        // Aqui poderíamos marcar como notified no banco para não apitar duas vezes
      }

      setMyOrders(ordersData);
    });

    return () => unsubscribe();
  }, []);

  const getStatusText = (status) => {
    if (status === 'received') return 'Pedido Recebido (Aguardando Confirmação)';
    if (status === 'preparing') return 'No Fogo 🔥 (Fritando)';
    if (status === 'ready') return 'Pronto para Retirar ✅';
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
          <Text key={i} style={styles.itemRow}>• {prod.name}</Text>
        ))}
      </View>

      <View style={styles.statusBox}>
        <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Cardápio</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meus Pedidos</Text>
      </View>

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
  header: { paddingTop: 60, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
  backButton: { fontSize: 16, color: colors.primary, marginBottom: spacing.sm, fontWeight: 'bold' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  list: { padding: spacing.lg },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  orderId: { fontSize: 16, fontWeight: '900', color: colors.text },
  totalText: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  itemsList: { marginBottom: spacing.md },
  itemRow: { fontSize: 14, color: colors.textSecondary, marginBottom: 4 },
  statusBox: { backgroundColor: '#FFF5EB', padding: spacing.sm, borderRadius: radii.sm, alignItems: 'center' },
  statusText: { fontSize: 14, fontWeight: 'bold', color: colors.primary },
});
