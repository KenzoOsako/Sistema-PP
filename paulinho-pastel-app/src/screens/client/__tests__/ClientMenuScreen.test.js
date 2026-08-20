import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import ClientMenuScreen from '../ClientMenuScreen';
import { subscribeToProducts } from '../../../adapters/ProductAdapter';

// Mock adapter to provide fixed data instantly
jest.mock('../../../adapters/ProductAdapter', () => ({
  subscribeToProducts: jest.fn()
}));

// Mock Icons to avoid rendering errors
jest.mock('@expo/vector-icons/Feather', () => 'Icon');

describe('ClientMenuScreen (Memory & Reducer Check)', () => {
  it('groups duplicate products by incrementing quantity instead of mutating list length', async () => {
    // Provide a mocked product
    subscribeToProducts.mockImplementation((callback) => {
      callback([{ id: 'p1', name: 'Pastel Queijo', desc: '...', price: 8.00 }]);
      return () => {};
    });

    const mockNavigation = { navigate: jest.fn() };

    const { getByText, getAllByText } = render(<ClientMenuScreen navigation={mockNavigation} />);
    
    // Add pastel to cart 3 times
    const addButtons = getAllByText('+');
    await act(async () => {
      fireEvent.press(addButtons[0]);
      fireEvent.press(addButtons[0]);
      fireEvent.press(addButtons[0]);
    });

    // Cart logic: It should read "3 itens" (sum of quantities), not the length of the array.
    // Since the initial state is empty, length is 1, quantity is 3.
    expect(getByText('3 itens')).toBeTruthy();
    expect(getByText('R$ 24,00')).toBeTruthy(); // 3 * 8.00
  });
});
