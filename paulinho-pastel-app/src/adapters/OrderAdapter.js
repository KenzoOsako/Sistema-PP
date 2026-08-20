import { db, auth } from '../services/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';

// Hexagonal Port Adapter: Isola o Firestore da UI (SOLID, Kenzo Standard)

export const createOrder = async (cart, total) => {
  return addDoc(collection(db, 'orders'), {
    client_id: auth.currentUser?.uid || 'anonimo',
    client_email: auth.currentUser?.email || 'Sem login',
    items: cart,
    total: total,
    status: 'received',
    created_at: serverTimestamp(),
  });
};

export const subscribeToOrders = (onUpdate) => {
  const q = query(collection(db, 'orders'), orderBy('created_at', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const ordersData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    onUpdate(ordersData);
  });
};

export const updateOrderStatus = async (orderId, currentStatus) => {
  let nextStatus = '';
  if (currentStatus === 'received') nextStatus = 'preparing';
  else if (currentStatus === 'preparing') nextStatus = 'ready';
  else return;

  return updateDoc(doc(db, 'orders', orderId), {
    status: nextStatus
  });
};
