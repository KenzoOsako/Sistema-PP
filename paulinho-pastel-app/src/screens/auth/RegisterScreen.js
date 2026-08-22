import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, TouchableOpacity } from 'react-native';
import Button from '../../components/Button';
import { colors, spacing, radii } from '../../theme';
import { register } from '../../adapters/AuthAdapter';
import { maskPhone } from '../../utils/phoneMask';
import { showAlert } from '../../utils/showAlert';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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
      setTimeout(() => {
        navigation.replace('Login', { prefillPhone: phone });
      }, 1400);
    } catch (error) {
      setLoading(false);
      if (error.code === 'auth/email-already-in-use') {
        showAlert('Ops', 'Este número já está cadastrado. Volte e faça login!');
      } else if (error.message?.includes('Tempo esgotado')) {
        showAlert('Sem conexão', error.message);
      } else {
        showAlert('Erro ao criar conta', error.message);
      }
    }
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successCircle}>
          <Text style={styles.successCheck}>✓</Text>
        </View>
        <Text style={styles.successTitle}>Conta criada com sucesso!</Text>
        <Text style={styles.successSubtitle}>Redirecionando para o login...</Text>
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
  successSubtitle: { fontSize: 14, color: colors.textSecondary },
});
