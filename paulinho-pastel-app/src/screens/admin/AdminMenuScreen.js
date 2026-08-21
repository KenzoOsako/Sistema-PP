import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, spacing, radii, shadows } from '../../theme';
import Button from '../../components/Button';
import Header from '../../components/Header';
import { subscribeToProducts, createProduct, deleteProduct } from '../../adapters/ProductAdapter';
import { logout } from '../../adapters/AuthAdapter';
import { showAlert } from '../../utils/showAlert';

// Cardápio real da barraca do Paulinho (tirado direto da placa física).
// Cadastrar isso de verdade aqui resolve o pedido "somar R$ 0,00" (o preço
// é sempre recalculado a partir do banco) e alinha o app com os preços
// cobrados de verdade no balcão.
//
// "cost" é uma ESTIMATIVA de custo de ingrediente (só pra alimentar o
// cálculo de margem no dashboard do admin) — o Paulinho pode ajustar
// excluindo e recadastrando o item com o custo real quando tiver esse
// número. Isso NUNCA afeta o preço cobrado do cliente, só o relatório.
const CARDAPIO_PADRAO = [
  // --- Salgados ---
  { name: 'Carne', price: 10, cost: 3.5, category: 'Salgados' },
  { name: 'Carne com Queijo', price: 12, cost: 4, category: 'Salgados' },
  { name: 'Carne com Catupiry', price: 12, cost: 4, category: 'Salgados' },
  { name: 'Frango com Queijo', price: 12, cost: 4, category: 'Salgados' },
  { name: 'Frango com Catupiry', price: 12, cost: 4, category: 'Salgados' },
  { name: 'Queijo', price: 10, cost: 3, category: 'Salgados' },
  { name: 'Queijo com Catupiry', price: 12, cost: 4, category: 'Salgados' },
  { name: 'Presunto e Queijo', price: 10, cost: 3.5, category: 'Salgados' },
  { name: 'Calabresa com Queijo', price: 12, cost: 4, category: 'Salgados' },
  { name: 'Calabresa com Catupiry', price: 12, cost: 4, category: 'Salgados' },
  { name: 'Palmito', price: 10, cost: 3.5, category: 'Salgados' },
  { name: 'Palmito com Queijo', price: 13, cost: 4.5, category: 'Salgados' },
  { name: 'Palmito com Catupiry', price: 13, cost: 4.5, category: 'Salgados' },
  { name: 'Brócolis com Queijo', price: 13, cost: 4.5, category: 'Salgados' },
  { name: 'Brócolis com Catupiry', price: 13, cost: 4.5, category: 'Salgados' },
  // --- Doces ---
  { name: 'Nutella', price: 12, cost: 5, category: 'Doces' },
  { name: 'Nutella com M&M', price: 15, cost: 6.5, category: 'Doces' },
  { name: 'Leite Ninho', price: 12, cost: 4.5, category: 'Doces' },
  { name: 'Doce de Leite com Banana e Canela', price: 15, cost: 5, category: 'Doces' },
];

export default function AdminMenuScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToProducts(setProducts);
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const handleAddProduct = async () => {
    if (!name || !price) {
      showAlert('Erro', 'Nome e Preço são obrigatórios!');
      return;
    }
    try {
      await createProduct({
        name,
        desc,
        price: parseFloat(price.replace(',', '.')),
        cost: cost ? parseFloat(cost.replace(',', '.')) : 0,
      });
      setName('');
      setDesc('');
      setPrice('');
      setCost('');
      showAlert('Sucesso', 'Pastel adicionado ao cardápio ao vivo!');
    } catch (error) {
      showAlert('Erro', error.message);
    }
  };

  const handleSeedCardapio = async () => {
    setSeeding(true);
    try {
      for (const item of CARDAPIO_PADRAO) {
        await createProduct(item);
      }
      showAlert('Cardápio criado!', 'Os pastéis padrão foram cadastrados de verdade no sistema.');
    } catch (error) {
      showAlert('Erro ao popular cardápio', error.message);
    } finally {
      setSeeding(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    setDeletingId(product.id);
    try {
      await deleteProduct(product.id);
    } catch (error) {
      showAlert('Erro ao remover', error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        {!!item.desc && <Text style={styles.productDesc}>{item.desc}</Text>}
        <Text style={styles.productPrice}>R$ {item.price.toFixed(2).replace('.', ',')}</Text>
        {!!item.cost && (
          <Text style={styles.productCost}>
            Custo R$ {item.cost.toFixed(2).replace('.', ',')} · Margem R$ {(item.price - item.cost).toFixed(2).replace('.', ',')}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={[styles.deleteButton, deletingId === item.id && { opacity: 0.5 }]}
        onPress={() => handleDeleteProduct(item)}
        disabled={deletingId === item.id}
      >
        <Text style={styles.deleteButtonText}>🗑</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header title="Cardápio Ao Vivo" logo onLogout={handleLogout} />

      <View style={styles.form}>
        <Text style={styles.formEyebrow}>NOVO PASTEL</Text>
        <Text style={styles.label}>Nome</Text>
        <TextInput style={styles.input} placeholder="Ex: Pastel de Carne" placeholderTextColor={colors.placeholder} value={name} onChangeText={setName} />
        <Text style={styles.label}>Descrição</Text>
        <TextInput style={styles.input} placeholder="Ex: Carne e ovo" placeholderTextColor={colors.placeholder} value={desc} onChangeText={setDesc} />
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Preço de venda</Text>
            <TextInput style={styles.input} placeholder="9,50" placeholderTextColor={colors.placeholder} keyboardType="numeric" value={price} onChangeText={setPrice} />
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Custo</Text>
            <TextInput style={styles.input} placeholder="3,20" placeholderTextColor={colors.placeholder} keyboardType="numeric" value={cost} onChangeText={setCost} />
          </View>
        </View>
        <Button title="Cadastrar Pastel" onPress={handleAddProduct} />
      </View>

      {products.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🥟</Text>
          <Text style={styles.emptyText}>Nenhum pastel cadastrado ainda.</Text>
          <Text style={styles.emptySubtext}>Sem produto real no sistema, os pedidos do cliente somam R$ 0,00.</Text>
          {seeding ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
          ) : (
            <TouchableOpacity style={styles.seedButton} onPress={handleSeedCardapio}>
              <Text style={styles.seedButtonText}>Carregar cardápio padrão ({CARDAPIO_PADRAO.length} pastéis)</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  form: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  formEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  rowItem: { flex: 1 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 6, color: colors.textSecondary },
  input: {
    backgroundColor: colors.background,
    height: 48,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  emptyEmoji: { fontSize: 40, marginBottom: spacing.sm },
  emptyText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  emptySubtext: { color: colors.textSecondary, fontSize: 13, marginTop: 4, textAlign: 'center' },
  seedButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.full,
    ...shadows.button,
  },
  seedButtonText: { color: colors.surface, fontWeight: '700', fontSize: 14 },
  list: { padding: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.card,
  },
  cardInfo: { flex: 1 },
  productName: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  productDesc: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  productPrice: { fontSize: 16, color: colors.primary, fontWeight: 'bold', marginTop: 4 },
  productCost: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  deleteButtonText: { fontSize: 16 },
});
