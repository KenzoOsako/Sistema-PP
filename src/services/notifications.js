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

// Mensagem não expõe mais o código interno do pedido (ex.: "BCEAP") — o
// cliente não sabe o que esse código significa, só confunde. "Seu pedido"
// já é claro o suficiente: ele só tem os pedidos dele mesmo pra acompanhar.
export const notifyOrderReady = async (orderId) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔔 Pedido pronto!',
      body: 'Seu pedido está pronto e quentinho. Pode retirar!',
      sound: true,
      // Guardado pra uso futuro (ex.: abrir direto em "Meus Pedidos" ao
      // tocar na notificação) — não tratado ainda, mas não custa nada
      // deixar disponível desde já.
      data: { orderId },
    },
    trigger: null, // dispara imediatamente
  });
};
