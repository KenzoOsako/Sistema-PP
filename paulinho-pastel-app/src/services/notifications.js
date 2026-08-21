import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Notificação local real (via expo-notifications), dispara mesmo com o app
// em segundo plano — diferente do Alert() puro, que só funciona com o app aberto.
// Não é um push server-to-device via Firebase Cloud Messaging (isso exigiria
// Cloud Functions + backend, fora do escopo desta fase), mas cobre o caso de uso
// da demo: o cliente sai da tela do app e ainda assim é avisado quando o pedido fica pronto.

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const requestNotificationPermission = async () => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('pedidos', {
      name: 'Pedidos',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 1000, 500, 1000],
    });
  }

  return finalStatus === 'granted';
};

export const notifyOrderReady = async (orderId) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔔 Pedido pronto!',
      body: `Seu pedido ${orderId.slice(0, 5).toUpperCase()} está quentinho. Pode retirar!`,
      sound: true,
    },
    trigger: null, // dispara imediatamente
  });
};
