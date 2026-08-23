import { useEffect, useRef, useState } from 'react';
import { Vibration } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { requestNotificationPermission, notifyOrderReady } from '../services/notifications';
import { showAlert } from '../utils/showAlert';
import { loadNotifiedOrderIds, markOrderNotified } from '../utils/notifiedOrders';

// Componente "invisível" (não desenha nada) montado UMA VEZ na raiz do app
// (ver App.js) — fica de olho nos pedidos de quem estiver logado o tempo
// todo, não importa em qual tela a pessoa está.
//
// ANTES: esse aviso (vibração + notificação + alerta) vivia dentro de
// ClientOrderStatusScreen ("Meus Pedidos") — só disparava enquanto essa
// tela em especial estivesse montada. Se o cliente voltasse pro Cardápio
// pra continuar navegando (ou fechasse o app) antes do pedido ficar pronto,
// o aviso simplesmente nunca chegava, mesmo com o pedido pronto esperando
// no balcão. Como a prioridade real do cliente é SABER que o pedido ficou
// pronto — não precisar ficar checando uma tela específica pra isso — essa
// lógica se mudou pra cá, um componente que existe desde o login até o
// logout, seguindo o usuário por qualquer tela do app.
//
// Continua sendo notificação LOCAL (expo-notifications), não um push
// server-to-device de verdade — então só funciona enquanto o processo do
// app/PWA está rodando (aberto ou em segundo plano), não com o app 100%
// fechado. Um push de verdade precisaria de Cloud Functions + Firebase
// Cloud Messaging, fora do escopo de hoje.
export default function ClientOrderWatcher() {
  const [uid, setUid] = useState(auth.currentUser?.uid || null);
  // Carrega do localStorage uma vez só, na vida do componente (não a cada
  // troca de uid) — ver notifiedOrders.js.
  const notifiedSetRef = useRef(loadNotifiedOrderIds());

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid || null);
    });
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!uid) return undefined;

    requestNotificationPermission();

    // Mesmo padrão de reconexão do resto do app (ver
    // OrderAdapter.subscribeToOrders): um erro transitório no listener mata
    // ele pra sempre sem retry automático do Firestore, então essa função
    // se reinscreve sozinha em vez de só logar o erro — sem isso, um
    // problema passageiro de rede logo após o login travaria o aviso de
    // "pronto" pro resto da sessão inteira, silenciosamente.
    let currentUnsubscribe = null;
    let stopped = false;

    const start = () => {
      const q = query(
        collection(db, 'orders'),
        where('client_id', '==', uid),
        orderBy('created_at', 'desc')
      );

      currentUnsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docs.forEach(docSnap => {
          const order = { id: docSnap.id, ...docSnap.data() };
          if (order.status === 'ready' && !notifiedSetRef.current.has(order.id)) {
            markOrderNotified(order.id, notifiedSetRef.current);
            Vibration.vibrate([1000, 500, 1000]);
            notifyOrderReady(order.id);
            showAlert('🔔 Pedido pronto!', 'Seu pedido está pronto e quentinho. Pode retirar!');
          }
        });
      }, async (error) => {
        console.error('Erro ao observar pedidos do cliente (aviso de pronto) — reconectando:', error);
        if (stopped) return;
        try { await auth.currentUser?.getIdToken(true); } catch (e) { /* ignora, tenta mesmo assim */ }
        setTimeout(() => { if (!stopped) start(); }, 3000);
      });
    };

    start();

    return () => {
      stopped = true;
      if (currentUnsubscribe) currentUnsubscribe();
    };
  }, [uid]);

  return null;
}
