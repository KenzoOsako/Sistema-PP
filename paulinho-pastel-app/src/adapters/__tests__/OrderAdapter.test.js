import { createOrder } from '../OrderAdapter';
import { addDoc, getDocs } from 'firebase/firestore';

// Mock Firebase setup
jest.mock('../../services/firebase', () => ({
  db: {},
  auth: {
    currentUser: { uid: 'test_uid', email: 'test@mail.com' }
  }
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'mocked_timestamp'),
  getDocs: jest.fn(),
}));

describe('OrderAdapter (Zero-Trust Validation)', () => {
  it('Enforces zero-trust recalculation regardless of client payload', async () => {
    // Setup mocked database price as R$ 9.00
    getDocs.mockResolvedValueOnce([
      { id: '1', data: () => ({ price: 9.00 }) }
    ]);

    // Client sends malicious cart with price 0, but quantity 5
    const maliciousCart = [
      { id: '1', name: 'Pastel Malicioso', price: 0.00, quantity: 5 }
    ];

    await createOrder(maliciousCart);

    // The adapter MUST recalculate total = 9.00 * 5 = 45.00
    expect(addDoc).toHaveBeenCalledWith(
      undefined, 
      expect.objectContaining({
        total: 45.00,
        items: expect.arrayContaining([
          expect.objectContaining({
            productId: '1',
            unit_price_at_time_of_sale: 9.00
          })
        ])
      })
    );
  });
});
