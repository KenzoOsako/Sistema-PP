import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ClientMenuScreen from '../ClientMenuScreen';
import { subscribeToProducts } from '../../../adapters/ProductAdapter';

// Mock adapter to provide fixed data instantly
jest.mock('../../../adapters/ProductAdapter', () => ({
  subscribeToProducts: jest.fn()
}));

// Fase 3: ClientMenuScreen agora também assina o status da loja (pro banner
// de "estamos fechados"). Sem mockar, isso chamaria o StoreStatusAdapter de
// verdade, que por sua vez inicializa o Firebase de verdade — mesmo motivo
// do mock de AuthAdapter logo abaixo. jest.fn(() => () => {}) já devolve
// uma função de "desinscrever" utilizável, exatamente o que o useEffect do
// componente espera de volta.
jest.mock('../../../adapters/StoreStatusAdapter', () => ({
  subscribeToStoreStatus: jest.fn(() => () => {}),
}));

// Fase 3: Header passou a usar useSafeAreaInsets. O mock oficial da própria
// lib (react-native-safe-area-context/jest/mock) parecia o caminho certo,
// mas quebrou na prática: ele usa `export default {...}` (vira
// `{ __esModule: true, default: {...} }` depois do Babel), e o import
// nomeado `{ SafeAreaProvider }` do Header/deste teste procura a
// propriedade no NÍVEL DE CIMA do módulo — que fica undefined, porque tudo
// está aninhado dentro de `.default`. Resultado: "Element type is invalid
// ... got: undefined" (achado rodando o teste de verdade, não só lendo
// código). Um mock simples e explícito, sem essa armadilha, resolve.
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

// ClientMenuScreen também importa AuthAdapter (só pelo logout()), que por sua
// vez importa services/firebase.js — sem mockar isso, o teste acaba
// inicializando um app Firebase de VERDADE (initializeApp/getAuth) durante o
// render. Nesse ambiente de teste (sem AsyncStorage, sem IndexedDB) isso
// gera uma promise rejeitada sem tratamento nos bastidores do SDK, que o
// Node (unhandled-rejections=throw por padrão desde a v15) trata como erro
// fatal e derruba o processo inteiro — foi exatamente o que quebrava o job
// "Zero-Trust Codebase Audit" no CI. Mockar AuthAdapter isola o componente
// de qualquer inicialização real do Firebase.
jest.mock('../../../adapters/AuthAdapter', () => ({
  logout: jest.fn(),
}));

describe('ClientMenuScreen (Memory & Reducer Check)', () => {
  // BUG ENCONTRADO (reproduzido rodando de verdade, não só lendo código):
  // esse teste passou a estourar o timeout padrão do Jest (5000ms) numa
  // máquina mais lenta, mesmo sem nenhuma mudança na lógica do teste em si.
  // Causa raiz: SectionList/VirtualizedList agenda por conta própria um
  // timer interno (_updateCellsToRender) pra recalcular quais células
  // renderizar — isso é comportamento normal da lib, não um bug nosso — e
  // numa máquina mais lenta (ou com mais coisa rodando em paralelo) esse
  // timer pode demorar o suficiente pra empurrar o teste inteiro pra perto
  // ou além dos 5000ms padrão, ainda mais com initialNumToRender={50}. Em vez
  // de mexer em código de produção pra um problema que é só de ambiente de
  // teste, aumenta o timeout deste teste específico pra dar folga.
  it('groups duplicate products by incrementing quantity instead of mutating list length', async () => {
    // Provide a mocked product
    subscribeToProducts.mockImplementation((callback) => {
      callback([{ id: 'p1', name: 'Pastel Queijo', desc: '...', price: 8.00 }]);
      return () => {};
    });

    const mockNavigation = { navigate: jest.fn() };

    // FASE 3: trocado o uso da API global `screen` por desestruturar o
    // retorno de render() direto — achado rodando o teste de verdade (não
    // só lendo código): com `screen`, o 3º fireEvent.press (mas nunca o 1º
    // ou 2º) derrubava o processo INTEIRO do Node com "render function has
    // not been called" vindo de dentro do próprio testing-library, em vez
    // de reportar uma falha normal de teste. Desestruturar de render()
    // evita esse singleton global por completo — mesma cobertura, sem essa
    // fragilidade. Também parou de embrulhar cada fireEvent.press em
    // act(async () => {...}): fireEvent já faz esse ato sozinho desde faz
    // tempo nesta lib, e o wrap manual (redundante) era outro suspeito
    // plausível pra essa mesma instabilidade.
    //
    // O `waitFor` abaixo continua essencial: o cardápio chega via
    // useEffect + callback de subscription, e esse efeito pode não ter
    // terminado de propagar no exato instante em que o render() resolve —
    // sem o waitFor, a asserção roda numa janela de corrida intermitente
    // (passa na maioria das vezes, falha esporadicamente).
    //
    // Fase 3 também exigiu envolver tudo num SafeAreaProvider: Header
    // agora usa useSafeAreaInsets (pro respiro do topo), que precisa de um
    // ancestral desses pra não quebrar — o app de verdade já tem um lá em
    // App.js, então o teste precisa do mesmo.
    const { getAllByText, getByText } = await render(
      <SafeAreaProvider>
        <ClientMenuScreen navigation={mockNavigation} />
      </SafeAreaProvider>
    );

    const addButtons = await waitFor(() => {
      const buttons = getAllByText('+');
      expect(buttons.length).toBeGreaterThan(0);
      return buttons;
    });

    // Add pastel to cart 3 times
    fireEvent.press(addButtons[0]);
    fireEvent.press(addButtons[0]);
    fireEvent.press(addButtons[0]);

    // Cart logic: It should read "3 itens" (sum of quantities), not the length of the array.
    // Since the initial state is empty, length is 1, quantity is 3.
    await waitFor(() => expect(getByText('3 itens')).toBeTruthy());
    expect(getByText('R$ 24,00')).toBeTruthy(); // 3 * 8.00
  }, 20000);
});
