import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, radii } from '../../theme';
import { subscribeToOrders } from '../../adapters/OrderAdapter';

export default function AdminDashboardScreen() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToOrders(setOrders);
    return () => unsubscribe();
  }, []);

  // Calculos para o Dashboard
  const todayOrders = orders.filter(o => {
    if (!o.created_at) return false;
    const today = new Date().toDateString();
    const orderDate = o.created_at.toDate().toDateString();
    return today === orderDate;
  });

  const totalSales = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalItemsSold = todayOrders.reduce((sum, o) => sum + (o.items ? o.items.length : 0), 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Financeiro Hoje 📊</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Vendas do Dia</Text>
          <Text style={styles.cardValue}>R$ {totalSales.toFixed(2).replace('.', ',')}</Text>
        </View>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pedidos Entregues</Text>
          <Text style={styles.cardValue}>{todayOrders.filter(o => o.status === 'ready').length}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pastéis Vendidos</Text>
          <Text style={styles.cardValue}>{totalItemsSold} unid.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: 60, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  content: { padding: spacing.lg },
  card: { backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radii.md, marginBottom: spacing.md, borderLeftWidth: 4, borderLeftColor: colors.primary, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardTitle: { fontSize: 16, color: colors.textSecondary },
  cardValue: { fontSize: 32, fontWeight: '900', color: colors.primary, marginTop: spacing.sm }
});
