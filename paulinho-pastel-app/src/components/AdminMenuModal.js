import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { colors, spacing, radii, shadows } from '../theme';
import { subscribeToStoreStatus, setStoreOpen } from '../adapters/StoreStatusAdapter';
import { logout } from '../adapters/AuthAdapter';
import { showAlert } from '../utils/showAlert';

// Menu "tudo em um" da área admin (Fase 3). Cardápio/Financeiro/Bloqueados
// deixaram de ser abas fixas na barra de baixo — só a Fila fica sempre
// visível (é a tela que o Paulinho realmente olha o dia inteiro). O resto
// vive aqui atrás do ☰ do header da Fila, junto com o interruptor de loja
// aberta/fechada e Sair, em vez de espalhar "gestão" em vários lugares.
export default function AdminMenuModal({ visible, onClose, navigation }) {
  const [storeOpen, setStoreOpenState] = useState(true);
  const [togglingStore, setTogglingStore] = useState(false);

  // Só assina o status da loja enquanto o menu está de fato aberto — não
  // faz sentido manter esse listener vivo o tempo todo só pra desenhar um
  // Switch que ninguém está vendo.
  useEffect(() => {
    if (!visible) return undefined;
    const unsubscribe = subscribeToStoreStatus(setStoreOpenState);
    return () => unsubscribe();
  }, [visible]);

  const goTo = (screen) => {
    onClose();
    navigation.navigate(screen);
  };

  const handleToggleStore = async (value) => {
    setTogglingStore(true);
    try {
      await setStoreOpen(value);
    } catch (e) {
      console.error(e);
      showAlert('Erro', e.message || 'Não deu pra mudar o status da loja agora. Tenta de novo.');
    } finally {
      setTogglingStore(false);
    }
  };

  const handleLogout = async () => {
    onClose();
    await logout();
    // Este menu só existe dependurado na Fila, que agora é uma Stack.Screen
    // direta (sem Tab.Navigator por cima — ver App.js), então dá pra
    // resetar direto na navigation recebida, sem precisar de getParent().
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        {/* Pressionar dentro do cartão do menu não pode fechar ele por
            engano (o TouchableOpacity de fora fecha em qualquer toque no
            backdrop) — este aqui só existe pra "engolir" esse toque. */}
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
          <View style={styles.storeRow}>
            <View style={styles.storeTextGroup}>
              <Text style={styles.storeLabel}>{storeOpen ? 'Loja aberta 🟢' : 'Loja fechada 🔴'}</Text>
              <Text style={styles.storeHint}>
                {storeOpen ? 'Clientes conseguem fazer pedido.' : 'Cardápio visível, mas ninguém consegue pedir.'}
              </Text>
            </View>
            {togglingStore ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Switch
                value={storeOpen}
                onValueChange={handleToggleStore}
                trackColor={{ false: colors.border, true: colors.success }}
                thumbColor={colors.surface}
              />
            )}
          </View>

          <View style={styles.divider} />

          <MenuItem emoji="📋" label="Cardápio" onPress={() => goTo('AdminMenu')} />
          <MenuItem emoji="📊" label="Financeiro" onPress={() => goTo('AdminDashboard')} />
          <MenuItem emoji="🔒" label="Bloqueados" onPress={() => goTo('AdminBlocked')} />

          <View style={styles.divider} />

          <MenuItem emoji="🚪" label="Sair" danger onPress={handleLogout} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function MenuItem({ emoji, label, onPress, danger }) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <Text style={styles.itemEmoji}>{emoji}</Text>
      <Text style={[styles.itemLabel, danger && styles.itemLabelDanger]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(26,26,26,0.4)', alignItems: 'flex-end' },
  // marginTop aproximado pra encostar logo abaixo do header (Header.js não
  // expõe a própria altura pra medir de verdade — mesmo tipo de valor
  // aproximado já usado em SECTION_HEADER_HEIGHT no ClientMenuScreen).
  sheet: {
    marginTop: 96,
    marginRight: spacing.lg,
    width: 270,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.sm,
    ...shadows.card,
  },
  storeRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm },
  storeTextGroup: { flex: 1, marginRight: spacing.sm },
  storeLabel: { fontSize: 14, fontWeight: '800', color: colors.text },
  storeHint: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
  },
  itemEmoji: { fontSize: 16, marginRight: spacing.sm },
  itemLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  itemLabelDanger: { color: colors.alert },
});
