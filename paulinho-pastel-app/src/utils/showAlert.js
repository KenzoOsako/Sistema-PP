import { Alert, Platform } from 'react-native';
import { emitAlert } from './alertBus';

// No nativo (Android/iOS) o Alert.alert() já é bonito e é o padrão do sistema.
// Na web ele não funciona (não mostra nada), então usamos um modal próprio
// (AppAlertModal) com a cara do app.
export function showAlert(title, message) {
  if (Platform.OS === 'web') {
    emitAlert(title, message);
  } else {
    Alert.alert(title, message);
  }
}
