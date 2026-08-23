import { login, register } from '../AuthAdapter';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { getDoc, setDoc } from 'firebase/firestore/lite';

// Cobre a mudança central do antifraude por email (ver
// docs/feature-antifraude-email.md): o Auth passa a usar o email de
// verdade digitado no cadastro, e o login por telefone passa a resolver
// esse email através de `phone_directory/{telefone}` — ver comentário
// grande em AuthAdapter.js.
jest.mock('../../services/firebase', () => ({
  db: {},
  dbLite: {},
  auth: {
    currentUser: null,
  },
}));

jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  updateProfile: jest.fn().mockResolvedValue(undefined),
  sendEmailVerification: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn(),
}));

jest.mock('firebase/firestore/lite', () => ({
  doc: jest.fn((db, col, id) => ({ col, id })),
  getDoc: jest.fn(),
  setDoc: jest.fn().mockResolvedValue(undefined),
  serverTimestamp: jest.fn(() => 'mocked_timestamp'),
}));

describe('AuthAdapter — login por telefone (email real por trás)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('acha o email de verdade em phone_directory e loga com ele', async () => {
    getDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ email: 'cliente@gmail.com' }) });
    signInWithEmailAndPassword.mockResolvedValueOnce({ user: { uid: 'u1' } });

    await login('(11) 99999-9999', 'senha123');

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(), 'cliente@gmail.com', 'senha123'
    );
  });

  it('cai no email disfarçado antigo se o telefone não estiver em phone_directory (conta antiga)', async () => {
    getDoc.mockResolvedValueOnce({ exists: () => false, data: () => ({}) });
    signInWithEmailAndPassword.mockResolvedValueOnce({ user: { uid: 'u2' } });

    await login('(11) 98888-8888', 'senha123');

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(), '11988888888@paulinhopastel.com', 'senha123'
    );
  });

  it('também cai no email disfarçado se a consulta a phone_directory falhar (rede ruim)', async () => {
    getDoc.mockRejectedValueOnce(new Error('Tempo esgotado'));
    signInWithEmailAndPassword.mockResolvedValueOnce({ user: { uid: 'u3' } });

    await login('(11) 97777-7777', 'senha123');

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(), '11977777777@paulinhopastel.com', 'senha123'
    );
  });
});

describe('AuthAdapter — cadastro com email real', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('recusa cadastro se o telefone já estiver em phone_directory, sem criar conta no Auth', async () => {
    getDoc.mockResolvedValueOnce({ exists: () => true });

    await expect(register({
      name: 'Fulano', email: 'novo@gmail.com', phone: '(11) 99999-9999', password: 'senha123',
    })).rejects.toMatchObject({ code: 'phone-already-registered' });

    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it('cadastro feliz: cria conta com email de verdade, manda verificação, e grava phone_directory', async () => {
    getDoc.mockResolvedValueOnce({ exists: () => false }); // pré-checagem de telefone livre
    const fakeUser = { uid: 'novo_uid', getIdToken: jest.fn().mockResolvedValue('tok') };
    createUserWithEmailAndPassword.mockResolvedValueOnce({ user: fakeUser });

    await register({
      name: 'Fulano', email: 'Novo@Gmail.com', phone: '(11) 96666-6666', password: 'senha123',
    });

    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(), 'novo@gmail.com', 'senha123'
    );
    // ETAPA 3: sendEmailVerification agora recebe um 2º argumento
    // (actionCodeSettings, pro link do e-mail abrir o próprio app — ver
    // getEmailActionCodeSettings em AuthAdapter.js). No ambiente de teste
    // (sem window.location de verdade) esse valor é undefined — só no
    // navegador de verdade vira o objeto com handleCodeInApp/url.
    expect(sendEmailVerification).toHaveBeenCalledWith(fakeUser, undefined);
    expect(updateProfile).toHaveBeenCalledWith(fakeUser, { displayName: 'Fulano' });

    // users/{uid} grava o email de verdade (minúsculo/trim).
    expect(setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ col: 'users', id: 'novo_uid' }),
      expect.objectContaining({ email: 'novo@gmail.com', phone: '11966666666' })
    );
    // phone_directory/{telefone} traduz telefone -> email pro login.
    expect(setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ col: 'phone_directory', id: '11966666666' }),
      expect.objectContaining({ uid: 'novo_uid', email: 'novo@gmail.com' })
    );
  });
});
