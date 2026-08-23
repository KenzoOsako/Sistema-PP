import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radii, shadows } from '../theme';
import { logout } from '../adapters/AuthAdapter';

const DRAWER_WIDTH = 280;

// ETAPA 2 (23/08/2026) — substitui o AdminMenuModal.js da Fase 3. Aquele era
// um dropdown pequeno encostado no canto direito (parecia mais um popover
// solto que um "menu do admin" de verdade) e trazia embutido um Switch pra
// abrir/fechar a loja — um único toque acidental ali (ou um dedo escorregando
// ao rolar) já mudava o status pra TODO cliente, sem nenhuma confirmação.
// Aqui: (1) virou um menu lateral de verdade, deslizando da ESQUERDA e
// ocupando a altura toda da tela — visual de app "profissional" de verdade,
// não um popover improvisado; (2) laranja (colors.primary), a cor de marca
// que tinha sumido do app desde que os ícones sempre-visíveis das abas fixas
// do admin saíram na Fase 3; (3) o controle de loja saiu daqui — agora é só
// mais um item de navegação ("Status da Loja"), que leva pra uma tela
// própria com confirmação explícita (ver AdminStoreStatusScreen.js) — dar
// esse peso a uma ação que afeta todo mundo não cabia dentro de um menu
// suspenso.
export default function AdminDrawerMenu({ visible, onClose, navigation }) {
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  // O <Modal> do RN não anima abertura/fechamento sozinho com animationType
  // "none" (usado aqui pra controlar a animação à mão via Animated) — esse
  // estado local mantém o Modal montado até a animação de SAÍDA terminar,
  // senão o painel some de golpe em vez de deslizar de volta pra fora.
  const [rendered, setRendered] = useState(visible);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, { toValue: -DRAWER_WIDTH, duration: 200, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setRendered(false));
    }
  }, [visible]);

  const goTo = (screen) => {
    onClose();
    navigation.navigate(screen);
  };

  const handleLogout = async () => {
    onClose();
    await logout();
    // Este menu só existe dependurado na Fila, que é uma Stack.Screen direta
    // (sem Tab.Navigator por cima — ver App.js), então dá pra resetar direto
    // na navigation recebida, sem precisar de getParent().
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  if (!rendered) return null;

  return (
    <Modal transparent animationType="none" visible={rendered} onRequestClose={onClose}>
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.drawer, { paddingTop: insets.top, transform: [{ translateX }] }]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Paulinho Pastel</Text>
            <Text style={styles.headerSubtitle}>Painel do administrador</Text>
          </View>

          <View style={styles.itemsGroup}>
            <DrawerItem emoji="🏪" label="Status da Loja" onPress={() => goTo('AdminStoreStatus')} />
            <DrawerItem emoji="🔎" label="Buscar Pedido" onPress={() => goTo('AdminOrderSearch')} />
            <DrawerItem emoji="📋" label="Cardápio" onPress={() => goTo('AdminMenu')} />
            <DrawerItem emoji="📊" label="Financeiro" onPress={() => goTo('AdminDashboard')} />
            <DrawerItem emoji="🔒" label="Bloqueados" onPress={() => goTo('AdminBlocked')} />
          </View>

          <View style={styles.footer}>
            <View style={styles.divider} />
            <DrawerItem emoji="🚪" label="Sair" danger onPress={handleLogout} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function DrawerItem({ emoji, label, onPress, danger }) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.itemEmoji}>{emoji}</Text>
      <Text style={[styles.itemLabel, danger && styles.itemLabelDanger]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26,26,26,0.45)' },
  drawer: {
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: colors.surface },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2, fontWeight: '600' },
  itemsGroup: { paddingTop: spacing.md, paddingHorizontal: spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
  },
  itemEmoji: { fontSize: 18, marginRight: spacing.md },
  itemLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  itemLabelDanger: { color: colors.alert },
  footer: { marginTop: 'auto', paddingHorizontal: spacing.sm, paddingBottom: spacing.xl },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: spacing.sm, marginHorizontal: spacing.md },
});
