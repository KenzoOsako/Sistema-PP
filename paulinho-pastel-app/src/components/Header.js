import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radii, shadows } from '../theme';

const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function todayParts() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return { weekday: WEEKDAYS_SHORT[now.getDay()], date: `${dd}/${mm}` };
}

// App bar reutilizável usada em todas as telas — garante visual consistente
// (mesma altura, sombra e tipografia) em vez de repetir o header em cada screen.
//
// FASE 3 (22/08/2026), "header mais enxuto": a versão anterior empilhava 3
// camadas pra montar isso — uma faixa cheia reservando espaço fixo de status
// bar, o selo de data flutuando por cima em position:absolute, e só depois a
// linha de verdade com título/botões. Virou uma linha só: o selo de data
// agora é um chip pequeno dentro do próprio cluster da direita (junto dos
// outros botões), e o respiro do topo usa a safe-area REAL do aparelho
// (useSafeAreaInsets — mesma ideia já usada na tab bar do admin em App.js)
// em vez de uma faixa fixa que sobrava inteira no PWA/web, onde não existe
// barra de status nenhuma pra proteger.
//
// IMPORTANTE: isso muda o visual aprovado pelo Paulinho (o selo em meia-lua
// vira um chip simples) — manda um print pra ele antes de considerar essa
// tela "no ar de vez", do mesmo jeito que foi feito da última vez que esse
// componente mudou de cara.
export default function Header({ title, subtitle, onBack, right, logo, onLogout, onMenu }) {
  const insets = useSafeAreaInsets();
  const { weekday, date } = todayParts();
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
      <View style={styles.right}>
        <View style={styles.dateChip}>
          <Text style={styles.dateChipText}>{weekday} {date}</Text>
        </View>
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
  right: { flexShrink: 0, marginLeft: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dateChip: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  dateChipText: { fontSize: 11, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.3 },
  menuButton: { paddingVertical: 4 },
  menuIcon: { fontSize: 20, color: colors.text },
  logoutButton: { paddingVertical: 4 },
  logoutText: { fontSize: 13, color: colors.textSecondary, fontWeight: '700' },
});
