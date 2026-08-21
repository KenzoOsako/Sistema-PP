import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors, spacing, radii, shadows } from '../../theme';
import Button from '../../components/Button';
import Header from '../../components/Header';
import { createOrder } from '../../adapters/OrderAdapter';
import { generatePixPayload } from '../../utils/pixEmv';
import { PIX_KEY, PIX_MERCHANT_NAME, PIX_MERCHANT_CITY } from '../../config';
import { showAlert } from '../../utils/showAlert';

export default function CheckoutScreen({ route, navigation }) {
  const { cartTotal, cart } = route.params;
  const [loading, setLoading] = useState(false);

  const pixKey = PIX_KEY;
  const pixPayload = generatePixPayload({
    pixKey,
    merchantName: PIX_MERCHANT_NAME,
    merchantCity: PIX_MERCHANT_CITY,
    amount: cartTotal,
  });

  const handleCopyPixKey = () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(pixKey).catch(() => {});
    }
    showAlert('Copiado!', 'Chave Pix copiada para a área de transferência.');
  };

  const handleConfirmOrder = async () => {
    setLoading(true);
    try {
      await createOrder(cart, 'pix');
      showAlert('Pedido enviado com sucesso! 🎉', 'Já apitou pro Paulinho. Acompanha o status aqui em Meus Pedidos.');
      navigation.reset({
        index: 0,
        routes: [{ name: 'ClientMenu' }, { name: 'ClientOrders' }],
      });
    } catch (error) {
      showAlert('Erro ao enviar pedido', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Pagamento" onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        <View style={styles.pixBox}>
          <Text style={styles.pixTitle}>QR Code Pix (Telefone)</Text>
          <View style={{ marginVertical: spacing.md }}>
            <QRCode
              value={pixPayload}
              size={150}
            />
          </View>
          <Text style={styles.pixKey}>{pixKey}</Text>
          <Text style={styles.pixValue}>Valor: R$ {cartTotal.toFixed(2).replace('.', ',')}</Text>

          <Button
            title="Copiar Chave Pix"
            variant="outline"
            style={{ marginTop: spacing.lg }}
            onPress={handleCopyPixKey}
          />
        </View>

        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            Transfira o valor exato. O Paulinho vai confirmar o recebimento na barraca para liberar a produção.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <Button
            title="Já paguei, enviar pedido!"
            onPress={handleConfirmOrder}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.lg },
  pixBox: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    ...shadows.card,
  },
  pixTitle: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.xs },
  pixKey: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: spacing.sm },
  pixValue: { fontSize: 18, fontWeight: '900', color: colors.primary },
  warningBox: {
    marginTop: spacing.xl,
    backgroundColor: '#FEF2F2',
    padding: spacing.md,
    borderRadius: radii.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.alert,
  },
  warningText: { color: colors.alert, fontSize: 14, lineHeight: 20 },
  footer: {
    padding: spacing.lg,
    paddingBottom: 40,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  }
});
