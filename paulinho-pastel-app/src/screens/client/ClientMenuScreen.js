import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { colors, spacing, radii } from '../../theme';
import Button from '../../components/Button';

const MOCK_PRODUCTS = [
  { id: '1', name: 'Pastel de Carne', desc: 'Carne moída temperada, azeitona e ovo.', price: 9.00 },
  { id: '2', name: 'Pastel de Queijo', desc: 'Mussarela derretida, orégano.', price: 8.50 },
  { id: '3', name: 'Pastel Especial PP', desc: 'Frango, catupiry, bacon e milho.', price: 12.00 },
];

export default function ClientMenuScreen({ navigation }) {
  const [cart, setCart] = useState([]);

  const addToCart = (product) => {
    setCart([...cart, product]);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productDesc}>{item.desc}</Text>
        <Text style={styles.productPrice}>
          R$ {item.price.toFixed(2).replace('.', ',')}
        </Text>
      </View>
      <TouchableOpacity style={styles.addButton} onPress={() => addToCart(item)}>
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cardápio</Text>
        <Text style={styles.headerSubtitle}>Escolha seu pastel quentinho 🔥</Text>
      </View>

      <FlatList
        data={MOCK_PRODUCTS}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />

      {cart.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.cartInfo}>
            <Text style={styles.cartCount}>{cart.length} itens</Text>
            <Text style={styles.cartTotal}>R$ {cartTotal.toFixed(2).replace('.', ',')}</Text>
          </View>
          <Button 
            title="Ver Carrinho" 
            onPress={() => navigation.navigate('Cart', { cart, cartTotal })} 
            style={styles.cartButton}
          />
        </View>
      )}
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
    paddingBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  list: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  productDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.primary,
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  addButtonText: {
    color: colors.surface,
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cartInfo: {
    flex: 1,
  },
  cartCount: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  cartTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  cartButton: {
    width: 160,
  }
});
