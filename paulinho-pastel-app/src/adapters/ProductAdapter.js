import { db } from '../services/firebase';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

export const subscribeToProducts = (onUpdate) => {
  const q = query(collection(db, 'products'), orderBy('name', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const productsData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    onUpdate(productsData);
  });
};

export const createProduct = async (product) => {
  return addDoc(collection(db, 'products'), product);
};
