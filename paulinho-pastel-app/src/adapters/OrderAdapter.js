import { db, dbLite, auth } from '../services/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
// SDK Lite (REST avulso, sem canal de streaming) pras operações pontuais —
// ver comentário em firebase.js. onSnapshot continua no db normal acima,
// porque tempo real não existe no Lite.
import {
  collection as collectionLite,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc as docLite,
  getDoc,
  getDocs,
} from 'firebase/firestore/lite';
import { withTimeout } from '../utils/withTimeout';

// Hexagonal Port Adapter: Isola o Firestore da UI (SOLID, Kenzo Standard)
//
// IMPORTANTE: toda chamada aqui que é uma Promise única (getDocs/addDoc/updateDoc)
// precisa passar por withTimeout. Sem isso, uma rede lenta trava a Promise pra
// sempre e a UI (botão "Enviando...") fica travada sem nunca mostrar erro nem
// sucesso — foi exatamente o bug do pedido que nunca saía de "Enviando...".
// onSnapshot (listener contínuo) NÃO entra aqui, pois não é uma Promise única.

export const createOrder = async (cart, paymentMethod = 'pix') => {
  // Garante que o token de ID já propagou antes das chamadas REST do SDK
  // Lite — mesma proteção contra 403 explicada em AuthAdapter.js.
  await auth.currentUser?.getIdToken();

  const uid = auth.currentUser?.uid;

  // Zero-Trust: Recalculate based on real prices from DB. Busca em paralelo
  // com o perfil do cliente (users/{uid}) pra não perder tempo em série.
  //
  // O nome do cliente vem daqui (Firestore), e NÃO de
  // auth.currentUser.displayName: esse campo depende do updateProfile()
  // chamado no cadastro (AuthAdapter.register), que é best-effort e pode
  // falhar/demorar em rede ruim sem bloquear a criação da conta (ver
  // comentário lá). Isso fazia pedidos serem salvos com client_name vazio
  // mesmo com a conta e o documento em users/{uid} corretos. O documento
  // Firestore é gravado de forma confiável nesse mesmo cadastro, então é a
  // fonte de verdade certa para o nome.
  const [productsSnap, userSnap] = await Promise.all([
    withTimeout(getDocs(collectionLite(dbLite, 'products'))),
    uid ? withTimeout(getDoc(docLite(dbLite, 'users', uid))).catch(() => null) : Promise.resolve(null),
  ]);

  const productDict = {};
  productsSnap.forEach(d => {
    productDict[d.id] = { price: d.data().price, cost: d.data().cost || 0 };
  });

  let secureTotal = 0;
  const sanitizedItems = cart.map(item => {
    const safeData = productDict[item.id] || { price: 0, cost: 0 };
    secureTotal += safeData.price * (item.quantity || 1);
    return {
      productId: item.id,
      name: item.name,
      quantity: item.quantity || 1,
      unit_price_at_time_of_sale: safeData.price,
      unit_cost_at_time_of_sale: safeData.cost,
    };
  });

  const profileName = userSnap && userSnap.exists() ? userSnap.data().name : null;

  return withTimeout(addDoc(collectionLite(dbLite, 'orders'), {
    client_id: uid || 'anonimo',
    client_email: auth.currentUser?.email || 'Sem login',
    client_name: profileName || auth.currentUser?.displayName || '',
    items: sanitizedItems,
    total: secureTotal,
    status: 'received',
    // 'pix': aguarda confirmação do Paulinho via QR estático
    // 'on_pickup': cartão ou dinheiro, pago fisicamente na retirada
    payment_method: paymentMethod,
    created_at: serverTimestamp(),
  }));
};

export const subscribeToOrders = (onUpdate) => {
  // IMPORTANTE: uma vez que um onSnapshot recebe um erro (token expirado,
  // rede caiu um instante, regra ainda propagando etc.), o Firestore encerra
  // o listener de vez — ele NUNCA volta sozinho, mesmo depois do problema
  // real já ter sumido. Era esse o motivo real de "o pedido não chega pro
  // Paulinho": bastava UM erro transitório em qualquer momento (ex: logo
  // após abrir o painel, antes do token propagar) pra fila do admin travar
  // em "vazia" pra sempre até um F5 manual — mesmo pedidos criados minutos
  // depois, já sem nenhum problema real, nunca apareciam. Por isso essa
  // função se reinscreve sozinha (com um novo token) sempre que o listener
  // atual morre, em vez de só logar o erro.
  let currentUnsubscribe = null;
  let stopped = false;

  const start = () => {
    const q = query(collection(db, 'orders'), orderBy('created_at', 'desc'));
    currentUnsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      onUpdate(ordersData);
    }, async (error) => {
      console.error('Erro ao ouvir pedidos em tempo real (fila do admin) — reconectando:', error);
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
};

export const updateOrderStatus = async (orderId, currentStatus) => {
  let nextStatus = '';
  if (currentStatus === 'received') nextStatus = 'preparing';
  else if (currentStatus === 'preparing') nextStatus = 'ready';
  else return;

  await auth.currentUser?.getIdToken();
  return withTimeout(updateDoc(docLite(dbLite, 'orders', orderId), {
    status: nextStatus
  }));
};
