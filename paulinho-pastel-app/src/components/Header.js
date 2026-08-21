import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
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
// O selo de data era uma faixa retangular full-width (aprovada como "fora do
// design" pelo Paulinho — preview enviado e aprovado antes de mexer aqui,
// já que este componente é compartilhado por TODAS as telas). Virou um selo
// em meia-lua centralizado, "pendurado" por cima do header em vez de dividir
// a tela em faixas.
export default function Header({ title, subtitle, onBack, right, logo, onLogout }) {
  const { weekday, date } = todayParts();
  return (
    <View style={styles.container}>
      <View style={styles.statusBarSpacer} />
      <View style={styles.dateBadge}>
        <Text style={styles.dateBadgeDay}>{weekday}</Text>
        <Text style={styles.dateBadgeNum}>{date}</Text>
      </View>
      <View style={styles.header}>
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
        {(right || onLogout) && (
          <View style={styles.right}>
            {right}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative' },
  // Espaço reservado full-width pra área de status bar/notch — o selo por
  // cima é só um acento visual, não substitui essa área de segurança.
  statusBarSpacer: { height: 44, backgroundColor: colors.surface },
  dateBadge: {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: [{ translateX: -60 }],
    width: 120,
    height: 56,
    backgroundColor: colors.primaryDark,
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 9,
    zIndex: 20,
    ...shadows.button,
  },
  dateBadgeDay: {
    color: '#FFE3CC',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  dateBadgeNum: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '900',
  },
  header: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
    ...shadows.header,
  },
  left: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  backButton: { marginRight: spacing.sm, paddingVertical: 4 },
  backIcon: { fontSize: 22, color: colors.primary, fontWeight: '700' },
  logo: { width: 36, height: 36, borderRadius: radii.sm, marginRight: spacing.sm },
  titleGroup: { flexShrink: 1 },
  title: { fontSize: 20, fontWeight: '900', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  right: { flexShrink: 0, marginLeft: spacing.sm, flexDirection: 'row', alignItems: 'center' },
  logoutButton: { marginLeft: spacing.md, paddingVertical: 4 },
  logoutText: { fontSize: 13, color: colors.textSecondary, fontWeight: '700' },
});
