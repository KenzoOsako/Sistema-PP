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
  if (typeof product.name !== 'string' || product.name.trim() === '') throw new Error('Nome inválido.');
  if (typeof product.price !== 'number' || product.price <= 0) throw new Error('Preço deve ser maior que zero.');
  
  return addDoc(collection(db, 'products'), {
    name: product.name.trim(),
    desc: typeof product.desc === 'string' ? product.desc.trim() : '',
    price: product.price
  });
};
