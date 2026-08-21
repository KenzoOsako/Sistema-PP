import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, spacing, radii, shadows } from '../../theme';
import Button from '../../components/Button';
import Header from '../../components/Header';
import { subscribeToProducts, createProduct, updateProduct, deleteProduct } from '../../adapters/ProductAdapter';
import { logout } from '../../adapters/AuthAdapter';
import { showAlert } from '../../utils/showAlert';

// Cardápio real da barraca do Paulinho (tirado direto da placa física).
// Cadastrar isso de verdade aqui resolve o pedido "somar R$ 0,00" (o preço
// é sempre recalculado a partir do banco) e alinha o app com os preços
// cobrados de verdade no balcão.
//
// "cost" é uma ESTIMATIVA de custo por unidade — não é só o ingrediente.
// É: massa + óleo + embalagem (uma base fixa de ~R$1,40 por pastel) +
// recheio específico de cada sabor + um rateio de custo indireto (gás,
// trailer/equipamento, transporte até o ponto) dividido pelo volume mensal
// estimado (~3.750 pastéis/mês). O Paulinho pode ajustar qualquer um
// depois direto pela tela de edição — isso aqui é só uma aproximação
// realista pro relatório de margem não ficar fantasioso, nunca afeta o
// preço cobrado do cliente.
const CARDAPIO_PADRAO = [
  // --- Salgados ---
  { name: 'Carne', price: 10, cost: 3.2, category: 'Salgados' },
  { name: 'Carne com Queijo', price: 12, cost: 3.8, category: 'Salgados' },
  { name: 'Carne com Catupiry', price: 12, cost: 4.0, category: 'Salgados' },
  { name: 'Frango com Queijo', price: 12, cost: 3.6, category: 'Salgados' },
  { name: 'Frango com Catupiry', price: 12, cost: 3.8, category: 'Salgados' },
  { name: 'Queijo', price: 10, cost: 2.8, category: 'Salgados' },
  { name: 'Queijo com Catupiry', price: 12, cost: 3.6, category: 'Salgados' },
  { name: 'Presunto e Queijo', price: 10, cost: 2.9, category: 'Salgados' },
  { name: 'Calabresa com Queijo', price: 12, cost: 3.7, category: 'Salgados' },
  { name: 'Calabresa com Catupiry', price: 12, cost: 3.9, category: 'Salgados' },
  { name: 'Palmito', price: 10, cost: 3.3, category: 'Salgados' },
  { name: 'Palmito com Queijo', price: 13, cost: 4.1, category: 'Salgados' },
  { name: 'Palmito com Catupiry', price: 13, cost: 4.3, category: 'Salgados' },
  { name: 'Brócolis com Queijo', price: 13, cost: 3.7, category: 'Salgados' },
  { name: 'Brócolis com Catupiry', price: 13, cost: 3.9, category: 'Salgados' },
  // --- Doces (Nutella pesa mais no custo que os salgados) ---
  { name: 'Nutella', price: 12, cost: 4.5, category: 'Doces' },
  { name: 'Nutella com M&M', price: 15, cost: 5.8, category: 'Doces' },
  { name: 'Leite Ninho', price: 12, cost: 3.6, category: 'Doces' },
  { name: 'Doce de Leite com Banana e Canela', price: 15, cost: 3.9, category: 'Doces' },
];

const emptyForm = { name: '', desc: '', price: '', cost: '' };

