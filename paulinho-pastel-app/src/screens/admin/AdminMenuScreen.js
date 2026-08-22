import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, SectionList, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { colors, spacing, radii, shadows } from '../../theme';
import Button from '../../components/Button';
import Header from '../../components/Header';
import { subscribeToProducts, createProduct, updateProduct, deleteProduct } from '../../adapters/ProductAdapter';
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

// Ordem fixa das categorias na aba e no agrupamento — mesma lista e mesma
// lógica de fallback do ClientMenuScreen.js (produto sem categoria salva,
// ex.: cadastrado antes deste campo existir, cai em "Salgados").
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

const emptyForm = { name: '', desc: '', price: '', cost: '', category: 'Salgados' };

export default function AdminMenuScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null); // null = cadastrando novo
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null); // pausar/excluir em andamento nesse item
  const [seeding, setSeeding] = useState(false);
  // Navegação por abas Salgados/Doces — mesmo padrão validado e testado no
  // ClientMenuScreen.js (ver comentário grande de handleTabPress abaixo).
  // Duplicado de propósito em vez de compartilhado: essa lógica já levou 3
  // tentativas pra acertar do lado do cliente e tem um teste E2E dedicado
  // (scripts/e2e-menu-tabs.js) — mexer nela pra "generalizar" arriscava
  // quebrar o que já está validado. Se um bug aparecer aqui, é bem provável
  // que seja o mesmo bug lá, então corrija dos dois lados.
  const [activeCategory, setActiveCategory] = useState(CATEGORY_ORDER[0]);
  const sectionListRef = React.useRef(null);
  const suppressViewabilityRef = React.useRef(false);

  useEffect(() => {
    const unsubscribe = subscribeToProducts(setProducts);
    return () => unsubscribe();
  }, []);

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
      category: product.category === 'Doces' ? 'Doces' : 'Salgados',
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingProduct(null);
    setForm(emptyForm);
  };

  // Funções de rolagem — cópia intencional das mesmas funções do
  // ClientMenuScreen.js (ver comentário lá): `container.scrollTo({top,
  // behavior:'smooth'})` não funciona no ScrollView web deste app, então a
  // rolagem suave é feita à mão via requestAnimationFrame, mutando
  // `scrollTop` direto. A "âncora" (primeiro item de cada seção) é medida
  // em vez do cabeçalho (que é `position: sticky` e corrompe
  // getBoundingClientRect depois de grudar uma vez).
  const SECTION_HEADER_HEIGHT = 56;

  const smoothScrollTo = (el, targetTop, duration = 350) => {
    const startTop = el.scrollTop;
    const delta = targetTop - startTop;
    if (Math.abs(delta) < 1) return;
    suppressViewabilityRef.current = true;
    const startTime = performance.now();
    const step = (now) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.scrollTop = startTop + delta * eased;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setTimeout(() => { suppressViewabilityRef.current = false; }, 150);
      }
    };
    requestAnimationFrame(step);
  };

  const getWebScrollContainer = () => {
    const candidates = document.querySelectorAll('div');
    for (const el of candidates) {
      const style = getComputedStyle(el);
      if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
        return el;
      }
    }
    return document.scrollingElement;
  };

  // BUG ENCONTRADO E CORRIGIDO (teste ao vivo, sessão 22/08/2026, ver mesmo
  // comentário/correção no ClientMenuScreen.js): tocar na aba logo que a
  // tela monta pode acontecer antes da VirtualizedList terminar de
  // desenhar os itens mais pra baixo — a âncora daquela seção ainda não
  // existe no DOM, e o clique virava um no-op silencioso. Tenta de novo
  // algumas vezes com um respiro curto antes de desistir.
  // Janela de retry ajustada depois de testar ao vivo (ver mesmo comentário
  // no ClientMenuScreen.js): 20 tentativas de 150ms = até 3s de janela.
  const scrollToAnchorWithRetry = (category, container, attemptsLeft = 20) => {
    const anchor = document.getElementById(`admin-menu-section-anchor-${category}`);
    if (anchor) {
      const targetTop = anchor.getBoundingClientRect().top
        - container.getBoundingClientRect().top
        + container.scrollTop
        - SECTION_HEADER_HEIGHT;
      smoothScrollTo(container, Math.max(0, targetTop));
      return;
    }
    if (attemptsLeft <= 0) return;
    setTimeout(() => scrollToAnchorWithRetry(category, container, attemptsLeft - 1), 150);
  };

  const handleTabPress = (category, sections) => {
    setActiveCategory(category);

    if (Platform.OS === 'web') {
      const container = getWebScrollContainer();
      if (!container) return;

      if (category === CATEGORY_ORDER[0]) {
        smoothScrollTo(container, 0);
        return;
      }

      scrollToAnchorWithRetry(category, container);
      return;
    }

    const sectionIndex = sections.findIndex(s => s.title === category);
    if (sectionIndex === -1 || !sectionListRef.current) return;
    sectionListRef.current.scrollToLocation({
      sectionIndex,
      itemIndex: 0,
      viewPosition: 0,
      animated: true,
    });
  };

  const handleViewableItemsChanged = React.useRef(({ viewableItems }) => {
    if (suppressViewabilityRef.current) return;
    let lastSection = null;
    for (const v of viewableItems) {
      if (v.section) lastSection = v.section;
    }
    if (lastSection) setActiveCategory(lastSection.title);
  }).current;

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
        category: form.category === 'Doces' ? 'Doces' : 'Salgados',
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

  const sections = groupByCategory(products);

  const renderSectionHeader = ({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <View style={styles.sectionUnderline} />
    </View>
  );

  const renderItem = ({ item, index, section }) => {
    const paused = item.active === false;
    const isBusy = busyId === item.id;
    return (
      <View
        style={[styles.card, paused && styles.cardPaused]}
        // Âncora pra rolagem das abas (ver handleTabPress) — só no primeiro
        // item de cada seção, mesmo padrão do ClientMenuScreen.js.
        nativeID={index === 0 ? `admin-menu-section-anchor-${section.title}` : undefined}
      >
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
        onBack={() => navigation.goBack()}
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
          <Text style={styles.label}>Categoria</Text>
          <View style={styles.categoryToggle}>
            {CATEGORY_ORDER.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryOption, form.category === cat && styles.categoryOptionActive]}
                onPress={() => setForm(f => ({ ...f, category: cat }))}
              >
                <Text style={[styles.categoryOptionText, form.category === cat && styles.categoryOptionTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
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
        <>
          <View style={styles.tabBar}>
            {CATEGORY_ORDER.filter(cat => sections.some(s => s.title === cat)).map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.tab, activeCategory === cat && styles.tabActive]}
                onPress={() => handleTabPress(cat, sections)}
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
            // CAUSA RAIZ do bug de clique em aba não rolar (achado em teste
            // ao vivo, sessão 22/08/2026): por padrão a VirtualizedList por
            // baixo do SectionList só desenha ~10 itens de cara e NÃO
            // completa sozinha com o tempo (testado: 5s parado sem crescer
            // nada) — só cresce rolando de verdade. Isso deixava a âncora
            // de "Doces" fora do DOM até o usuário já ter rolado até lá na
            // mão, o que nunca acontece bem no fluxo (é justamente o botão
            // que deveria levar até lá). Cardápio de barraca de pastel é
            // pequeno (não passa de umas poucas dezenas de itens) — mais
            // seguro e simples mandar desenhar tudo de uma vez do que
            // depender de timing de virtualização pra uma lista tão curta.
            initialNumToRender={50}
          />
        </>
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
  categoryToggle: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  categoryOption: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryOptionText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  categoryOptionTextActive: { color: colors.surface },
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
