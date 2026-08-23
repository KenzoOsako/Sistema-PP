import { auth, db, dbLite } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile, sendEmailVerification, applyActionCode } from 'firebase/auth';
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

// ETAPA 3 (23/08/2026) — deep link do e-mail de confirmação: antes, o link
// mandado por sendEmailVerification abria uma página GENÉRICA hospedada
// pelo próprio Firebase (fora do app, sem a cara do Paulinho Pastel, e sem
// trazer o cliente de volta pro app depois). Com `handleCodeInApp: true` e
// uma `url` apontando pro próprio PWA, o Firebase monta o link do e-mail
// apontando pra CÁ (com `?mode=verifyEmail&oobCode=...` na query string) em
// vez da página genérica — é a própria tela do app (ver
// EmailVerificationLandingScreen.js, montada direto em App.js quando esses
// parâmetros aparecem na URL) que aplica o código e confirma.
//
// Só faz sentido no WEB (é o PWA que está publicado — ver briefing do
// projeto): `window` não existe em React Native puro (iOS/Android nativo),
// então em qualquer outro ambiente isso volta pro comportamento padrão do
// Firebase (undefined = sem actionCodeSettings).
export const getEmailActionCodeSettings = () => {
  // No ambiente de teste (Jest) `window` existe como objeto vazio (mock do
  // próprio jest-expo), mas sem `window.location` de verdade — por isso a
  // checagem confere os dois, não só `typeof window`. Achado rodando o
  // teste de verdade (`npm test`), não só lendo código: sem o segundo
  // `&& window.location`, isso quebrava com "Cannot read properties of
  // undefined (reading 'origin')" no meio do cadastro, dentro do próprio
  // Jest.
  if (typeof window === 'undefined' || !window.location) return undefined;
  return {
    url: window.location.origin + '/',
    handleCodeInApp: true,
  };
};

// SEGURANÇA/ANTIFRAUDE (ver docs/feature-antifraude-email.md): a partir
// desta mudança, a conta do Firebase Auth passa a usar o EMAIL DE VERDADE
// digitado no cadastro (não mais o email disfarçado telefone@paulinho
// pastel.com). Isso é o que permite mandar um email de verificação real e
// de graça (sendEmailVerification, sem precisar de plano pago nem de
// servidor de email próprio). O login continua sendo por telefone — o
// telefone é traduzido pro email de verdade por trás, consultando o
// documento público em `phone_directory/{telefone}` (ver login() abaixo).
//
// Contas ANTIGAS (criadas antes desta mudança, com o email disfarçado)
// continuam funcionando exatamente como antes — login() tem um fallback
// pro padrão antigo, e o gate de "precisa confirmar email" (ver
// OrderAdapter.createOrder) ignora quem ainda está no email disfarçado.
// São contas de teste que serão apagadas antes do lançamento (decisão do
// Felipe), então não precisam de migração — só não podem quebrar enquanto
// ainda existirem.
export const login = async (phone, password) => {
  const cleanPhone = phone.replace(/\D/g, '');
  let emailToUse = `${cleanPhone}@paulinhopastel.com`; // fallback: contas antigas

  try {
    const dirSnap = await withTimeout(getDoc(doc(dbLite, 'phone_directory', cleanPhone)));
    if (dirSnap.exists() && dirSnap.data().email) {
      emailToUse = dirSnap.data().email;
    }
  } catch (e) {
    // phone_directory é só uma tradução telefone->email; se a consulta
    // falhar (rede ruim) ou o telefone não estiver lá (conta antiga),
    // seguimos com o email disfarçado de fallback em vez de travar o login.
    console.warn('Não achou phone_directory pra esse telefone, tentando padrão antigo:', e.message);
  }

  return withTimeout(signInWithEmailAndPassword(auth, emailToUse, password));
};

