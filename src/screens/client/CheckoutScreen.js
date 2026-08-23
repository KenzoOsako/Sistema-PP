import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors, spacing, radii, shadows } from '../../theme';
import Button from '../../components/Button';
import Header from '../../components/Header';
import { createOrder } from '../../adapters/OrderAdapter';
import { subscribeToStoreStatus } from '../../adapters/StoreStatusAdapter';
import { generatePixPayload, toDictPhoneKey } from '../../utils/pixEmv';
import { maskPhone } from '../../utils/phoneMask';
import { PIX_KEY, PIX_MERCHANT_NAME, PIX_MERCHANT_CITY } from '../../config';
import { showAlert } from '../../utils/showAlert';

export default function CheckoutScreen({ route, navigation }) {
  const { cartTotal, cart } = route.params;
  const [loading, setLoading] = useState(false);
  // Loja aberta/fechada (Fase 3): checagem ao vivo aqui também, além do
  // aviso já mostrado lá no Cardápio — cobre o caso raro do Paulinho
  // fechar a loja bem no meio do checkout, com o cliente já nessa tela.
  const [storeOpen, setStoreOpen] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToStoreStatus(setStoreOpen);
    return () => unsubscribe();
  }, []);

  // Chave crua (só dígitos, sem +55) — é o que copiamos pro clipboard, já
  // que é assim que a maioria dos apps de banco espera colar uma chave de
  // telefone digitada manualmente.
  const pixKey = PIX_KEY;
  // Versão bonita pra exibir na tela: (19) 98701-1974.
  const pixKeyDisplay = maskPhone(pixKey);
  const pixPayload = generatePixPayload({
    // O payload EMV do QR precisa do formato internacional (+55...) exigido
    // pelo DICT do Banco Central — só aqui, não na exibição/cópia.
    pixKey: toDictPhoneKey(pixKey),
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
      showAlert('Pedido enviado com sucesso! 🎉', 'O Paulinho já foi avisado. Acompanhe o status em Meus Pedidos.');
      navigation.reset({
        index: 0,
        routes: [{ name: 'ClientMenu' }, { name: 'ClientOrders' }],
      });
    } catch (error) {
      if (error.code === 'email-not-verified') {
        showAlert('Confirme seu email', error.message);
      } else if (error.code === 'store-closed') {
        showAlert('Loja fechada', error.message);
      } else {
        showAlert('Erro ao enviar pedido', error.message);
      }
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
          <Text style={styles.pixKey}>{pixKeyDisplay}</Text>
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

        {!storeOpen && (
          <View style={styles.closedBox}>
            <Text style={styles.closedText}>
              🔴 O Paulinho fechou a loja agora — não dá pra enviar esse pedido até reabrir.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <Button
            title={storeOpen ? 'Já paguei, enviar pedido!' : 'Loja fechada'}
            onPress={handleConfirmOrder}
            disabled={!storeOpen}
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
  closedBox: {
    marginTop: spacing.md,
    backgroundColor: '#FEF2F2',
    padding: spacing.md,
    borderRadius: radii.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.alert,
  },
  closedText: { color: colors.alert, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  footer: {
    padding: spacing.lg,
    paddingBottom: 40,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  }
});
