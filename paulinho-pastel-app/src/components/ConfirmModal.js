import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, radii, shadows } from '../theme';

// Modal de confirmação com duas ações (Cancelar/Confirmar) — diferente do
// AppAlertModal (que só tem OK e é um singleton global via alertBus, pensado
// pra avisos, não pra decisões). Usado nas ações "de duas mãos" da feature
// de bloqueio (ver docs/feature-bloqueio-no-show.md): marcar que o cliente
// não retirou, e perdoar uma dívida — ambas geram efeito real (bloqueio de
// conta, prejuízo no Financeiro) e merecem uma confirmação explícita antes
// de disparar.
export default function ConfirmModal({ visible, title, message, confirmLabel = 'Confirmar', danger, onConfirm, onCancel }) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.box}>
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}
          <View style={styles.row}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, danger ? styles.dangerButton : styles.confirmButton]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmButtonText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
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
  row: { flexDirection: 'row', gap: spacing.sm },
  button: {
    flex: 1,
    borderRadius: radii.full,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  cancelButton: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  cancelButtonText: { color: colors.textSecondary, fontWeight: '700', fontSize: 15 },
  confirmButton: { backgroundColor: colors.primary },
  dangerButton: { backgroundColor: colors.alert },
  confirmButtonText: { color: colors.surface, fontWeight: '700', fontSize: 15 },
});
