import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import Button from '../../components/Button';
import { colors, spacing, radii } from '../../theme';
import { login, getUserRole } from '../../adapters/AuthAdapter';
import { maskPhone } from '../../utils/phoneMask';
import { showAlert } from '../../utils/showAlert';

export default function LoginScreen({ navigation, route }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (route?.params?.prefillPhone) {
      setPhone(route.params.prefillPhone);
    }
  }, [route?.params?.prefillPhone]);

  const navigateByRole = async (uid) => {
    const role = await getUserRole(uid);
    navigation.replace(role === 'admin' ? 'AdminFila' : 'ClientMenu');
  };

  const handleLogin = async () => {
    if (!phone || !password) {
      showAlert('Erro', 'Preencha o celular e a senha!');
      return;
    }
    setLoading(true);
    try {
      const credential = await login(phone, password);
      await navigateByRole(credential.user.uid);
    } catch (error) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        showAlert('Conta não encontrada', 'Você ainda não tem cadastro, ou telefone/senha errados. Toque em "Criar conta" se ainda não tem.');
      } else if (error.message?.includes('Tempo esgotado')) {
        showAlert('Sem conexão', error.message);
      } else {
        showAlert('Erro ao entrar', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image source={require('../../../assets/icon.png')} style={styles.logoImage} />
          <Text style={styles.logoText}>Paulinho Pastel</Text>
          <Text style={styles.subtitle}>Pule a fila, peça pelo celular.</Text>
        </View>
        <View style={styles.form}>
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
            placeholder="Sua senha secreta"
            placeholderTextColor={colors.placeholder}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <View style={styles.buttonContainer}>
            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <Button title="Entrar" onPress={handleLogin} />
            )}
          </View>
          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => navigation.navigate('Register')}
            disabled={loading}
          >
            <Text style={styles.registerLinkText}>
              Não tem conta? <Text style={styles.registerLinkTextBold}>Criar conta</Text>
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
  logoContainer: { alignItems: 'center', marginBottom: spacing.xxl },
  logoImage: { width: 96, height: 96, borderRadius: radii.md, marginBottom: spacing.sm },
  logoText: { fontSize: 32, fontWeight: '900', color: colors.primary, marginBottom: spacing.xs },
  subtitle: { fontSize: 16, color: colors.textSecondary },
  form: { width: '100%' },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs, marginLeft: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    height: 56,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonContainer: { marginTop: spacing.sm, minHeight: 56, justifyContent: 'center' },
  registerLink: { marginTop: spacing.lg, alignItems: 'center' },
  registerLinkText: { fontSize: 15, color: colors.textSecondary },
  registerLinkTextBold: { color: colors.primary, fontWeight: '700' },
});
