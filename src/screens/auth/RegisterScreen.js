import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, TouchableOpacity } from 'react-native';
import Button from '../../components/Button';
import { colors, spacing, radii } from '../../theme';
import { register, refreshEmailVerifiedStatus, resendVerificationEmail, getAccountStatus, getCurrentUser } from '../../adapters/AuthAdapter';
import { maskPhone } from '../../utils/phoneMask';
import { showAlert } from '../../utils/showAlert';
import { deviceHadBlockedAccount } from '../../utils/deviceBlockMarker';

// ETAPA 3 (23/08/2026) — intervalo do polling que fica de olho se o email já
// foi confirmado enquanto a pessoa está na tela de espera abaixo (ver
// WaitingForVerification). 4s é frequente o suficiente pra parecer
// instantâneo assim que ela volta dessa aba pro app, sem gerar tráfego
// exagerado no Firebase Auth enquanto espera.
const VERIFICATION_POLL_MS = 4000;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  // Aviso (não bloqueia o cadastro) se esse mesmo aparelho já mostrou a
  // tela de "Conta Bloqueada" antes — ver src/utils/deviceBlockMarker.js.
  const [deviceWasBlocked] = useState(() => deviceHadBlockedAccount());
  // ETAPA 3 — estado da tela de espera pela confirmação de email (ver
  // WaitingForVerification abaixo).
  const [checkingNow, setCheckingNow] = useState(false);
  const [resendState, setResendState] = useState('idle'); // 'idle' | 'sending' | 'sent'
  const pollRef = useRef(null);

  // Assim que o email é confirmado (detectado pelo polling automático OU
  // pelo botão "Já confirmei"), decide pra onde mandar a pessoa do MESMO
  // jeito que o login normal decide (LoginScreen.navigateByRole) — ela já
  // está autenticada desde o cadastro (createUserWithEmailAndPassword loga
  // automaticamente), então não faz sentido mandar de volta pro formulário
  // de login pra digitar a senha de novo.
  const enterAppAfterVerification = async () => {
    const user = getCurrentUser();
    if (!user) return; // segurança: sem sessão, não tem pra onde navegar
    const { role, blocked, blockedOrderSnapshot } = await getAccountStatus(user.uid);
    if (role === 'admin') {
      navigation.reset({ index: 0, routes: [{ name: 'AdminFila' }] });
    } else if (blocked) {
      navigation.reset({ index: 0, routes: [{ name: 'ClientBlocked', params: { blockedOrderSnapshot } }] });
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'ClientMenu' }] });
    }
  };

  // Polling: a pessoa pode confirmar o email numa aba/aparelho diferente
  // desta mesma tela (ex.: abre o email no celular enquanto cadastrou no
  // PC) — sem checar sozinho de tempos em tempos, ela ficaria presa aqui
  // pra sempre até apertar "Já confirmei" manualmente.
  useEffect(() => {
    if (!success) return undefined;
    pollRef.current = setInterval(async () => {
      const verified = await refreshEmailVerifiedStatus();
      if (verified) {
        clearInterval(pollRef.current);
        enterAppAfterVerification();
      }
    }, VERIFICATION_POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [success]);

  const handleCheckNow = async () => {
    setCheckingNow(true);
    try {
      const verified = await refreshEmailVerifiedStatus();
      if (verified) {
        clearInterval(pollRef.current);
        await enterAppAfterVerification();
      } else {
        showAlert('Ainda não', 'Seu email ainda não foi confirmado. Já deu uma olhada no spam?');
      }
    } catch (e) {
      showAlert('Erro', 'Não deu pra checar agora. Tenta de novo em instantes.');
    } finally {
      setCheckingNow(false);
    }
  };

  const handleResend = async () => {
    setResendState('sending');
    try {
      await resendVerificationEmail();
      setResendState('sent');
      setTimeout(() => setResendState('idle'), 30000); // Firebase já limita o ritmo por conta própria
    } catch (e) {
      setResendState('idle');
      showAlert('Erro ao reenviar', e.message?.includes('too-many-requests')
        ? 'Espera um pouquinho antes de pedir outro reenvio.'
        : (e.message || 'Não deu pra reenviar agora.'));
    }
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !phone || !password) {
      showAlert('Erro', 'Preencha todos os campos!');
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      showAlert('E-mail inválido', 'Digite um e-mail válido, ex: nome@exemplo.com');
      return;
    }
    if (password.length < 6) {
      showAlert('Senha muito curta', 'A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (!acceptedTerms) {
      showAlert('Falta aceitar os termos', 'Marque a caixinha de termos e condições pra criar a conta.');
      return;
    }
    setLoading(true);
    try {
      await register({ name, email, phone, password });
      setLoading(false);
      setSuccess(true);
    } catch (error) {
      setLoading(false);
      if (error.code === 'phone-already-registered') {
        showAlert('Ops', 'Este telefone já está cadastrado. Volte e faça login!');
      } else if (error.code === 'auth/email-already-in-use') {
        showAlert('Ops', 'Este email já está cadastrado. Volte e faça login, ou use outro email!');
      } else if (error.message?.includes('Tempo esgotado')) {
        showAlert('Sem conexão', error.message);
      } else {
        showAlert('Erro ao criar conta', error.message);
      }
    }
  };

  // ETAPA 3 — antes disso, essa tela só aparecia por 1.4s e mandava direto
  // pro Login, mesmo sem o email ter sido confirmado ainda (a pessoa só ia
  // descobrir que precisava confirmar depois, ao tentar fazer um pedido de
  // verdade — ver o gate em OrderAdapter.createOrder). Agora ela fica AQUI,
  // esperando de verdade: confirma no próprio email (o link já volta direto
  // pro app — ver EmailVerificationLandingScreen), ou aperta "Já confirmei"
  // se preferir checar na hora.
  if (success) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successCircle}>
          <Text style={styles.successCheck}>✓</Text>
        </View>
        <Text style={styles.successTitle}>Falta só confirmar seu email</Text>
        <Text style={styles.successSubtitle}>
          Mandamos um link pra <Text style={styles.emailHighlight}>{email.trim()}</Text> (confira
          o spam se não chegar em alguns minutos). Assim que você clicar nele, esta tela
          continua sozinha — não precisa fazer mais nada.
        </Text>

        <View style={styles.waitingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.waitingText}>Aguardando confirmação...</Text>
        </View>

        <Button
          title={checkingNow ? 'Checando...' : 'Já confirmei'}
          onPress={handleCheckNow}
          style={styles.checkButton}
          disabled={checkingNow}
        />

        <TouchableOpacity onPress={handleResend} disabled={resendState !== 'idle'} style={styles.resendLink}>
          <Text style={styles.resendLinkText}>
            {resendState === 'sending' ? 'Reenviando...' : resendState === 'sent' ? 'Email reenviado ✓' : 'Não recebeu? Reenviar email'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Criar conta</Text>
          <Text style={styles.subtitle}>Leva menos de 1 minuto.</Text>
        </View>
        {deviceWasBlocked && (
          <View style={styles.deviceWarningBox}>
            <Text style={styles.deviceWarningText}>
              Uma conta bloqueada já foi acessada neste aparelho. Se for a
              mesma pessoa, resolva a pendência com o Paulinho em vez de
              criar uma conta nova.
            </Text>
          </View>
        )}
        <View style={styles.form}>
          <Text style={styles.label}>Nome</Text>
          <TextInput
            style={styles.input}
            placeholder="Como podemos te chamar na fila?"
            placeholderTextColor={colors.placeholder}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            placeholder="seu@email.com"
            placeholderTextColor={colors.placeholder}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Text style={styles.label}>Celular (DDD + Número)</Text>
          <TextInput
            style={styles.input}
            placeholder="(11) 99999-9999"
            placeholderTextColor={colors.placeholder}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={(text) => setPhone(maskPhone(text))}
            maxLength={16}
          />
          <Text style={styles.label}>Senha</Text>
          <TextInput
            style={styles.input}
            placeholder="Mínimo 6 caracteres"
            placeholderTextColor={colors.placeholder}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAcceptedTerms(v => !v)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
              {acceptedTerms && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.termsText}>
              Li e aceito os termos: pedidos não retirados e/ou não pagos podem
              levar ao bloqueio da conta até a quitação, e outras situações não
              previstas aqui seguem o bom senso do estabelecimento.
            </Text>
          </TouchableOpacity>

          <View style={styles.buttonContainer}>
            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <Button title="Criar conta" onPress={handleRegister} />
            )}
          </View>
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.backLinkText}>
              Já tem conta? <Text style={styles.backLinkTextBold}>Entrar</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  logoContainer: { alignItems: 'center', marginBottom: spacing.md },
  logoText: { fontSize: 26, fontWeight: '900', color: colors.primary, marginBottom: 2 },
  subtitle: { fontSize: 14, color: colors.textSecondary },
  deviceWarningBox: {
    backgroundColor: '#FEF2F2',
    padding: spacing.sm,
    borderRadius: radii.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.alert,
    marginBottom: spacing.md,
  },
  deviceWarningText: { color: colors.alert, fontSize: 12, lineHeight: 17 },
  form: { width: '100%' },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 4, marginLeft: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    height: 48,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radii.sm - 2,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxMark: { color: colors.surface, fontSize: 13, fontWeight: '900' },
  termsText: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  buttonContainer: { marginTop: spacing.xs, minHeight: 52, justifyContent: 'center' },
  backLink: { marginTop: spacing.md, alignItems: 'center' },
  backLinkText: { fontSize: 14, color: colors.textSecondary },
  backLinkTextBold: { color: colors.primary, fontWeight: '700' },
  successContainer: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  successCircle: { width: 88, height: 88, borderRadius: radii.full, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  successCheck: { fontSize: 44, color: colors.surface, fontWeight: '900' },
  successTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: spacing.xs },
  successSubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  emailHighlight: { fontWeight: '800', color: colors.text },
  waitingRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.lg, gap: spacing.sm },
  waitingText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  checkButton: { width: '100%' },
  resendLink: { marginTop: spacing.md },
  resendLinkText: { fontSize: 14, color: colors.primary, fontWeight: '700' },
});
