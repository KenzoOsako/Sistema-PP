import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors, spacing, radii } from '../../theme';
import Button from '../../components/Button';
import { createOrder } from '../../adapters/OrderAdapter';

export default function CheckoutScreen({ route, navigation }) {
  const { cartTotal, cart } = route.params;
  const [loading, setLoading] = useState(false);

  const pixKey = 'paulinho@pastel.com.br';

  const handleConfirmOrder = async () => {
    setLoading(true);
    try {
      await createOrder(cart);
      Alert.alert('Sucesso!', 'Seu pedido foi enviado para a cozinha e já apitou pro Paulinho!');
      navigation.reset({
        index: 0,
        routes: [{ name: 'ClientMenu' }],
      });
    } catch (error) {
      Alert.alert('Erro ao enviar pedido', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pagamento</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.pixBox}>
          <Text style={styles.pixTitle}>QR Code Pix (E-mail)</Text>
          <View style={{ marginVertical: spacing.md }}>
            <QRCode 
              value={`00020126330014br.gov.bcb.pix0111${pixKey}5204000053039865404${cartTotal.toFixed(2)}5802BR5915Paulinho Pastel6009Sao Paulo62070503***6304`}
              size={150} 
            />
          </View>
          <Text style={styles.pixKey}>{pixKey}</Text>
          <Text style={styles.pixValue}>Valor: R$ {cartTotal.toFixed(2).replace('.', ',')}</Text>
          
          <Button 
            title="Copiar Chave Pix"
            variant="outline"
            style={{ marginTop: spacing.lg }}
            onPress={() => Alert.alert('Copiado!', 'Chave Pix copiada para a área de transferência.')}
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
  backButton: {
    fontSize: 16,
    color: colors.primary,
    marginBottom: spacing.sm,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  pixBox: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  pixTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  pixKey: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  pixValue: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
  },
  warningBox: {
    marginTop: spacing.xl,
    backgroundColor: '#FEF2F2',
    padding: spacing.md,
    borderRadius: radii.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.alert,
  },
  warningText: {
    color: colors.alert,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: 40,
    backgroundColor: colors.surface,
  }
});
