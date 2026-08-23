import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppAlertModal from './src/components/AppAlertModal';
import ClientOrderWatcher from './src/components/ClientOrderWatcher';

import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import EmailVerificationLandingScreen from './src/screens/auth/EmailVerificationLandingScreen';
import ClientMenuScreen from './src/screens/client/ClientMenuScreen';
import CartScreen from './src/screens/client/CartScreen';
import CheckoutScreen from './src/screens/client/CheckoutScreen';
import ClientOrderStatusScreen from './src/screens/client/ClientOrderStatusScreen';
import ClientBlockedScreen from './src/screens/client/ClientBlockedScreen';

import AdminFilaScreen from './src/screens/admin/AdminFilaScreen';
import AdminMenuScreen from './src/screens/admin/AdminMenuScreen';
import AdminDashboardScreen from './src/screens/admin/AdminDashboardScreen';
import AdminBlockedScreen from './src/screens/admin/AdminBlockedScreen';
import AdminStoreStatusScreen from './src/screens/admin/AdminStoreStatusScreen';
import AdminOrderSearchScreen from './src/screens/admin/AdminOrderSearchScreen';

const Stack = createNativeStackNavigator();

// ETAPA 3 (23/08/2026) — deep link do e-mail de confirmação: o link que o
// Firebase manda por e-mail agora aponta pra esta MESMA URL do PWA (ver
// AuthAdapter.getEmailActionCodeSettings), com `?mode=verifyEmail&
// oobCode=...` na query string, em vez da página genérica do próprio
// Firebase. Detectar isso ANTES de montar a navegação normal (em vez de,
// por exemplo, tentar encaixar como mais uma Stack.Screen) evita qualquer
// dependência de estado de navegação/autenticação prévio — funciona mesmo
// se quem clicou no link nunca tinha aberto o app nesse navegador antes.
// Calculado uma vez só (o valor da URL não muda sem um reload de página, e
// EmailVerificationLandingScreen já força um reload pra "voltar pro app").
const emailLinkParams = typeof window !== 'undefined' && window.location
  ? new URLSearchParams(window.location.search)
  : null;
const emailVerifyOobCode = emailLinkParams?.get('mode') === 'verifyEmail'
  ? emailLinkParams.get('oobCode')
  : null;

export default function App() {
  if (emailVerifyOobCode) {
    return (
      <SafeAreaProvider>
        <EmailVerificationLandingScreen oobCode={emailVerifyOobCode} />
        <AppAlertModal />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ClientMenu" component={ClientMenuScreen} />
          <Stack.Screen name="Cart" component={CartScreen} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} />
          <Stack.Screen name="ClientOrders" component={ClientOrderStatusScreen} />
          <Stack.Screen name="ClientBlocked" component={ClientBlockedScreen} />

          {/* Fase 3: a área admin deixou de ser um Tab.Navigator com 4 abas
              fixas — só a Fila é o "lar" do admin agora; Cardápio/
              Financeiro/Bloqueados/Status da Loja viram telas de stack
              normais, abertas pelo menu ☰ da Fila (ver AdminDrawerMenu,
              Etapa 2) e fechadas com onBack (goBack), igual as telas do
              fluxo do cliente. */}
          <Stack.Screen name="AdminFila" component={AdminFilaScreen} />
          <Stack.Screen name="AdminMenu" component={AdminMenuScreen} />
          <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
          <Stack.Screen name="AdminBlocked" component={AdminBlockedScreen} />
          <Stack.Screen name="AdminStoreStatus" component={AdminStoreStatusScreen} />
          <Stack.Screen name="AdminOrderSearch" component={AdminOrderSearchScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      {/* Fica de olho nos pedidos de quem estiver logado o tempo todo,
          independente da tela atual — ver comentário grande no próprio
          arquivo pra entender por que isso não vive mais dentro da tela
          "Meus Pedidos". Não desenha nada na tela. */}
      <ClientOrderWatcher />
      <AppAlertModal />
    </SafeAreaProvider>
  );
}
