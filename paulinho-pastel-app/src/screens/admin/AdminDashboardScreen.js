import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, radii, shadows } from '../../theme';
import Header from '../../components/Header';
import { subscribeToOrders } from '../../adapters/OrderAdapter';
import { logout } from '../../adapters/AuthAdapter';

export default function AdminDashboardScreen({ navigation }) {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToOrders(setOrders);
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  // Calculos para o Dashboard
  const isToday = (timestamp) => {
    if (!timestamp?.toDate) return false;
    return timestamp.toDate().toDateString() === new Date().toDateString();
  };

  // "Pedidos Hoje" = tudo que foi CRIADO hoje, incluindo os marcados como
  // "Cliente Não Retirou" (ver docs/feature-bloqueio-no-show.md) — é uma
  // contagem operacional (quantos pedidos entraram), não financeira.
  const todayOrders = orders.filter(o => isToday(o.created_at));

  // Pedidos "no_show" (cliente não retirou/pagou) NÃO contam como venda
  // enquanto a dívida não for resolvida — o dinheiro simplesmente não
  // entrou. Os que já eram Pix (sem dívida) saem de 'received/preparing/
  // ready' direto pra 'no_show' sem passar por 'completed', mas já foram
  // pagos de verdade, então continuam contando normalmente aqui.
  const salesToday = todayOrders.filter(o => o.status !== 'no_show');

  // Dívida quitada DEPOIS (aba Bloqueados → "Pago ✅"): conta como venda no
  // dia da QUITAÇÃO, não no dia original do pedido — por isso filtra por
  // debt_resolved_at e não por created_at, mesmo que o pedido em si seja de
  // outro dia.
  const paidLateToday = orders.filter(o => o.status === 'no_show' && o.debt_resolved === 'paid' && isToday(o.debt_resolved_at));

  // Dívida perdoada hoje (aba Bloqueados → "Perdoar Dívida"): nunca vira
  // venda, mas o custo do ingrediente já gasto e jogado fora precisa
  // aparecer como prejuízo, também na data em que foi perdoado.
  const forgivenToday = orders.filter(o => o.status === 'no_show' && o.debt_resolved === 'forgiven' && isToday(o.debt_resolved_at));

  const salesEligible = [...salesToday, ...paidLateToday];

  const totalSales = salesEligible.reduce((sum, o) => sum + (o.total || 0), 0);

  // Corrige o bug antigo: soma a QUANTIDADE de cada item, não o número de linhas do pedido
  // (um pedido com 3x do mesmo pastel deve contar como 3, não como 1).
  const totalItemsSold = salesEligible.reduce((sum, o) => {
    if (!o.items) return sum;
    return sum + o.items.reduce((itemSum, item) => itemSum + (item.quantity || 1), 0);
  }, 0);

  // Lucro = soma de (preço - custo) * quantidade, usando o snapshot salvo no momento da venda
  const totalProfit = salesEligible.reduce((sum, o) => {
    if (!o.items) return sum;
    return sum + o.items.reduce((itemSum, item) => {
      const price = item.unit_price_at_time_of_sale || 0;
      const cost = item.unit_cost_at_time_of_sale || 0;
      return itemSum + (price - cost) * (item.quantity || 1);
    }, 0);
  }, 0);

  // Prejuízo por não comparecimento: soma só o CUSTO (não o preço de venda,
  // que nunca chegou a entrar) dos itens de pedidos perdoados hoje.
  const totalLoss = forgivenToday.reduce((sum, o) => {
    if (!o.items) return sum;
    return sum + o.items.reduce((itemSum, item) => itemSum + (item.unit_cost_at_time_of_sale || 0) * (item.quantity || 1), 0);
  }, 0);

  // Conta tanto "ready" (pronto, aguardando retirada) quanto "completed"
  // (já marcado como pago — ver AdminFilaScreen) como entregue, senão esse
  // número cai assim que o Paulinho limpa a fila com o botão "Pago ✅".
  const deliveredCount = salesEligible.filter(o => o.status === 'ready' || o.status === 'completed').length;
  const margin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

  // Pastel mais vendido do dia (por quantidade)
  const salesByProduct = {};
  salesEligible.forEach(o => {
    (o.items || []).forEach(item => {
      salesByProduct[item.name] = (salesByProduct[item.name] || 0) + (item.quantity || 1);
    });
  });
  const bestSeller = Object.entries(salesByProduct).sort((a, b) => b[1] - a[1])[0];

  return (
    <View style={styles.container}>
      <Header title="Financeiro Hoje 📊" logo onLogout={handleLogout} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>💰 VENDAS DE HOJE</Text>
          <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>
            R$ {totalSales.toFixed(2).replace('.', ',')}
          </Text>
          <View style={styles.heroFooter}>
            <Text style={styles.heroFooterText}>Lucro: R$ {totalProfit.toFixed(2).replace('.', ',')}</Text>
            <View style={styles.heroDot} />
            <Text style={styles.heroFooterText}>Margem: {margin.toFixed(0)}%</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.card, styles.statCard]}>
            <Text style={styles.statIcon}>✅</Text>
            <Text style={styles.cardValue}>{deliveredCount}</Text>
            <Text style={styles.cardTitle}>Entregues</Text>
          </View>

          <View style={[styles.card, styles.statCard]}>
            <Text style={styles.statIcon}>🥟</Text>
            <Text style={styles.cardValue}>{totalItemsSold}</Text>
            <Text style={styles.cardTitle}>Pastéis Vendidos</Text>
          </View>

          <View style={[styles.card, styles.statCard]}>
            <Text style={styles.statIcon}>📦</Text>
            <Text style={styles.cardValue}>{todayOrders.length}</Text>
            <Text style={styles.cardTitle}>Pedidos Hoje</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.bestSellerEyebrow}>🏆 MAIS VENDIDO HOJE</Text>
          {bestSeller ? (
            <>
              <Text style={styles.bestSellerName} numberOfLines={2}>{bestSeller[0]}</Text>
              <Text style={styles.bestSellerCount}>{bestSeller[1]}x vendidos</Text>
            </>
          ) : (
            <Text style={styles.bestSellerEmpty}>Nenhuma venda ainda hoje</Text>
          )}
        </View>

        {totalLoss > 0 && (
          <View style={[styles.card, styles.lossCard]}>
            <Text style={styles.lossEyebrow}>⚠️ PREJUÍZO (NÃO COMPARECIMENTO)</Text>
            <Text style={styles.lossValue}>R$ {totalLoss.toFixed(2).replace('.', ',')}</Text>
            <Text style={styles.lossHint}>Custo de ingrediente de dívidas perdoadas hoje</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  // Sem "flex: 1" aqui, o ScrollView não sabia sua própria altura no web e
  // crescia junto com o conteúdo em vez de rolar internamente — resultado:
  // uma barra de rolagem "extra" (a da página inteira, por fora do app),
  // além da barra normal da lista. Travando a altura no container pai, só
  // sobra a rolagem interna esperada.
  scroll: { flex: 1 },
  content: { padding: spacing.lg },
  heroCard: {
    backgroundColor: colors.text,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  heroLabel: { fontSize: 12, fontWeight: '800', color: '#B8B4AF', letterSpacing: 0.6 },
  heroValue: { fontSize: 40, fontWeight: '900', color: colors.primary, marginTop: spacing.sm },
  heroFooter: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  heroFooterText: { fontSize: 13, color: '#E5E1DC', fontWeight: '600' },
  heroDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#6B6862', marginHorizontal: spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...shadows.card,
  },
  statCard: { flex: 1, marginBottom: 0, alignItems: 'center', paddingVertical: spacing.md },
  statIcon: { fontSize: 20, marginBottom: spacing.xs },
  cardTitle: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  cardValue: { fontSize: 24, fontWeight: '900', color: colors.primary },
  bestSellerEyebrow: { fontSize: 11, fontWeight: '800', color: colors.primary, letterSpacing: 0.6 },
  bestSellerName: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
  bestSellerCount: { fontSize: 14, fontWeight: '700', color: colors.primary, marginTop: 4 },
  bestSellerEmpty: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.sm },
  lossCard: { borderLeftColor: colors.alert },
  lossEyebrow: { fontSize: 11, fontWeight: '800', color: colors.alert, letterSpacing: 0.6 },
  lossValue: { fontSize: 24, fontWeight: '900', color: colors.alert, marginTop: spacing.sm },
  lossHint: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
});
