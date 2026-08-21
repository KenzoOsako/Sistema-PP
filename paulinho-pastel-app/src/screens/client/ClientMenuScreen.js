import React, { useState } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity } from 'react-native';
import { colors, spacing, radii, shadows } from '../../theme';
import Button from '../../components/Button';
import Header from '../../components/Header';
import { subscribeToProducts } from '../../adapters/ProductAdapter';
import { logout } from '../../adapters/AuthAdapter';
import { showAlert } from '../../utils/showAlert';

// Cardápio real da barraca (mesmo usado no seed do admin), exibido aqui só
// como fallback pra demo nunca ficar vazia enquanto o Firestore não tem
// nenhum produto cadastrado ainda — ver isMockMenu abaixo.
const MOCK_PRODUCTS = [
  { id: 'mock-1', name: 'Carne', price: 10, category: 'Salgados' },
  { id: 'mock-2', name: 'Carne com Queijo', price: 12, category: 'Salgados' },
  { id: 'mock-3', name: 'Carne com Catupiry', price: 12, category: 'Salgados' },
  { id: 'mock-4', name: 'Frango com Queijo', price: 12, category: 'Salgados' },
  { id: 'mock-5', name: 'Frango com Catupiry', price: 12, category: 'Salgados' },
  { id: 'mock-6', name: 'Queijo', price: 10, category: 'Salgados' },
  { id: 'mock-7', name: 'Queijo com Catupiry', price: 12, category: 'Salgados' },
  { id: 'mock-8', name: 'Presunto e Queijo', price: 10, category: 'Salgados' },
  { id: 'mock-9', name: 'Calabresa com Queijo', price: 12, category: 'Salgados' },
  { id: 'mock-10', name: 'Calabresa com Catupiry', price: 12, category: 'Salgados' },
  { id: 'mock-11', name: 'Palmito', price: 10, category: 'Salgados' },
  { id: 'mock-12', name: 'Palmito com Queijo', price: 13, category: 'Salgados' },
  { id: 'mock-13', name: 'Palmito com Catupiry', price: 13, category: 'Salgados' },
  { id: 'mock-14', name: 'Brócolis com Queijo', price: 13, category: 'Salgados' },
  { id: 'mock-15', name: 'Brócolis com Catupiry', price: 13, category: 'Salgados' },
  { id: 'mock-16', name: 'Nutella', price: 12, category: 'Doces' },
  { id: 'mock-17', name: 'Nutella com M&M', price: 15, category: 'Doces' },
  { id: 'mock-18', name: 'Leite Ninho', price: 12, category: 'Doces' },
  { id: 'mock-19', name: 'Doce de Leite com Banana e Canela', price: 15, category: 'Doces' },
];

// Ordem fixa das categorias no cardápio, independente da ordem que os
// produtos chegam do Firestore (que não garante agrupamento).
const CATEGORY_ORDER = ['Salgados', 'Doces'];

function groupByCategory(products) {
  const buckets = {};
  products.forEach(p => {
    const cat = p.category === 'Doces' ? 'Doces' : 'Salgados';
    if (!buckets[cat]) buckets[cat] = [];
    buckets[cat].push(p);
  });
  return CATEGORY_ORDER
    .filter(cat => buckets[cat]?.length)
    .map(cat => ({ title: cat, data: buckets[cat] }));
}

