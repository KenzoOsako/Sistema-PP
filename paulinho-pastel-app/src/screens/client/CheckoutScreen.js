import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { colors, spacing, radii } from '../../theme';
import Button from '../../components/Button';

export default function CheckoutScreen({ route, navigation }) {
  const { cartTotal } = route.params;

  // Chave Pix do Paulinho (mock)
  const pixKey = 'paulinho@pastel.com.br';

  const handleConfirmOrder = () => {
    // Aqui enviaremos o pedido para o Firebase (Fila do Admin)
    Alert.alert('Sucesso!', 'Seu pedido foi enviado para a cozinha! Acompanhe o status.');
    // Volta pro Menu limpo (ou para uma tela de Status de Pedido)
    navigation.reset({
      index: 0,
      routes: [{ name: 'ClientMenu' }],
    });
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
          <Text style={styles.pixTitle}>Chave Pix (E-mail)</Text>
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
        <Button 
          title="Já paguei, enviar pedido!"
          onPress={handleConfirmOrder}
        />
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
