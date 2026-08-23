import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { colors, spacing, radii, shadows } from '../../theme';
import Button from '../../components/Button';
import Header from '../../components/Header';
import { createOrder } from '../../adapters/OrderAdapter';
import { showAlert } from '../../utils/showAlert';

export default function CartScreen({ route, navigation }) {
  // Estado local editável: o carrinho chega como uma FOTO do momento em que
  // "Ver Carrinho" foi tocado (route.params), mas agora dá pra tirar/ajustar
  // item aqui dentro — precisa virar estado de verdade, não só ler o param
  // direto. cartTotal também deixa de vir pronto por param e passa a ser
  // recalculado a cada mudança (ver abaixo).
  const [cart, setCart] = useState(route.params.cart);
  const [placingOrder, setPlacingOrder] = useState(false);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);

  // Ao sair desta tela (seta de voltar OU depois de enviar o pedido), o
  // ClientMenuScreen precisa saber do carrinho editado — ele é quem manda
  // esse cart pra cá em primeiro lugar, e continua "dono" do estado depois
  // que o cliente volta. Em vez de passar uma função pelos params (React
  // Navigation avisa que funções não são serializáveis), volta pra tela já
  // no stack com `navigate` + um param `updatedCart`, que o ClientMenuScreen
  // escuta e aplica (ver useEffect lá).
  const goBackWithUpdatedCart = (finalCart = cart) => {
    navigation.navigate('ClientMenu', { updatedCart: finalCart });
  };

  const increaseItem = (id) => {
    setCart(prev => prev.map(p => p.id === id ? { ...p, quantity: (p.quantity || 1) + 1 } : p));
  };

  // Encostar no "−" com quantidade 1 remove o item de vez, em vez de deixar
  // uma linha zerada/inútil na lista — é assim que a "opção de tirar do
  // carrinho" pedida acaba funcionando na prática, sem precisar de um botão
  // de lixeira separado só pra isso.
  const decreaseItem = (id) => {
    setCart(prev => {
      const target = prev.find(p => p.id === id);
      if (target && (target.quantity || 1) <= 1) {
        return prev.filter(p => p.id !== id);
      }
      return prev.map(p => p.id === id ? { ...p, quantity: (p.quantity || 1) - 1 } : p);
    });
  };

  const handlePayOnPickup = async () => {
    setPlacingOrder(true);
    try {
      await createOrder(cart, 'on_pickup');
      showAlert(
        'Pedido enviado com sucesso! 🎉',
        'Já está na fila do Paulinho. Pague com cartão ou dinheiro na retirada — acompanha o status aqui em Meus Pedidos.'
      );
      // Carrinho esvazia depois de um pedido enviado com sucesso — senão o
      // cliente volta pro Cardápio e o footer ainda mostra os itens que já
      // acabaram de virar um pedido de verdade.
      navigation.reset({ index: 0, routes: [{ name: 'ClientMenu', params: { updatedCart: [] } }, { name: 'ClientOrders' }] });
    } catch (error) {
      showAlert('Erro ao enviar pedido', error.message);
    } finally {
      setPlacingOrder(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>
          R$ {(item.price * (item.quantity || 1)).toFixed(2).replace('.', ',')}
        </Text>
      </View>
      <View style={styles.stepper}>
        <TouchableOpacity
          style={styles.stepButton}
          onPress={() => decreaseItem(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.stepButtonText}>{(item.quantity || 1) <= 1 ? '🗑' : '−'}</Text>
        </TouchableOpacity>
        <Text style={styles.stepQty}>{item.quantity || 1}</Text>
        <TouchableOpacity
          style={styles.stepButton}
          onPress={() => increaseItem(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.stepButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header title="Seu Pedido" onBack={() => goBackWithUpdatedCart()} />

      {cart.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyText}>Seu carrinho ficou vazio.</Text>
          <Button
            title="Voltar ao Cardápio"
            variant="outline"
            style={{ marginTop: spacing.lg, width: 220 }}
            onPress={() => goBackWithUpdatedCart([])}
          />
        </View>
      ) : (
        <>
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
              disabled={placingOrder}
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg },
  emptyEmoji: { fontSize: 40, marginBottom: spacing.sm },
  emptyText: { color: colors.textSecondary, fontSize: 15 },
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
  cardInfo: { flex: 1, marginRight: spacing.sm },
  productName: { fontSize: 16, color: colors.text },
  productPrice: { fontSize: 16, fontWeight: 'bold', color: colors.primary, marginTop: 2 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.xs,
  },
  stepButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonText: { fontSize: 15, fontWeight: '900', color: colors.primary },
  stepQty: { fontSize: 15, fontWeight: '800', color: colors.text, minWidth: 22, textAlign: 'center' },
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
