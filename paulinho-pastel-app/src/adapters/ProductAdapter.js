import { db, dbLite, auth } from '../services/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
// SDK Lite (REST avulso, sem canal de streaming) pras operações pontuais —
// ver comentário em firebase.js. onSnapshot continua no db normal acima.
import { collection as collectionLite, addDoc, deleteDoc, doc as docLite } from 'firebase/firestore/lite';
import { withTimeout } from '../utils/withTimeout';

export const subscribeToProducts = (onUpdate) => {
  // Ver comentário completo em OrderAdapter.subscribeToOrders: um erro
  // transitório no listener (token expirado, rede instável) o mata pra
  // sempre sem retry automático do Firestore — por isso essa função se
  // reconecta sozinha em vez de só logar o erro.
  let currentUnsubscribe = null;
  let stopped = false;

  const start = () => {
    const q = query(collection(db, 'products'), orderBy('name', 'asc'));
    currentUnsubscribe = onSnapshot(q, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      onUpdate(productsData);
    }, async (error) => {
      console.error('Erro ao ouvir cardápio em tempo real — reconectando:', error);
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

export const createProduct = async (product) => {
  if (typeof product.name !== 'string' || product.name.trim() === '') throw new Error('Nome inválido.');
  if (typeof product.price !== 'number' || product.price <= 0) throw new Error('Preço deve ser maior que zero.');
  const cost = typeof product.cost === 'number' && product.cost >= 0 ? product.cost : 0;

  const category = product.category === 'Doces' ? 'Doces' : 'Salgados';

  await auth.currentUser?.getIdToken();
  return withTimeout(addDoc(collectionLite(dbLite, 'products'), {
    name: product.name.trim(),
    desc: typeof product.desc === 'string' ? product.desc.trim() : '',
    price: product.price,
    cost, // custo estimado de ingredientes, usado para calcular lucro no dashboard
    category, // 'Salgados' | 'Doces' — agrupa o cardápio do cliente em seções
  }));
};

export const deleteProduct = async (id) => {
  await auth.currentUser?.getIdToken();
  return withTimeout(deleteDoc(docLite(dbLite, 'products', id)));
};
