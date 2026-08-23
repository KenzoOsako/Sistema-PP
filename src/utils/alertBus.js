// Pub/sub simples pra desacoplar o showAlert() (chamado de qualquer tela)
// do componente visual que realmente mostra o alerta (AppAlertModal, montado
// uma vez lá no App.js).
let listener = null;

export function setAlertListener(fn) {
  listener = fn;
}

export function emitAlert(title, message) {
  if (listener) {
    listener(title, message);
  } else {
    // Fallback de segurança, só se o modal ainda não montou por algum motivo.
    window.alert(message ? `${title}\n\n${message}` : title);
  }
}
