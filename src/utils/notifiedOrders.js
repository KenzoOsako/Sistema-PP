// Lembra quais pedidos já dispararam a notificação de "pronto" pro cliente,
// persistindo entre reaberturas do app.
//
// Sem isso, o `useState(new Set())` em ClientOrderStatusScreen reiniciava
// vazio a cada remount (reabrir o app, deslogar/logar, etc.) — se o pedido
// ainda estivesse "ready" (esperando retirada) nesse momento, a notificação
// (vibração + push + alerta) disparava de novo do zero, mesmo já tendo
// avisado antes. Guardando os ids no localStorage, cada pedido só notifica
// uma vez na vida, não importa quantas vezes o cliente reabra "Meus Pedidos"
// enquanto ele ainda não foi marcado como retirado/finalizado.
const STORAGE_KEY = 'paulinho_notified_ready_orders';
// Teto simples pra não crescer pra sempre numa conta usada por anos.
const MAX_STORED = 200;

function hasLocalStorage() {
  try {
    return typeof localStorage !== 'undefined';
  } catch (e) {
    return false;
  }
}

export function loadNotifiedOrderIds() {
  if (!hasLocalStorage()) return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (e) {
    return new Set();
  }
}

// Marca o pedido como notificado no Set em memória (passado por referência)
// e persiste. Se o localStorage falhar por algum motivo, o pior caso é
// notificar de novo uma vez depois — não é crítico, por isso engolimos o erro.
export function markOrderNotified(orderId, notifiedSet) {
  notifiedSet.add(orderId);
  if (!hasLocalStorage()) return;
  try {
    const ids = Array.from(notifiedSet).slice(-MAX_STORED);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch (e) {
    // silencioso, ver comentário acima.
  }
}
