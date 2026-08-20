import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Image } from 'react-native';
import Button from '../../components/Button';
import { colors, spacing, radii } from '../../theme';

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // Lógica de autenticação com Firebase entrará aqui
    // Por enquanto, vamos mockar a navegação:
    if (phone === '999') {
      navigation.replace('AdminFila'); // Fake Admin login
    } else {
      navigation.replace('ClientMenu'); // Fake Client login
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          {/* Aqui vai a logo do Paulinho Pastel depois */}
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
            <Button title="Entrar" onPress={handleLogin} />
            <Button 
              title="Criar Conta" 
              variant="outline" 
              style={{ marginTop: spacing.md }} 
              onPress={() => alert('Fluxo de cadastro em breve!')}
            />
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
  }
});
