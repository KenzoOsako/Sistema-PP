import { createOrder, markNoShow, resolveNoShow } from '../OrderAdapter';
import { addDoc, getDocs, getDoc, updateDoc } from 'firebase/firestore/lite';
import { auth } from '../../services/firebase';

// Mock Firebase setup.
//
// ATUALIZADO: este teste ficava desatualizado em relação ao OrderAdapter.js
// real (causa raiz do "Zero-Trust Codebase Audit" falhando no CI) por dois
// motivos:
// 1. Mockava 'firebase/firestore', mas createOrder() usa o SDK Lite
//    ('firebase/firestore/lite') pros seus addDoc/getDocs/getDoc — então os
//    mocks nunca eram de fato chamados pelo código real.
// 2. auth.currentUser mockado não tinha getIdToken(), e o código real
//    sempre chama `await auth.currentUser?.getIdToken()` antes de qualquer
//    operação (proteção contra 403 de token não propagado — ver comentário
//    em OrderAdapter.js/AuthAdapter.js).
jest.mock('../../services/firebase', () => ({
  db: {},
  dbLite: {},
  auth: {
    currentUser: {
      uid: 'test_uid',
      email: 'test@mail.com',
      emailVerified: true,
      reload: jest.fn().mockResolvedValue(undefined),
      getIdToken: jest.fn().mockResolvedValue('fake-token'),
    },
  },
}));

// subscribeToOrders (não testado aqui) importa isso de 'firebase/firestore' —
// mockado só pra o módulo carregar sem tentar falar com um Firestore de verdade.
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(),
}));

jest.mock('firebase/firestore/lite', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'mocked_timestamp'),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
}));

// Evita chamar o Firebase Auth de verdade no reenvio best-effort de
// verificação (ver gate antifraude em createOrder) — o mock de
// auth.currentUser acima não é uma instância real de User, e a função de
// verdade quebraria tentando ler campos internos dela.
jest.mock('firebase/auth', () => ({
  sendEmailVerification: jest.fn().mockResolvedValue(undefined),
}));

// Fase 3: createOrder agora começa checando getStoreOpen() (loja aberta/
// fechada). Sem mockar isso, essa checagem cai no MESMO getDoc mockado
// acima e consome os mockResolvedValueOnce que os testes abaixo preparam
// pra o snapshot do PERFIL do cliente — os dois acabam funcionando por
// acidente (o efeito colateral vira `undefined`, tratado como "loja
// aberta" e como "sem perfil", que já era um caminho coberto), mas é
// simples e bem mais honesto isolar isso de vez com o próprio mock, em vez
// de depender dessa coincidência silenciosa continuar valendo pra sempre.
jest.mock('../StoreStatusAdapter', () => ({
  getStoreOpen: jest.fn().mockResolvedValue(true),
}));

describe('OrderAdapter (Zero-Trust Validation)', () => {
  beforeEach(() => {
    updateDoc.mockClear();
  });

  it('Enforces zero-trust recalculation regardless of client payload', async () => {
    // Setup mocked database price as R$ 9.00
    getDocs.mockResolvedValueOnce([
      { id: '1', data: () => ({ price: 9.00 }) }
    ]);
    // Perfil do cliente: sem documento em users/{uid} nesse teste — createOrder
    // deve continuar funcionando (cai pro fallback de nome vazio).
    getDoc.mockResolvedValueOnce({ exists: () => false });

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

// Gate antifraude (ver docs/feature-antifraude-email.md): conta NOVA (email
// de verdade) só pode pedir com o email confirmado; conta ANTIGA (email
// disfarçado telefone@paulinhopastel.com) fica de fora do gate.
describe('OrderAdapter (gate de email verificado)', () => {
  const originalEmail = auth.currentUser.email;
  const originalVerified = auth.currentUser.emailVerified;

  beforeEach(() => {
    addDoc.mockClear();
  });

  afterEach(() => {
    auth.currentUser.email = originalEmail;
    auth.currentUser.emailVerified = originalVerified;
  });

  it('Bloqueia o pedido se o email (de verdade) ainda não foi confirmado', async () => {
    auth.currentUser.email = 'cliente@gmail.com';
    auth.currentUser.emailVerified = false;

    await expect(createOrder([{ id: '1', name: 'Pastel', price: 9, quantity: 1 }]))
      .rejects.toMatchObject({ code: 'email-not-verified' });
    expect(addDoc).not.toHaveBeenCalled();
  });

  it('Deixa passar conta antiga (email disfarçado) mesmo sem emailVerified', async () => {
    getDocs.mockResolvedValueOnce([{ id: '1', data: () => ({ price: 9.00 }) }]);
    getDoc.mockResolvedValueOnce({ exists: () => false });
    auth.currentUser.email = '19999999999@paulinhopastel.com';
    auth.currentUser.emailVerified = false;

    await createOrder([{ id: '1', name: 'Pastel', price: 9, quantity: 1 }]);
    expect(addDoc).toHaveBeenCalled();
  });
});

// markNoShow/resolveNoShow (feature "Cliente Não Retirou" — ver
// docs/feature-bloqueio-no-show.md). Cobre a regra central que não pode
// regredir sem ninguém perceber: Pix nunca gera dívida/bloqueio, e
// cartão/dinheiro na retirada sempre bloqueia a conta do cliente.
describe('OrderAdapter (Cliente Não Retirou)', () => {
  beforeEach(() => {
    updateDoc.mockClear();
  });

  it('Pix: só tira o pedido da fila, sem bloquear a conta do cliente', async () => {
    await markNoShow({
      id: 'order_pix_1',
      payment_method: 'pix',
      client_id: 'user_1',
      items: [],
      total: 20,
    });

    // Só a atualização do PEDIDO acontece — nenhuma escrita em users/.
    expect(updateDoc).toHaveBeenCalledTimes(1);
    expect(updateDoc).toHaveBeenCalledWith(undefined, expect.objectContaining({ status: 'no_show' }));
  });

  it('Cartão/dinheiro na retirada: tira da fila E bloqueia a conta do cliente', async () => {
    await markNoShow({
      id: 'order_pickup_1',
      payment_method: 'on_pickup',
      client_id: 'user_2',
      items: [{ name: 'Carne', quantity: 2 }],
      total: 20,
    });

    // Uma escrita no pedido, outra na conta do cliente (bloqueio).
    expect(updateDoc).toHaveBeenCalledTimes(2);
    expect(updateDoc).toHaveBeenNthCalledWith(1, undefined, expect.objectContaining({ status: 'no_show' }));
    expect(updateDoc).toHaveBeenNthCalledWith(2, undefined, expect.objectContaining({
      blocked: true,
      blocked_order_id: 'order_pickup_1',
    }));
  });

  it('resolveNoShow: desbloqueia a conta e marca a resolução no pedido', async () => {
    await resolveNoShow('order_pickup_1', 'user_2', 'paid');

    expect(updateDoc).toHaveBeenCalledTimes(2);
    expect(updateDoc).toHaveBeenNthCalledWith(1, undefined, expect.objectContaining({ debt_resolved: 'paid' }));
    expect(updateDoc).toHaveBeenNthCalledWith(2, undefined, expect.objectContaining({ blocked: false }));
  });

  it('resolveNoShow: rejeita uma resolução que não seja "paid" nem "forgiven"', async () => {
    await expect(resolveNoShow('order_x', 'user_x', 'oops')).rejects.toThrow();
    expect(updateDoc).not.toHaveBeenCalled();
  });
});
