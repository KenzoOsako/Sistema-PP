import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, radii, shadows } from '../../theme';
import Header from '../../components/Header';
import { subscribeToOrders } from '../../adapters/OrderAdapter';

// ETAPA 3 (23/08/2026) — filtro de período. Antes só existia "hoje", e o
// Paulinho comentou que fica difícil enxergar como o negócio foi na última
// semana/mês sem ficar comparando dia a dia de cabeça. As três opções usam
// JANELA MÓVEL (últimas N horas/dias a partir de AGORA), não calendário
// (não é "segunda a domingo" nem "dia 1 ao 30") — mais simples de calcular
// certo e mais direto de entender: "7 dias" sempre quer dizer os últimos 7
// dias corridos, não importa em que dia da semana o Paulinho está olhando.
const PERIODS = [
  { key: 'today', label: 'Hoje' },
  { key: 'week', label: '7 dias' },
  { key: 'month', label: '30 dias' },
];

const PERIOD_LABELS = {
  today: 'hoje',
  week: 'nos últimos 7 dias',
  month: 'nos últimos 30 dias',
};

export default function AdminDashboardScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [period, setPeriod] = useState('today');

  useEffect(() => {
    const unsubscribe = subscribeToOrders(setOrders);
    return () => unsubscribe();
  }, []);

  // Calculos para o Dashboard
  const isInPeriod = (timestamp, p) => {
    if (!timestamp?.toDate) return false;
    const date = timestamp.toDate();
    if (p === 'today') return date.toDateString() === new Date().toDateString();
    const days = p === 'week' ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return date >= cutoff;
  };

  // "Pedidos no período" = tudo que foi CRIADO na janela escolhida,
  // incluindo os marcados como "Cliente Não Retirou" (ver
  // docs/feature-bloqueio-no-show.md) — é uma contagem operacional (quantos
  // pedidos entraram), não financeira.
  const todayOrders = orders.filter(o => isInPeriod(o.created_at, period));

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
  const paidLateToday = orders.filter(o => o.status === 'no_show' && o.debt_resolved === 'paid' && isInPeriod(o.debt_resolved_at, period));

  // Dívida perdoada no período (aba Bloqueados → "Perdoar Dívida"): nunca
  // vira venda, mas o custo do ingrediente já gasto e jogado fora precisa
  // aparecer como prejuízo, também na data em que foi perdoado.
  const forgivenToday = orders.filter(o => o.status === 'no_show' && o.debt_resolved === 'forgiven' && isInPeriod(o.debt_resolved_at, period));

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

  const activePeriod = PERIODS.find(p => p.key === period);

  return (
    <View style={styles.container}>
      <Header title="Financeiro" onBack={() => navigation.goBack()} />

      <View style={styles.periodBar}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodTab, period === p.key && styles.periodTabActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.periodTabText, period === p.key && styles.periodTabTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>💰 VENDAS {period === 'today' ? 'DE HOJE' : `(${activePeriod.label.toUpperCase()})`}</Text>
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
            <Text style={styles.cardTitle}>{period === 'today' ? 'Pedidos Hoje' : 'Pedidos no Período'}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.bestSellerEyebrow}>🏆 MAIS VENDIDO {period === 'today' ? 'HOJE' : activePeriod.label.toUpperCase()}</Text>
          {bestSeller ? (
            <>
              <Text style={styles.bestSellerName} numberOfLines={2}>{bestSeller[0]}</Text>
              <Text style={styles.bestSellerCount}>{bestSeller[1]}x vendidos</Text>
            </>
          ) : (
            <Text style={styles.bestSellerEmpty}>Nenhuma venda ainda {PERIOD_LABELS[period]}</Text>
          )}
        </View>

        {totalLoss > 0 && (
          <View style={[styles.card, styles.lossCard]}>
            <Text style={styles.lossEyebrow}>⚠️ PREJUÍZO (NÃO COMPARECIMENTO)</Text>
            <Text style={styles.lossValue}>R$ {totalLoss.toFixed(2).replace('.', ',')}</Text>
            <Text style={styles.lossHint}>Custo de ingrediente de dívidas perdoadas {PERIOD_LABELS[period]}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  periodBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  periodTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodTabText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  periodTabTextActive: { color: colors.surface },
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
