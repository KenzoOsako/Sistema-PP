import { db, dbLite, auth } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { doc as docLite, setDoc, getDoc } from 'firebase/firestore/lite';
import { withTimeout } from '../utils/withTimeout';

// Status "loja aberta/fechada" (Fase 3) — documento único em
// store_status/main, com um campo: { open: boolean }.
//
// Documento pode não existir ainda (app rodando antes de qualquer admin
// mexer nesse controle, ou banco recém resetado) — em todos os lugares
// (aqui, na regra em firestore.rules e no fallback do OrderAdapter) o
// padrão pra "documento não existe" é sempre `open: true`, pra essa feature
// nova nunca travar pedido de ninguém sozinha, sem o Paulinho ter feito
// nada.
const STORE_STATUS_DOC = 'main';

export const subscribeToStoreStatus = (onUpdate) => {
  // Mesmo padrão de reconexão do resto do app (ver OrderAdapter/
  // ProductAdapter): um erro transitório no listener mata ele pra sempre,
  // então essa função se reinscreve sozinha em vez de só logar o erro.
  let currentUnsubscribe = null;
  let stopped = false;

  const start = () => {
    currentUnsubscribe = onSnapshot(
      doc(db, 'store_status', STORE_STATUS_DOC),
      (snapshot) => {
        const open = snapshot.exists() ? snapshot.data().open !== false : true;
        onUpdate(open);
      },
      async (error) => {
        console.error('Erro ao ouvir status da loja em tempo real — reconectando:', error);
        if (stopped) return;
        try { await auth.currentUser?.getIdToken(true); } catch (e) { /* ignora, tenta mesmo assim */ }
        setTimeout(() => { if (!stopped) start(); }, 3000);
      }
    );
  };

  start();

  return () => {
    stopped = true;
    if (currentUnsubscribe) currentUnsubscribe();
  };
};

// Leitura pontual (sem tempo real) usada pelo OrderAdapter antes de criar um
// pedido — checagem client-side só pra dar uma mensagem amigável na hora; a
// trava de verdade é a regra isStoreOpen() em firestore.rules (essa aqui dá
// pra "burlar" mudando o código do cliente, a de lá não).
export const getStoreOpen = async () => {
  const snap = await withTimeout(getDoc(docLite(dbLite, 'store_status', STORE_STATUS_DOC)));
  return snap.exists() ? snap.data().open !== false : true;
};

// Só admin chama isso (a regra do Firestore também garante isso do lado do
// servidor). merge:true porque o documento pode ainda não existir na
// primeira vez que o Paulinho mexer no interruptor.
export const setStoreOpen = async (open) => {
  await auth.currentUser?.getIdToken();
  return withTimeout(setDoc(docLite(dbLite, 'store_status', STORE_STATUS_DOC), { open: !!open }, { merge: true }));
};
