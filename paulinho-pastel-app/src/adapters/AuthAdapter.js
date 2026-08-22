import { auth, db, dbLite } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
// SDK Lite (REST avulso, sem canal de streaming) — ver comentário em firebase.js
// sobre por que essas leituras/escritas pontuais usam dbLite em vez de db.
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore/lite';
// `db` normal só entra aqui pra subscribeToBlockedUsers (tempo real na aba
// "Bloqueados" do admin) — mesmo motivo do subscribeToOrders em
// OrderAdapter.js: SDK Lite não suporta onSnapshot.
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { withTimeout } from '../utils/withTimeout';
import { ADMIN_PHONES } from '../config';

// Hexagonal Port Adapter: Isola o Firebase das telas React (SOLID, Kenzo Standard)
//
// SEGURANÇA: não existe mais bypass por número de telefone mágico ("999").
// Todo login passa pelo Firebase Auth de verdade. O papel (role: client | admin)
// fica salvo em Firestore (`users/{uid}`) e é definido no cadastro: sempre
// "client", EXCETO pros telefones em ADMIN_PHONES (o número de verdade do
// Paulinho + a credencial mestra do time) que já nascem "admin" — cada um se
// cadastra pelo próprio app, com a senha que escolher, e já cai direto no
// painel admin, sem precisar de ninguém promover manualmente pelo console.
// Qualquer outro telefone SEMPRE cai como "client", e essa mesma lista é
// espelhada no firestore.rules (users/{userId} allow create), então nem
// burlando o app alguém consegue se auto-promover usando outro número.
//
// Exceção só pra dev local: quem não tem acesso ao console do Firebase ainda
// consegue testar o painel admin. Não é bypass de login — a conta precisa
// existir de verdade (cadastro normal, senha normal, Firebase Auth de verdade).
// Só a checagem de "é admin?" é pulada, e só quando __DEV__ é true (nunca no
// build de produção). Qualquer telefone (DDD) 90000-XXXX vira admin em dev
// automaticamente — não precisa ser sempre o mesmo número, é só um prefixo
// reservado pra contas de teste.
const DEV_ADMIN_PREFIX = '90000';
// Credencial fixa reservada pro Paulinho testar localmente: (00) 00000-0000.
const DEV_ADMIN_FIXED_PHONE = '00000000000';

const isDevAdminPhone = (email) => {
  const digits = (email || '').split('@')[0];
  if (digits === DEV_ADMIN_FIXED_PHONE) return true;
  return digits.length >= 7 && digits.slice(2).startsWith(DEV_ADMIN_PREFIX);
};

export const login = async (phone, password) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const fakeEmail = `${cleanPhone}@paulinhopastel.com`;
  return withTimeout(signInWithEmailAndPassword(auth, fakeEmail, password));
};

export const register = async ({ name, email, phone, password }) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const fakeEmail = `${cleanPhone}@paulinhopastel.com`;
  const credential = await withTimeout(createUserWithEmailAndPassword(auth, fakeEmail, password));

  // A partir daqui a conta JÁ EXISTE de verdade no Firebase Auth — é o que
  // importa pro usuário ver "conta criada com sucesso". As duas chamadas
  // abaixo (updateProfile/setDoc) só preenchem dados complementares, e em
  // rede lenta (ex.: Wi-Fi da faculdade) podem estourar o timeout mesmo
  // quando a escrita termina de verdade no Firebase logo em seguida —
  // Promise.race não cancela a chamada real, só para de esperar por ela
  // aqui na tela. Por isso elas NÃO derrubam o cadastro: se estourarem,
  // só registramos um aviso no console e seguimos o fluxo de sucesso
  // normalmente, em vez de mostrar "erro" pra uma conta que já foi criada.
  try {
    await withTimeout(
      updateProfile(credential.user, { displayName: name.trim() }),
      25000
    );
  } catch (e) {
    console.warn('Nome do perfil demorou/falhou ao salvar, mas a conta foi criada:', e.message);
  }

  try {
    // As regras do Firestore exigem request.auth != null pra deixar gravar
    // em users/{uid}. Logo após criar a conta, o token de ID às vezes ainda
    // não terminou de propagar internamente no Firebase Auth — o SDK Lite
    // manda a chamada REST sem token válido e o Firestore responde 403
    // (mesmo a conta já existindo de verdade). Esperar getIdToken() aqui
    // garante que o token já está pronto antes da chamada.
    await credential.user.getIdToken();
    // Só os telefones em ADMIN_PHONES (Paulinho + credencial mestra) já
    // nascem admin; qualquer outro número é sempre "client".
    const role = ADMIN_PHONES.includes(cleanPhone) ? 'admin' : 'client';
    await withTimeout(
      setDoc(doc(dbLite, 'users', credential.user.uid), {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: cleanPhone,
        role,
        blocked: false,
        // Aceite dos termos (checkbox obrigatório em RegisterScreen, checado
        // ANTES de chamar esse register() — ver docs/feature-bloqueio-no-show.md)
        // — carimbo de quando essa conta concordou que pedido não
        // retirado/pago pode levar a bloqueio. Contas antigas (criadas antes
        // desse campo existir) simplesmente não têm esse campo; não
        // bloqueamos retroativamente por causa disso, só passa a valer pra
        // quem se cadastra a partir de agora.
        terms_accepted_at: serverTimestamp(),
      }),
      25000
    );
  } catch (e) {
    console.warn('Dados do usuário demoraram/falharam ao salvar, mas a conta foi criada:', e.message);
  }

  return credential;
};

