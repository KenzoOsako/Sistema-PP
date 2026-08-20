import { db, auth } from '../services/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, updateDoc, doc, getDocs } from 'firebase/firestore';

// Hexagonal Port Adapter: Isola o Firestore da UI (SOLID, Kenzo Standard)

export const createOrder = async (cart) => {
  // Zero-Trust: Recalculate based on real prices from DB
  const productsSnap = await getDocs(collection(db, 'products'));
  const productDict = {};
  productsSnap.forEach(d => {
    productDict[d.id] = d.data().price;
  });

  let secureTotal = 0;
  const sanitizedItems = cart.map(item => {
    const safePrice = productDict[item.id] || 0;
    secureTotal += safePrice * (item.quantity || 1);
    return {
      productId: item.id,
      name: item.name,
      quantity: item.quantity || 1,
      unit_price_at_time_of_sale: safePrice
    };
  });

  return addDoc(collection(db, 'orders'), {
    client_id: auth.currentUser?.uid || 'anonimo',
    client_email: auth.currentUser?.email || 'Sem login',
    items: sanitizedItems,
    total: secureTotal,
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
