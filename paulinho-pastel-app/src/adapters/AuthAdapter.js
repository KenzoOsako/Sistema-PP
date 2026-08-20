import { auth } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

// Hexagonal Port Adapter: Isola o Firebase das telas React (SOLID, Kenzo Standard)

export const login = async (phone, password) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const fakeEmail = `${cleanPhone}@paulinhopastel.com`;
  return signInWithEmailAndPassword(auth, fakeEmail, password);
};

export const register = async (phone, password) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const fakeEmail = `${cleanPhone}@paulinhopastel.com`;
  return createUserWithEmailAndPassword(auth, fakeEmail, password);
};

export const getCurrentUser = () => {
  return auth.currentUser;
};
