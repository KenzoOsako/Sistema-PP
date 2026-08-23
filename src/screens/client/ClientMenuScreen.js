import React, { useState } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, Platform } from 'react-native';
import { colors, spacing, radii, shadows } from '../../theme';
import Button from '../../components/Button';
import Header from '../../components/Header';
import { subscribeToProducts } from '../../adapters/ProductAdapter';
import { subscribeToStoreStatus } from '../../adapters/StoreStatusAdapter';
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

export default function ClientMenuScreen({ navigation, route }) {
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState(CATEGORY_ORDER[0]);
  // Loja aberta/fechada (Fase 3, ver src/adapters/StoreStatusAdapter.js) —
  // começa "true" de propósito (mesmo default do adapter/regra) pra não
  // piscar um banner de "fechado" falso no primeiro instante, antes do
  // primeiro snapshot chegar.
  const [storeOpen, setStoreOpen] = useState(true);
  const sectionListRef = React.useRef(null);

  React.useEffect(() => {
    const unsubscribe = subscribeToProducts(setProducts);
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    const unsubscribe = subscribeToStoreStatus(setStoreOpen);
    return () => unsubscribe();
  }, []);

  // CartScreen agora deixa tirar/ajustar item — quando o cliente volta de
  // lá, o carrinho editado chega aqui por route.params (ver
  // goBackWithUpdatedCart em CartScreen.js) em vez de uma função passada
  // pelos params (React Navigation avisa que funções não são
  // serializáveis). navigation.setParams limpa o param logo em seguida pra
  // não reaplicar o mesmo carrinho de novo se a tela ganhar foco outra vez
  // sem um novo valor ter chegado.
  React.useEffect(() => {
    if (route?.params?.updatedCart !== undefined) {
      setCart(route.params.updatedCart);
      navigation.setParams({ updatedCart: undefined });
    }
  }, [route?.params?.updatedCart]);

  // Fallback pra demo: se o admin ainda não cadastrou produtos reais no Firestore,
  // mostra um cardápio mockado só pra não ficar vazio.
  const isMockMenu = products.length === 0;
  // "Pausado" (active: false) = acabou o ingrediente etc. — some da vitrine
  // do cliente sem precisar excluir o cadastro (o admin reativa depois).
  const availableProducts = products.filter(p => p.active !== false);
  const displayProducts = products.length > 0 ? availableProducts : MOCK_PRODUCTS;
  const sections = groupByCategory(displayProducts);

  // Toque na aba "Salgados"/"Doces" pula direto pra seção — melhora a
  // navegação num cardápio com 19 itens (sem isso era só rolar tudo manual).
  //
  // BUG CORRIGIDO (2 tentativas anteriores não resolveram de vez — desta
  // vez foi reproduzido e confirmado com um teste real de navegador, não só
  // lendo o código, ver scripts/repro-tabs.js): com
  // `stickySectionHeadersEnabled`, o cabeçalho de cada seção vive dentro de
  // um `position: sticky`. Depois que um cabeçalho já "grudou" no topo pelo
  // menos uma vez, `getBoundingClientRect()` passa a reportar a posição
  // VISUAL grudada (sempre dentro da tela) em vez da posição real no
  // documento — então `scrollIntoView()` nele vira um no-op ("já tá
  // visível", pro navegador). Era por isso que "Doces" (nunca tinha grudado
  // ainda) funcionava mas "Salgados" (depois de passar por ele) não voltava
  // mais. A correção: nunca mede o cabeçalho (sticky) em si — mede o
  // primeiro ITEM de cada seção (nativeID `menu-section-anchor-*` no
  // renderItem abaixo), que fica em fluxo normal e nunca sofre esse
  // artefato, e rola manualmente o container até ele, descontando a altura
  // do cabeçalho fixo pra ele não ficar escondido atrás.
  const SECTION_HEADER_HEIGHT = 56; // aproximado — cabeçalho + sublinhado (ver styles.sectionHeader)

  // `container.scrollTo({top, behavior:'smooth'})` foi testado e confirmado
  // (via scripts/repro-tabs.js) que NÃO tem efeito nenhum no ScrollView
  // interno do react-native-web nesta versão — o valor simplesmente não
  // muda, silenciosamente. Atribuir `element.scrollTop = valor` direto
  // FUNCIONA (confirmado no mesmo teste). Essa função anima isso à mão via
  // requestAnimationFrame pra manter a rolagem suave sem depender da API
  // que não funciona aqui.
  const smoothScrollTo = (el, targetTop, duration = 350) => {
    const startTop = el.scrollTop;
    const delta = targetTop - startTop;
    if (Math.abs(delta) < 1) return;
    suppressViewabilityRef.current = true;
    const startTime = performance.now();
    const step = (now) => {
      const progress = Math.min(1, (now - startTime) / duration);
      // ease-out simples — começa rápido, desacelera no final
      const eased = 1 - Math.pow(1 - progress, 3);
      el.scrollTop = startTop + delta * eased;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        // Solta a trava só um pouco depois do fim da animação — dá tempo
        // do cálculo de visibilidade do SectionList (que roda alguns
        // frames atrasado) se estabilizar na posição final antes de voltar
        // a confiar nele pra rolagem manual.
        setTimeout(() => { suppressViewabilityRef.current = false; }, 150);
      }
    };
    requestAnimationFrame(step);
  };

  const getWebScrollContainer = () => {
    // O ScrollView interno do SectionList no react-native-web não expõe um
    // jeito estável de pegar o node real via ref nesta versão — em vez de
    // depender disso, identifica o container pelo que ele realmente É: o
    // único ancestral com overflow-y rolável dentro da tela.
    const candidates = document.querySelectorAll('div');
    for (const el of candidates) {
      const style = getComputedStyle(el);
      if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
        return el;
      }
    }
    return document.scrollingElement;
  };

  // Janela de retry ajustada depois de testar ao vivo (rede/dispositivo de
  // verdade, não só o navegador headless local): a demora real pra
  // VirtualizedList terminar de desenhar os itens de baixo passou de 2s em
  // alguns casos — bem mais que os 720ms testados localmente. 20 tentativas
  // de 150ms = até 3s de janela, ainda rápido pro usuário nem perceber.
  const scrollToAnchorWithRetry = (category, container, attemptsLeft = 20) => {
    const anchor = document.getElementById(`menu-section-anchor-${category}`);
    if (anchor) {
      const targetTop = anchor.getBoundingClientRect().top
        - container.getBoundingClientRect().top
        + container.scrollTop
        - SECTION_HEADER_HEIGHT;
      smoothScrollTo(container, Math.max(0, targetTop));
      return;
    }
    if (attemptsLeft <= 0) return; // desiste — mesmo comportamento de antes, só que só depois de tentar bastante
    setTimeout(() => scrollToAnchorWithRetry(category, container, attemptsLeft - 1), 150);
  };

  const handleTabPress = (category) => {
    setActiveCategory(category);

    if (Platform.OS === 'web') {
      const container = getWebScrollContainer();
      if (!container) return;

      // Primeira categoria: sempre é o topo absoluto do cardápio, sem
      // ambiguidade nenhuma — não precisa medir nada.
      if (category === CATEGORY_ORDER[0]) {
        smoothScrollTo(container, 0);
        return;
      }

      // BUG ENCONTRADO E CORRIGIDO (teste ao vivo, sessão 22/08/2026): se o
      // toque na aba acontece logo que a tela monta, a VirtualizedList por
      // baixo do SectionList ainda não renderizou de verdade os itens mais
      // pra baixo (ela desenha só um lote inicial e vai completando aos
      // poucos, mesmo sem o usuário rolar) — a âncora daquela seção ainda
      // não existe no DOM nesse instante, e o clique virava um no-op
      // silencioso. Em vez de desistir na primeira tentativa, tenta de novo
      // algumas vezes com um respiro curto — tempo de sobra pra lista
      // terminar de desenhar sem o usuário notar o atraso.
      scrollToAnchorWithRetry(category, container);
      return;
    }

    // iOS/Android nativo (fora do navegador): scrollToLocation funciona bem
    // de verdade, então usamos a API padrão do SectionList.
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
  //
  // BUG CORRIGIDO: pegava a PRIMEIRA seção entre as visíveis. Isso fazia a
  // aba voltar pra "Salgados" mesmo depois de já ter pulado pra "Doces" —
  // porque, com poucos itens em cada seção, é comum os últimos itens de
  // Salgados e o início de Doces ficarem visíveis ao mesmo tempo na tela, e
  // "primeiro visível" quase sempre cai num item de Salgados. Pegando a
  // ÚLTIMA seção entre as visíveis, a aba reflete a seção que o usuário
  // está entrando, que é o comportamento esperado tanto ao tocar a aba
  // quanto ao rolar manualmente.
  // Enquanto handleTabPress está rolando a lista programaticamente (clique
  // na aba), o cálculo interno de "itens visíveis" do SectionList fica
  // defasado em relação à posição real de scroll (fica alguns frames
  // atrás) — sem essa trava, ele chega a SOBRESCREVER de volta a aba certa
  // pra errada logo depois do clique (ex.: toca "Doces", a rolagem funciona,
  // mas a aba pisca de volta pra "Salgados" sozinha). Fica ligado só durante
  // a rolagem manual do usuário, que é o caso pra que esse rastreamento
  // realmente existe.
  const suppressViewabilityRef = React.useRef(false);

  const handleViewableItemsChanged = React.useRef(({ viewableItems }) => {
    if (suppressViewabilityRef.current) return;
    let lastSection = null;
    for (const v of viewableItems) {
      if (v.section) lastSection = v.section;
    }
    if (lastSection) setActiveCategory(lastSection.title);
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
    <View
      style={styles.sectionHeader}
      nativeID={`menu-section-${section.title}`}
    >
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <View style={styles.sectionUnderline} />
    </View>
  );

  const renderItem = ({ item, index, section }) => (
    <View
      style={styles.card}
      // Âncora usada por handleTabPress pra rolar até a seção certa (ver
      // comentário lá) — só no primeiro item de cada seção, e só existe de
      // verdade no DOM (web); nativo ignora nativeID desconhecido.
      nativeID={index === 0 ? `menu-section-anchor-${section.title}` : undefined}
    >
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
            <Text style={styles.ordersButtonText}>Meus Pedidos</Text>
          </TouchableOpacity>
        }
      />
      {!storeOpen && (
        <View style={styles.closedBanner}>
          <Text style={styles.closedBannerText}>
            🔴 Estamos fechados no momento. Dá pra ver o cardápio, mas não pra fechar pedido agora.
          </Text>
        </View>
      )}
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
        // Mesma causa raiz e correção do AdminMenuScreen.js (achado em
        // teste ao vivo, sessão 22/08/2026): a VirtualizedList por baixo do
        // SectionList só desenha ~10 itens de cara e não completa sozinha
        // com o tempo. Cardápio pequeno, mais seguro desenhar tudo de vez.
        initialNumToRender={50}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !isMockMenu ? (
            <View style={styles.pausedEmptyState}>
              <Text style={styles.pausedEmptyText}>Todos os pastéis estão pausados no momento. Volte em breve!</Text>
            </View>
          ) : null
        }
      />
      {cart.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.cartInfo}>
            <Text style={styles.cartCount}>{cart.reduce((sum, item) => sum + (item.quantity || 1), 0)} itens</Text>
            <Text style={styles.cartTotal}>R$ {cartTotal.toFixed(2).replace('.', ',')}</Text>
          </View>
          {/* De propósito NÃO desabilita esse botão quando a loja está
              fechada — "finalizar pedido" (o que a Fase 3 realmente trava)
              é a ação lá no Checkout ("Já paguei, enviar pedido!"), não
              esta aqui. O cliente continua podendo ver/ajustar o carrinho
              à vontade; só não consegue enviar o pedido de verdade
              enquanto a loja estiver fechada. */}
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
  closedBanner: {
    backgroundColor: '#FEF2F2',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closedBannerText: { color: colors.alert, fontSize: 12, fontWeight: '700', textAlign: 'center' },
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
  list: { padding: spacing.lg, paddingBottom: 100, flexGrow: 1 },
  pausedEmptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: spacing.xxl },
  pausedEmptyText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', paddingHorizontal: spacing.lg },
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
