import React from 'react';
import { render, fireEvent, act, screen, waitFor } from '@testing-library/react-native';
import ClientMenuScreen from '../ClientMenuScreen';
import { subscribeToProducts } from '../../../adapters/ProductAdapter';

// Mock adapter to provide fixed data instantly
jest.mock('../../../adapters/ProductAdapter', () => ({
  subscribeToProducts: jest.fn()
}));

describe('ClientMenuScreen (Memory & Reducer Check)', () => {
  it('groups duplicate products by incrementing quantity instead of mutating list length', async () => {
    // Provide a mocked product
    subscribeToProducts.mockImplementation((callback) => {
      callback([{ id: 'p1', name: 'Pastel Queijo', desc: '...', price: 8.00 }]);
      return () => {};
    });

    const mockNavigation = { navigate: jest.fn() };

    // Usa a API global `screen` (padrão recomendado nesta versão da lib) em vez
    // de desestruturar o retorno de render(). O `waitFor` abaixo é essencial:
    // o cardápio chega via useEffect + callback de subscription, e esse efeito
    // pode não ter terminado de propagar no exato instante em que o render()
    // resolve — sem o waitFor, a asserção roda numa janela de corrida
    // intermitente (passa na maioria das vezes, falha esporadicamente).
    await render(<ClientMenuScreen navigation={mockNavigation} />);

    const addButtons = await waitFor(() => {
      const buttons = screen.getAllByText('+');
      expect(buttons.length).toBeGreaterThan(0);
      return buttons;
    });

    // Add pastel to cart 3 times
    await act(async () => { fireEvent.press(addButtons[0]); });
    await act(async () => { fireEvent.press(addButtons[0]); });
    await act(async () => { fireEvent.press(addButtons[0]); });

    // Cart logic: It should read "3 itens" (sum of quantities), not the length of the array.
    // Since the initial state is empty, length is 1, quantity is 3.
    await waitFor(() => expect(screen.getByText('3 itens')).toBeTruthy());
    expect(screen.getByText('R$ 24,00')).toBeTruthy(); // 3 * 8.00
  });
});
