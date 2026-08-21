import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { colors, spacing, radii, shadows } from '../../theme';
import Button from '../../components/Button';
import Header from '../../components/Header';
import { createOrder } from '../../adapters/OrderAdapter';
import { showAlert } from '../../utils/showAlert';

export default function CartScreen({ route, navigation }) {
  const { cart, cartTotal } = route.params;
  const [placingOrder, setPlacingOrder] = useState(false);

  const handlePayOnPickup = async () => {
    setPlacingOrder(true);
    try {
      await createOrder(cart, 'on_pickup');
      showAlert(
        'Pedido enviado com sucesso! 🎉',
        'Já está na fila do Paulinho. Pague com cartão ou dinheiro na retirada — acompanha o status aqui em Meus Pedidos.'
      );
      navigation.reset({ index: 0, routes: [{ name: 'ClientMenu' }, { name: 'ClientOrders' }] });
    } catch (error) {
      showAlert('Erro ao enviar pedido', error.message);
    } finally {
      setPlacingOrder(false);
    }
  };

  const renderItem = ({ item, index }) => (
    <View style={styles.card}>
      <Text style={styles.productName}>{item.quantity}x {item.name}</Text>
      <Text style={styles.productPrice}>
        R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header title="Seu Pedido" onBack={() => navigation.goBack()} />

      <FlatList
        data={cart}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total a pagar:</Text>
          <Text style={styles.totalValue}>
            R$ {cartTotal.toFixed(2).replace('.', ',')}
          </Text>
        </View>
        <Text style={styles.paymentLabel}>Forma de pagamento</Text>
        <Button
          title="Pagar com Pix"
          onPress={() => navigation.navigate('Checkout', { cart, cartTotal })}
          style={{ marginBottom: spacing.sm }}
        />
        <Button
          title={placingOrder ? 'Enviando...' : 'Cartão ou Dinheiro (retirada)'}
          variant="outline"
          onPress={handlePayOnPickup}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.card,
  },
  productName: { fontSize: 16, color: colors.text },
  productPrice: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  footer: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  totalLabel: { fontSize: 18, color: colors.textSecondary },
  totalValue: { fontSize: 24, fontWeight: '900', color: colors.text },
  paymentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  }
});