export default function AdminMenuScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null); // null = cadastrando novo
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null); // pausar/excluir em andamento nesse item
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToProducts(setProducts);
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const openNewForm = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEditForm = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name || '',
      desc: product.desc || '',
      price: String(product.price ?? '').replace('.', ','),
      cost: product.cost ? String(product.cost).replace('.', ',') : '',
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingProduct(null);
    setForm(emptyForm);
  };

  const handleSaveProduct = async () => {
    if (!form.name || !form.price) {
      showAlert('Erro', 'Nome e Preço são obrigatórios!');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        desc: form.desc,
        price: parseFloat(form.price.replace(',', '.')),
        cost: form.cost ? parseFloat(form.cost.replace(',', '.')) : 0,
      };
      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
        showAlert('Sucesso', 'Pastel atualizado!');
      } else {
        await createProduct(payload);
        showAlert('Sucesso', 'Pastel adicionado ao cardápio ao vivo!');
      }
      closeForm();
    } catch (error) {
      showAlert('Erro', error.message);
    } finally {
      setSaving(false);
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

  const handleToggleActive = async (product) => {
    setBusyId(product.id);
    try {
      await updateProduct(product.id, { active: product.active === false });
    } catch (error) {
      showAlert('Erro ao pausar/ativar', error.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteProduct = async (product) => {
    setBusyId(product.id);
    try {
      await deleteProduct(product.id);
    } catch (error) {
      showAlert('Erro ao remover', error.message);
    } finally {
      setBusyId(null);
    }
  };

  const renderItem = ({ item }) => {
    const paused = item.active === false;
    const isBusy = busyId === item.id;
    return (
      <View style={[styles.card, paused && styles.cardPaused]}>
        <View style={styles.cardInfo}>
          <View style={styles.cardNameRow}>
            <Text style={[styles.productName, paused && styles.textPaused]}>{item.name}</Text>
            {paused && (
              <View style={styles.pausedBadge}>
                <Text style={styles.pausedBadgeText}>PAUSADO</Text>
              </View>
            )}
          </View>
          {!!item.desc && <Text style={styles.productDesc}>{item.desc}</Text>}
          <Text style={[styles.productPrice, paused && styles.textPaused]}>R$ {item.price.toFixed(2).replace('.', ',')}</Text>
          {!!item.cost && (
            <Text style={styles.productCost}>
              Custo R$ {item.cost.toFixed(2).replace('.', ',')} · Margem R$ {(item.price - item.cost).toFixed(2).replace('.', ',')}
            </Text>
          )}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => openEditForm(item)} disabled={isBusy}>
            <Text style={styles.actionIcon}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleToggleActive(item)} disabled={isBusy}>
            {isBusy ? <ActivityIndicator size="small" color={colors.textSecondary} /> : <Text style={styles.actionIcon}>{paused ? '▶️' : '⏸️'}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleDeleteProduct(item)} disabled={isBusy}>
            <Text style={styles.actionIcon}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Cardápio Ao Vivo"
        logo
        onLogout={handleLogout}
        right={
          !formOpen && (
            <TouchableOpacity style={styles.newButton} onPress={openNewForm}>
              <Text style={styles.newButtonText}>+ Novo Pastel</Text>
            </TouchableOpacity>
          )
        }
      />

      {formOpen && (
        <View style={styles.form}>
          <View style={styles.formHeader}>
            <Text style={styles.formEyebrow}>{editingProduct ? 'EDITAR PASTEL' : 'NOVO PASTEL'}</Text>
            <TouchableOpacity onPress={closeForm}>
              <Text style={styles.formCancel}>Cancelar</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.label}>Nome</Text>
          <TextInput style={styles.input} placeholder="Ex: Pastel de Carne" placeholderTextColor={colors.placeholder} value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} />
          <Text style={styles.label}>Descrição</Text>
          <TextInput style={styles.input} placeholder="Ex: Carne e ovo" placeholderTextColor={colors.placeholder} value={form.desc} onChangeText={v => setForm(f => ({ ...f, desc: v }))} />
          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Text style={styles.label}>Preço de venda</Text>
              <TextInput style={styles.input} placeholder="9,50" placeholderTextColor={colors.placeholder} keyboardType="numeric" value={form.price} onChangeText={v => setForm(f => ({ ...f, price: v }))} />
            </View>
            <View style={styles.rowItem}>
              <Text style={styles.label}>Custo</Text>
              <TextInput style={styles.input} placeholder="3,20" placeholderTextColor={colors.placeholder} keyboardType="numeric" value={form.cost} onChangeText={v => setForm(f => ({ ...f, cost: v }))} />
            </View>
          </View>
          {saving ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Button title={editingProduct ? 'Salvar alterações' : 'Cadastrar Pastel'} onPress={handleSaveProduct} />
          )}
        </View>
      )}

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
  newButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    ...shadows.button,
  },
  newButtonText: { color: colors.surface, fontWeight: '700', fontSize: 13 },
  form: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  formEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.6,
  },
  formCancel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
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
  cardPaused: { opacity: 0.6 },
  cardInfo: { flex: 1 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  productName: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  textPaused: { color: colors.textSecondary },
  pausedBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  pausedBadgeText: { fontSize: 9, fontWeight: '800', color: colors.text, letterSpacing: 0.4 },
  productDesc: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  productPrice: { fontSize: 16, color: colors.primary, fontWeight: 'bold', marginTop: 4 },
  productCost: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.xs, marginLeft: spacing.sm },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: { fontSize: 14 },
});
