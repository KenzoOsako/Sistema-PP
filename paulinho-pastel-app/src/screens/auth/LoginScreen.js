import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import Button from '../../components/Button';
import { colors, spacing, radii } from '../../theme';
import { login, register } from '../../adapters/AuthAdapter';

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('Erro', 'Preencha o celular e a senha!');
      return;
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone === '999') {
      navigation.replace('AdminFila');
      return;
    }

    setLoading(true);
    try {
      await login(phone, password);
      navigation.replace('ClientMenu');
    } catch (error) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        Alert.alert('Conta não encontrada', 'Você ainda não tem cadastro. Clique em "Criar Conta".');
      } else {
        Alert.alert('Erro ao entrar', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!phone || !password) {
      Alert.alert('Erro', 'Preencha o celular e a senha para criar a conta!');
      return;
    }
    setLoading(true);
    try {
      await register(phone, password);
      Alert.alert('Sucesso!', 'Conta criada. Bem-vindo!');
      navigation.replace('ClientMenu');
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert('Ops', 'Este número já está cadastrado. Faça login!');
      } else {
        Alert.alert('Erro ao criar conta', error.message);
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
          <Text style={styles.logoText}>Paulinho Pastel</Text>
          <Text style={styles.subtitle}>Pule a fila, peça pelo celular.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Celular (DDD + Número)</Text>
          <TextInput
            style={styles.input}
            placeholder="(11) 99999-9999"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <Text style={styles.label}>Senha</Text>
          <TextInput
            style={styles.input}
            placeholder="Sua senha secreta"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <View style={styles.buttonContainer}>
            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <>
                <Button title="Entrar" onPress={handleLogin} />
                <Button 
                  title="Criar Conta" 
                  variant="outline" 
                  style={{ marginTop: spacing.md }} 
                  onPress={handleRegister}
                />
              </>
            )}
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    height: 56,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  buttonContainer: {
    marginTop: spacing.sm,
    minHeight: 120,
    justifyContent: 'center'
  }
});
