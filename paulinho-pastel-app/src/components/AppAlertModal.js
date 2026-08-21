import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, radii, shadows } from '../theme';
import { setAlertListener } from '../utils/alertBus';

// Substitui o Alert.alert() nativo (que não funciona na web) por um modal
// com a cara do app, usado em todas as telas via showAlert().
export default function AppAlertModal() {
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    setAlertListener((title, message) => setAlert({ title, message }));
    return () => setAlertListener(null);
  }, []);

  if (!alert) return null;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => setAlert(null)}>
      <View style={styles.backdrop}>
        <View style={styles.box}>
          <Text style={styles.title}>{alert.title}</Text>
          {!!alert.message && <Text style={styles.message}>{alert.message}</Text>}
          <TouchableOpacity style={styles.button} onPress={() => setAlert(null)}>
            <Text style={styles.buttonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26,26,26,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  box: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 360,
    ...shadows.card,
  },
  title: { fontSize: 18, fontWeight: '900', color: colors.text, marginBottom: spacing.xs },
  message: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.lg },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  buttonText: { color: colors.surface, fontWeight: '700', fontSize: 15 },
});
