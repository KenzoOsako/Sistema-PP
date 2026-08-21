import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from './src/theme';
import AppAlertModal from './src/components/AppAlertModal';

import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import ClientMenuScreen from './src/screens/client/ClientMenuScreen';
import CartScreen from './src/screens/client/CartScreen';
import CheckoutScreen from './src/screens/client/CheckoutScreen';
import ClientOrderStatusScreen from './src/screens/client/ClientOrderStatusScreen';

import AdminFilaScreen from './src/screens/admin/AdminFilaScreen';
import AdminMenuScreen from './src/screens/admin/AdminMenuScreen';
import AdminDashboardScreen from './src/screens/admin/AdminDashboardScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ emoji }) {
  return <Text style={{ fontSize: 18 }}>{emoji}</Text>;
}

function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tab.Screen name="Fila" component={AdminFilaScreen} options={{ tabBarIcon: () => <TabIcon emoji="🧑‍🍳" /> }} />
      <Tab.Screen name="Cardápio" component={AdminMenuScreen} options={{ tabBarIcon: () => <TabIcon emoji="📋" /> }} />
      <Tab.Screen name="Financeiro" component={AdminDashboardScreen} options={{ tabBarIcon: () => <TabIcon emoji="📊" /> }} />
    </Tab.Navigator>
  );
}

export default function App() {
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
          <Stack.Screen name="AdminFila" component={AdminTabs} />
        </Stack.Navigator>
      </NavigationContainer>
      <AppAlertModal />
    </SafeAreaProvider>
  );
}
