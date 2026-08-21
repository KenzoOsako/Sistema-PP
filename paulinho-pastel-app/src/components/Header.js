import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { colors, spacing, radii, shadows } from '../theme';

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function todayLabel() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${WEEKDAYS[now.getDay()]} · ${dd}/${mm}`;
}

// App bar reutilizável usada em todas as telas — garante visual consistente
// (mesma altura, sombra e tipografia) em vez de repetir o header em cada screen.
export default function Header({ title, subtitle, onBack, right, logo, onLogout }) {
  return (
    <View>
      <View style={styles.dateStrip}>
        <Text style={styles.dateStripText}>{todayLabel()}</Text>
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
  dateStrip: {
    backgroundColor: colors.primary,
    paddingTop: 44,
    paddingBottom: 8,
    alignItems: 'center',
  },
  dateStripText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
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
