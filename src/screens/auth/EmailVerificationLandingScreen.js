import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing, radii, shadows } from '../../theme';
import Button from '../../components/Button';
import { completeEmailVerificationFromLink } from '../../adapters/AuthAdapter';

// ETAPA 3 (23/08/2026) — parte 2 do deep link de confirmação de e-mail: o
// e-mail agora é mandado com `handleCodeInApp: true` (ver
// AuthAdapter.getEmailActionCodeSettings), então o link aponta pra ESTA
// MESMA URL do PWA, com `?mode=verifyEmail&oobCode=...` na query string —
// em vez da página genérica e sem cara do Paulinho Pastel que o Firebase
// mostra por padrão. App.js detecta esses parâmetros ANTES de montar a
// navegação normal e renderiza só esta tela — ela existe só pra esse
// instante: aplica o código, avisa que deu certo, e devolve a pessoa pro
// app.
//
// A aba que realmente fica esperando a confirmação (RegisterScreen, logo
// depois do cadastro) NÃO depende de nada acontecer aqui pra continuar —
// ela fica de olho sozinha (polling) em auth.currentUser.emailVerified e
// segue pro app assim que detectar a mudança, mesmo que essa aba aqui (a
// que o link abriu, normalmente uma aba nova do navegador/app de e-mail)
// seja simplesmente fechada em seguida. Por isso o botão abaixo é só uma
// cortesia pra quem clicou aqui sem ter mais a aba original aberta.
export default function EmailVerificationLandingScreen({ oobCode }) {
  const [status, setStatus] = useState('confirming'); // 'confirming' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    completeEmailVerificationFromLink(oobCode)
      .then(() => { if (!cancelled) setStatus('success'); })
      .catch((e) => {
        if (cancelled) return;
        console.error(e);
        setStatus('error');
        setErrorMessage(
          e.code === 'auth/invalid-action-code'
            ? 'Esse link já foi usado ou expirou. Se sua conta já aparecer confirmada no app, pode ignorar — senão, peça pra reenviar o e-mail.'
            : 'Não deu pra confirmar agora. Tenta de novo em instantes.'
        );
      });
    return () => { cancelled = true; };
  }, [oobCode]);

  const goToApp = () => {
    // Recarrega o PWA na URL limpa (sem os parâmetros do link de e-mail) —
    // mais simples e confiável do que tentar "religar" pra dentro da
    // navegação normal por dentro do React a partir daqui.
    if (typeof window !== 'undefined') {
      window.location.href = window.location.origin + '/';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {status === 'confirming' && (
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.title}>Confirmando seu e-mail...</Text>
          </>
        )}
        {status === 'success' && (
          <>
            <View style={styles.successCircle}>
              <Text style={styles.successCheck}>✓</Text>
            </View>
            <Text style={styles.title}>E-mail confirmado!</Text>
            <Text style={styles.subtitle}>
              Sua conta já está liberada pra fazer pedidos. Se você deixou a aba do
              cadastro aberta, ela já deve estar entrando no app sozinha.
            </Text>
            <Button title="Voltar pro app" onPress={goToApp} style={styles.button} />
          </>
        )}
        {status === 'error' && (
          <>
            <Text style={styles.title}>Ops</Text>
            <Text style={styles.subtitle}>{errorMessage}</Text>
            <Button title="Voltar pro app" onPress={goToApp} style={styles.button} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    ...shadows.card,
  },
  successCircle: { width: 72, height: 72, borderRadius: radii.full, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  successCheck: { fontSize: 36, color: colors.surface, fontWeight: '900' },
  title: { fontSize: 20, fontWeight: '900', color: colors.text, marginTop: spacing.md, marginBottom: spacing.xs, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg, lineHeight: 20 },
  button: { width: '100%' },
});