export default function ClientMenuScreen({ navigation }) {
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState(CATEGORY_ORDER[0]);
  const sectionListRef = React.useRef(null);

  React.useEffect(() => {
    const unsubscribe = subscribeToProducts(setProducts);
    return () => unsubscribe();
  }, []);

  // Fallback pra demo: se o admin ainda não cadastrou produtos reais no Firestore,
  // mostra um cardápio mockado só pra não ficar vazio.
  const isMockMenu = products.length === 0;
  const displayProducts = products.length > 0 ? products : MOCK_PRODUCTS;
  const sections = groupByCategory(displayProducts);

  // Toque na aba "Salgados"/"Doces" pula direto pra seção — melhora a
  // navegação num cardápio com 19 itens (sem isso era só rolar tudo manual).
  const handleTabPress = (category) => {
    setActiveCategory(category);
    const sectionIndex = sections.findIndex(s => s.title === category);
    if (sectionIndex === -1 || !sectionListRef.current) return;
    sectionListRef.current.scrollToLocation({
      sectionIndex,
      itemIndex: 0,
      viewPosition: 0,
      animated: true,
    });
  };

  // Mantém a aba ativa em dia enquanto o usuário rola manualmente, sem
  // precisar tocar nas abas — mesmo padrão de apps de delivery.
  const handleViewableItemsChanged = React.useRef(({ viewableItems }) => {
    const firstSection = viewableItems.find(v => v.section)?.section;
    if (firstSection) setActiveCategory(firstSection.title);
  }).current;

  const addToCart = (product) => {
    // Os itens do MOCK_PRODUCTS têm ids fake ("mock-1"...) que não existem
    // de verdade no Firestore. Se um pedido fosse criado com eles,
    // OrderAdapter.createOrder não encontra o produto no banco e calcula o
    // total como R$ 0,00 (era exatamente o bug reportado). Por isso o
    // carrinho fica bloqueado enquanto o cardápio ainda é o mockado — assim
    // que o admin cadastrar os produtos de verdade, o cardápio real
    // substitui o mock automaticamente (tempo real) e o pedido volta a
    // funcionar normalmente.
    if (isMockMenu) {
      showAlert(
        'Cardápio ainda não disponível',
        'O Paulinho ainda não cadastrou os pastéis de verdade no sistema. Tente novamente em instantes.'
      );
      return;
    }
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.map(p => p.id === product.id ? { ...p, quantity: (p.quantity || 1) + 1 } : p);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const renderSectionHeader = ({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <View style={styles.sectionUnderline} />
    </View>
  );

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        {!!item.desc && <Text style={styles.productDesc}>{item.desc}</Text>}
        <Text style={styles.productPrice}>R$ {item.price.toFixed(2).replace('.', ',')}</Text>
      </View>
      <TouchableOpacity style={styles.addButton} onPress={() => addToCart(item)}>
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header
        title="Cardápio"
        subtitle="Pastéis artesanais, feitos na hora"
        logo
        onLogout={handleLogout}
        right={
          <TouchableOpacity style={styles.ordersButton} onPress={() => navigation.navigate('ClientOrders')}>
            <Text style={styles.ordersButtonText}>Pedidos</Text>
          </TouchableOpacity>
        }
      />
      <View style={styles.tabBar}>
        {CATEGORY_ORDER.filter(cat => sections.some(s => s.title === cat)).map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.tab, activeCategory === cat && styles.tabActive]}
            onPress={() => handleTabPress(cat)}
          >
            <Text style={[styles.tabText, activeCategory === cat && styles.tabTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <SectionList
        ref={sectionListRef}
        sections={sections}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        stickySectionHeadersEnabled
        contentContainerStyle={styles.list}
      />
      {cart.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.cartInfo}>
            <Text style={styles.cartCount}>{cart.reduce((sum, item) => sum + (item.quantity || 1), 0)} itens</Text>
            <Text style={styles.cartTotal}>R$ {cartTotal.toFixed(2).replace('.', ',')}</Text>
          </View>
          <Button title="Ver Carrinho" onPress={() => navigation.navigate('Cart', { cart, cartTotal })} style={styles.cartButton} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  ordersButton: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  ordersButtonText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  tabTextActive: { color: colors.surface },
  list: { padding: spacing.lg, paddingBottom: 100 },
  sectionHeader: {
    backgroundColor: colors.background,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  sectionUnderline: {
    width: 28,
    height: 3,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.card,
  },
  cardInfo: { flex: 1 },
  productName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4, letterSpacing: 0.2 },
  productDesc: { fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
  productPrice: { fontSize: 15, fontWeight: '900', color: colors.primary },
  addButton: {
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  addButtonText: { color: colors.surface, fontSize: 22, fontWeight: 'bold', lineHeight: 26 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cartInfo: { flex: 1 },
  cartCount: { fontSize: 14, color: colors.textSecondary },
  cartTotal: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  cartButton: { width: 160 },
});
