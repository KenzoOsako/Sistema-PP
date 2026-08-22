import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, radii, shadows } from '../../theme';
import Header from '../../components/Header';
import { logout } from '../../adapters/AuthAdapter';

// Tela de aviso pra cliente com a conta bloqueada (ver
// docs/feature-bloqueio-no-show.md). Substitui o cardápio normal — o
// cliente não tem acesso ao resto do app enquanto estiver bloqueado, só
// vê o "recibo" do pedido que gerou o bloqueio e uma mensagem explicando
// a situação. `blockedOrderSnapshot` vem direto do LoginScreen (já
// carregado no getAccountStatus do login), sem precisar de uma segunda
// leitura ao Firestore.
export default function ClientBlockedScreen({ navigation, route }) {
  const snapshot = route?.params?.blockedOrderSnapshot;

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const getOrderDate = () => {
    if (!snapshot?.created_at?.toDate) return '';
    return snapshot.created_at.toDate().toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      <Header title="Conta Bloqueada" logo onLogout={handleLogout} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.warningCircle}>
          <Text style={styles.warningEmoji}>🔒</Text>
        </View>
        <Text style={styles.title}>Sua conta está bloqueada</Text>
        <Text style={styles.message}>
          Você fez o pedido abaixo e não retirou/pagou. Regularize com o
          Paulinho pra voltar a usar o app.
        </Text>

        {snapshot && (
          <View style={styles.receiptCard}>
            <Text style={styles.receiptEyebrow}>RECIBO DO PEDIDO</Text>
            {!!getOrderDate() && <Text style={styles.receiptDate}>{getOrderDate()}</Text>}
            <View style={styles.receiptItems}>
              {(snapshot.items || []).map((item, i) => (
                <Text key={i} style={styles.receiptItemRow}>
                  • {item.quantity}x {item.name}
                </Text>
              ))}
            </View>
            <View style={styles.receiptTotalRow}>
              <Text style={styles.receiptTotalLabel}>Total</Text>
              <Text style={styles.receiptTotalValue}>
                R$ {(snapshot.total || 0).toFixed(2).replace('.', ',')}
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.footerHint}>
          Fale com o Paulinho diretamente na barraca pra resolver.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, alignItems: 'center', paddingBottom: spacing.xxl },
  warningCircle: {
    width: 80, height: 80, borderRadius: radii.full,
    backgroundColor: colors.alert, alignItems: 'center', justifyContent: 'center',
    marginTop: spacing.lg, marginBottom: spacing.md,
  },
  warningEmoji: { fontSize: 36 },
  title: { fontSize: 20, fontWeight: '900', color: colors.text, marginBottom: spacing.sm, textAlign: 'center' },
  message: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg, paddingHorizontal: spacing.md },
  receiptCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    width: '100%',
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  receiptEyebrow: { fontSize: 11, fontWeight: '800', color: colors.primary, letterSpacing: 0.6 },
  receiptDate: { fontSize: 12, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.sm },
  receiptItems: {
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
  },
  receiptItemRow: { fontSize: 14, color: colors.text, marginBottom: 4 },
  receiptTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptTotalLabel: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  receiptTotalValue: { fontSize: 20, fontWeight: '900', color: colors.primary },
  footerHint: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
});