export const register = async ({ name, email, phone, password }) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const realEmail = email.trim().toLowerCase();

  // Confere ANTES de criar a conta no Firebase Auth se esse telefone já tem
  // dono. Sem essa checagem, dois emails diferentes poderiam cadastrar o
  // mesmo telefone (a unicidade do Auth agora é por EMAIL, não mais por
  // telefone), e o segundo cadastro ia "roubar" silenciosamente o telefone
  // de login do primeiro (ver phone_directory abaixo, allow update: false —
  // o documento é imutável, então sem essa pré-checagem o segundo cadastro
  // simplesmente falharia depois de já ter criado a conta Auth, deixando
  // uma conta órfã pra trás).
  try {
    const existingDir = await withTimeout(getDoc(doc(dbLite, 'phone_directory', cleanPhone)));
    if (existingDir.exists()) {
      const err = new Error('Este telefone já está cadastrado. Faça login em vez de criar outra conta.');
      err.code = 'phone-already-registered';
      throw err;
    }
  } catch (e) {
    if (e.code === 'phone-already-registered') throw e;
    // Falha de rede na pré-checagem: segue o cadastro mesmo assim (mesma
    // filosofia de resiliência do resto do arquivo) — na pior das
    // hipóteses, a regra do Firestore rejeita a escrita de phone_directory
    // lá na frente se realmente já existir, e o usuário só não ganha o
    // aviso mais amigável antes de tentar.
  }

  const credential = await withTimeout(createUserWithEmailAndPassword(auth, realEmail, password));

  // A partir daqui a conta JÁ EXISTE de verdade no Firebase Auth — é o que
  // importa pro usuário ver "conta criada com sucesso". As chamadas abaixo
  // (sendEmailVerification/updateProfile/setDoc) só complementam, e em
  // rede lenta (ex.: Wi-Fi da faculdade) podem estourar o timeout mesmo
  // quando a escrita termina de verdade no Firebase logo em seguida —
  // Promise.race não cancela a chamada real, só para de esperar por ela
  // aqui na tela. Por isso elas NÃO derrubam o cadastro: se estourarem,
  // só registramos um aviso no console e seguimos o fluxo de sucesso
  // normalmente, em vez de mostrar "erro" pra uma conta que já foi criada.
  try {
    await withTimeout(sendEmailVerification(credential.user, getEmailActionCodeSettings()), 25000);
  } catch (e) {
    console.warn('Email de verificação demorou/falhou ao enviar, mas a conta foi criada:', e.message);
  }

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
        email: realEmail,
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

  try {
    // Tradução pública telefone->email (ver comentário grande acima de
    // login()). Documento imutável de propósito (firestore.rules: allow
    // update/delete: if false) — primeiro cadastro "dono" aquele telefone
    // pra sempre, o que também é o que garante a unicidade de telefone
    // agora que o Auth em si só garante unicidade de email.
    await withTimeout(
      setDoc(doc(dbLite, 'phone_directory', cleanPhone), {
        uid: credential.user.uid,
        email: realEmail,
      }),
      25000
    );
  } catch (e) {
    // Se isso falhar de vez (rede ruim demais), o login por telefone dessa
    // conta específica cai no fallback de email disfarçado (que não existe
    // pra essa conta, então o login vai falhar) — pior caso é o usuário
    // precisar refazer o cadastro. Não é ideal, mas é raro (mesma categoria
    // de falha que já existe hoje pro setDoc de users/{uid} acima) e não
    // vale complicar o fluxo por causa disso agora.
    console.warn('phone_directory não salvou, login por telefone pode falhar pra essa conta:', e.message);
  }

  return credential;
};

// Reenvia o email de verificação (usuário pediu de novo, ou o primeiro
// pode ter caído no spam/demorado). O próprio Firebase limita a frequência
// de reenvio (erro auth/too-many-requests se pedir demais rápido), então
// não precisamos implementar nosso próprio rate-limit aqui.
export const resendVerificationEmail = async () => {
  if (!auth.currentUser) throw new Error('Nenhum usuário logado.');
  return withTimeout(sendEmailVerification(auth.currentUser, getEmailActionCodeSettings()));
};

// Completa a confirmação de e-mail a partir do link clicado (ver
// EmailVerificationLandingScreen.js). `oobCode` vem da URL
// (?mode=verifyEmail&oobCode=...) que o próprio Firebase gerou e mandou por
// e-mail — aplicá-lo é o que de fato marca email_verified: true na conta.
//
// Se este MESMO navegador/aba já tiver uma sessão logada (o caso mais
// comum: a pessoa clicou no link no mesmo aparelho onde se cadastrou, só
// que numa aba nova que o app de e-mail abriu), atualiza essa sessão também
// — sem isso, a aba original ficaria "presa" achando que o email ainda não
// foi confirmado até o usuário fazer login de novo.
export const completeEmailVerificationFromLink = async (oobCode) => {
  await withTimeout(applyActionCode(auth, oobCode));
  if (auth.currentUser) {
    try { await auth.currentUser.reload(); } catch (e) { /* segue mesmo assim */ }
    try { await auth.currentUser.getIdToken(true); } catch (e) { /* regra rejeita se o token ainda tiver velho */ }
  }
};

// Recarrega o usuário atual do Firebase Auth (pega o emailVerified mais
// recente, caso o link tenha sido clicado em outra aba/aparelho) e força
// um novo token de ID, pra que as regras do Firestore também já enxerguem
// o email como verificado na próxima escrita.
export const refreshEmailVerifiedStatus = async () => {
  if (!auth.currentUser) return false;
  try { await auth.currentUser.reload(); } catch (e) { /* segue com o que já tem em cache */ }
  if (auth.currentUser.emailVerified) {
    try { await auth.currentUser.getIdToken(true); } catch (e) { /* regra vai rejeitar se o token ainda tiver velho */ }
  }
  return auth.currentUser.emailVerified === true;
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
