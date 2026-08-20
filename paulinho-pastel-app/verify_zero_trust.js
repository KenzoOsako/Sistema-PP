import { createOrder } from './src/adapters/OrderAdapter.js';
import * as firestore from 'firebase/firestore';

// Mock dependencies
const mockAddDoc = (...args) => { console.log('Mock addDoc called with:', JSON.stringify(args, null, 2)); return true; };
const mockGetDocs = async () => {
  return [
    { id: '1', data: () => ({ price: 9.00 }) },
    { id: '2', data: () => ({ price: 8.50 }) }
  ];
};

firestore.addDoc = mockAddDoc;
firestore.getDocs = mockGetDocs;
firestore.collection = () => 'mock_collection';
firestore.serverTimestamp = () => 'mock_timestamp';

async function runTests() {
  console.log('--- EXECUTING ZERO-TRUST ADAPTER TEST ---');
  const maliciousCart = [
    { id: '1', name: 'Pastel de Carne', quantity: 5, price: 0 } // Malicious price 0
  ];

  console.log('Client Payload:', maliciousCart);
  await createOrder(maliciousCart);
  console.log('--- TEST FINISHED ---');
}

runTests();