export const getCurrentUser = () => {
  return auth.currentUser;
};

export const logout = () => signOut(auth);

// Retorna 'admin' ou 'client'. Usuários sem documento em Firestore
// (ex.: contas antigas criadas antes desta mudança) caem em 'client' por padrão,
// o que é o comportamento seguro (nega acesso admin por padrão) — EXCETO
// quando o telefone da própria conta é um dos ADMIN_PHONES, caso em que a
// gente recria o documento faltante na hora (ver comentário abaixo).
//
// Mantida como função separada (em vez de só usar getAccountStatus().role)
// porque é mais barata pro caso comum (login) — só olha o campo role — e
// porque telas antigas que só precisam do papel continuam funcionando sem
// mudança nenhuma.
export const getUserRole = async (uid) => {
  const status = await getAccountStatus(uid);
  return status.role;
};

// Retorna o status completo da conta pra decidir pra onde mandar o usuário
// depois do login: { role, blocked, blockedOrderSnapshot }. `blocked` só
// importa pra clientes (ver ClientBlockedScreen) — um admin nunca é
// bloqueado por esse fluxo. `blockedOrderSnapshot` é o "recibo" do pedido
// que gerou o bloqueio (ver markNoShow em OrderAdapter.js), usado pra
// montar a tela de aviso sem precisar de uma segunda leitura.
export const getAccountStatus = async (uid) => {
  if (__DEV__ && isDevAdminPhone(auth.currentUser?.email)) {
    return { role: 'admin', blocked: false, blockedOrderSnapshot: null };
  }
  try {
    // Mesmo motivo do register(): garante que o token de ID já propagou
    // antes da chamada REST do SDK Lite, senão o Firestore rejeita com 403
    // por request.auth vir nulo bem no instante seguinte ao login.
    await auth.currentUser?.getIdToken();
    const snap = await withTimeout(getDoc(doc(dbLite, 'users', uid)));
    if (snap.exists()) {
      const data = snap.data();
      return {
        role: data.role === 'admin' ? 'admin' : 'client',
        blocked: data.blocked === true,
        blockedOrderSnapshot: data.blocked_order_snapshot || null,
      };
    }

    // Autocura: o documento em users/{uid} não existe, mas a conta de
    // login (Firebase Auth) existe de verdade — isso só acontece quando o
    // setDoc lá no cadastro (register(), acima) falhou silenciosamente
    // (rede ruim/instável, ex.: wifi de faculdade) e caiu no catch que
    // não derruba o cadastro de propósito. Antes disso, a conta ficava
    // "client" pra sempre, mesmo sendo o telefone certo de admin — foi
    // exatamente esse o bug do login de admin "não funcionar" numa rede
    // ruim. Em vez de só aceitar isso, recriamos o documento agora, com o
    // role correto baseado no telefone da própria conta logada.
    const phoneDigits = (auth.currentUser?.email || '').split('@')[0];
    const role = ADMIN_PHONES.includes(phoneDigits) ? 'admin' : 'client';
    try {
      await withTimeout(setDoc(doc(dbLite, 'users', uid), {
        name: auth.currentUser?.displayName || '',
        email: auth.currentUser?.email || '',
        phone: phoneDigits,
        role,
        blocked: false,
      }));
    } catch (e) {
      // Se essa segunda tentativa também falhar (rede ainda ruim), não tem
      // problema: a gente ainda retorna o role certo pra essa sessão login
      // atual, e a autocura tenta de novo sozinha no próximo login.
      console.warn('Autocura do documento de usuário falhou, tenta de novo no próximo login:', e.message);
    }
    return { role, blocked: false, blockedOrderSnapshot: null };
  } catch (e) {
    console.error('Erro ao buscar papel do usuário:', e);
    return { role: 'client', blocked: false, blockedOrderSnapshot: null };
  }
};

// Tempo real da aba "Bloqueados" do admin (AdminBlockedScreen). Mesmo
// padrão de reconexão automática do subscribeToOrders em OrderAdapter.js:
// se o listener morrer por um erro transitório, ele se reinscreve sozinho
// em vez de deixar a lista travada em "vazia" pra sempre.
export const subscribeToBlockedUsers = (onUpdate) => {
  let currentUnsubscribe = null;
  let stopped = false;

  const start = () => {
    const q = query(collection(db, 'users'), where('blocked', '==', true));
    currentUnsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      onUpdate(usersData);
    }, async (error) => {
      console.error('Erro ao ouvir contas bloqueadas — reconectando:', error);
      if (stopped) return;
      try { await auth.currentUser?.getIdToken(true); } catch (e) { /* ignora, tenta mesmo assim */ }
      setTimeout(() => { if (!stopped) start(); }, 3000);
    });
  };

  start();

  return () => {
    stopped = true;
    if (currentUnsubscribe) currentUnsubscribe();
  };
};
