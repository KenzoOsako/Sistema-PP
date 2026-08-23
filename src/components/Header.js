import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radii, shadows } from '../theme';

// App bar reutilizável usada em todas as telas — garante visual consistente
// (mesma altura, sombra e tipografia) em vez de repetir o header em cada screen.
//
// FASE 3 (22/08/2026), "header mais enxuto": a versão anterior empilhava 3
// camadas — uma faixa cheia reservando espaço fixo de status bar, o selo de
// data flutuando por cima em position:absolute, e só depois a linha de
// verdade com título/botões. Virou uma linha só, com o respiro do topo
// usando a safe-area REAL do aparelho (useSafeAreaInsets — mesma ideia já
// usada na tab bar do admin em App.js) em vez de uma faixa fixa que sobrava
// inteira no PWA/web, onde não existe barra de status nenhuma pra proteger.
//
// AJUSTE (mesma sessão, achado testando ao vivo): a primeira versão dessa
// mudança colocou o selo de data como um chip DENTRO do cluster da direita
// — competindo por espaço com os outros botões no mesmo flexbox, em vez de
// flutuar por cima sem ocupar espaço nenhum (como fazia antes). Resultado:
// o cluster da direita ficou mais largo, espremeu o título/subtítulo (que
// cortava com "..." no meio da frase) e os próprios botões da direita
// ficaram colados uns nos outros. Removido o chip de data (a data em si não
// é informação essencial — o próprio celular já mostra) pra devolver esse
// espaço; se fizer falta, dá pra reintroduzir mais pra frente sem competir
// pelo mesmo espaço (voltando a flutuar por cima, ou vivendo dentro do
// subtítulo).
export default function Header({ title, subtitle, onBack, right, logo, onLogout, onMenu }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.left}>
        {onBack && (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        )}
        {logo && (
          <Image source={require('../../assets/icon.png')} style={styles.logo} />
        )}
        <View style={styles.titleGroup}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>
      </View>
      {(right || onMenu || onLogout) && (
        <View style={styles.right}>
          {right}
          {onMenu && (
            <TouchableOpacity
              onPress={onMenu}
              style={styles.menuButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.menuIcon}>☰</Text>
            </TouchableOpacity>
          )}
          {onLogout && (
            <TouchableOpacity
              onPress={onLogout}
              style={styles.logoutButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.logoutText}>Sair</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.header,
  },
  left: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  backButton: { marginRight: spacing.sm, paddingVertical: 4 },
  backIcon: { fontSize: 22, color: colors.primary, fontWeight: '700' },
  logo: { width: 36, height: 36, borderRadius: radii.sm, marginRight: spacing.sm },
  titleGroup: { flexShrink: 1 },
  title: { fontSize: 20, fontWeight: '900', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  right: { flexShrink: 0, marginLeft: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  menuButton: { paddingVertical: 4 },
  menuIcon: { fontSize: 20, color: colors.text },
  logoutButton: { paddingVertical: 4 },
  logoutText: { fontSize: 13, color: colors.textSecondary, fontWeight: '700' },
});
