# Feature — antifraude por email (Fase 1 do batch de feedback de 22/08/2026)

Status: **implementado**, pendente de deploy/teste real. Cobre o primeiro
item do plano de fases combinado com o Felipe (antifraude → botões de risco
→ visual/navegação).

## O problema

Hoje qualquer pessoa cria uma conta com telefone/email/nome inventados — não
existe verificação nenhuma. Isso faz o bloqueio por não comparecimento (ver
`docs/feature-bloqueio-no-show.md`) perder o efeito: quem é bloqueado só
precisa criar outra conta na hora, com dado falso de novo, e continuar
pedindo. O Felipe pediu uma solução **gratuita** (sem SMS pago, sem plano
Blaze do Firebase).

## Decisão técnica central

O Firebase Auth só manda o email de verificação (`sendEmailVerification`,
grátis, funciona no plano Spark) pro email que está cadastrado *na própria
conta* — não dá pra mandar pra um endereço avulso. Mas até agora a conta do
Auth usava um email **disfarçado** (`telefone@paulinhopastel.com`) só pra
permitir login digitando telefone. Não dava pra verificar esse email porque
ele nem existe de verdade.

Solução: a partir de agora, cadastros **novos** usam o **email de verdade**
digitado no formulário como o email da conta no Firebase Auth. O login
continua sendo por telefone — o app resolve telefone → email por trás,
consultando um novo documento público `phone_directory/{telefone}`.

**Contas antigas (criadas antes desta mudança, ainda com o email
disfarçado) não são afetadas** — o Felipe confirmou que essas são só contas
de teste e serão apagadas antes do lançamento, então não precisavam de
migração, só não podiam quebrar enquanto ainda existirem. `login()` tem
fallback pro padrão antigo, e o gate de "email confirmado" (abaixo) ignora
quem ainda está no email disfarçado.

## Fluxo implementado

**1. Cadastro** (`RegisterScreen.js`, sem mudança visual — já tinha campo de
email): `AuthAdapter.register()` agora:
- Confere em `phone_directory/{telefone}` se esse telefone já tem dono
  *antes* de criar a conta no Auth (evita conta órfã se o telefone já
  estiver em uso — a unicidade do Auth agora é por email, não mais por
  telefone).
- Cria a conta no Firebase Auth com o **email de verdade** (não mais o
  disfarçado).
- Chama `sendEmailVerification()` (best-effort, não derruba o cadastro se
  falhar/demorar — mesma filosofia de resiliência do resto do arquivo).
- Grava `users/{uid}` (como antes) e o novo `phone_directory/{telefone} = {
  uid, email }` (documento imutável — primeiro cadastro "dono" aquele
  telefone pra sempre).

**2. Login** (`LoginScreen.js`, sem mudança visual — continua só telefone +
senha): `AuthAdapter.login()` consulta `phone_directory/{telefone}` (leitura
pública, sem precisar estar logado) pra achar o email de verdade e logar com
ele. Se não encontrar (conta antiga, ou a consulta falhar por rede ruim),
cai no padrão antigo (`telefone@paulinhopastel.com`).

**3. Gate no pedido**: `OrderAdapter.createOrder()` bloqueia a criação do
pedido se a conta for **nova** (email de verdade) e ainda **não confirmada**
— lança erro com `code: 'email-not-verified'`, reenviando o email de
verificação automaticamente (best-effort) no processo. `CheckoutScreen.js`
mostra um alerta específico nesse caso. O mesmo gate existe no servidor
(`firestore.rules`, `orders` → `allow create`), checando o claim padrão
`request.auth.token.email_verified` — proteção de verdade, não só de UI.

**4. Soft-block por dispositivo** (`src/utils/deviceBlockMarker.js`, só
web/PWA — usa `localStorage`): quando um cliente bloqueado abre
`ClientBlockedScreen`, o navegador/aparelho fica marcado. Se alguém tentar
criar conta nova nesse mesmo aparelho depois, `RegisterScreen` mostra um
aviso (não bloqueia o cadastro — é só fricção a mais, de graça, fácil de
contornar por alguém técnico limpando dados do navegador, mas pega o caso
comum).

## Banco de dados (o que mudou de verdade)

- `users/{uid}.email` passa a ser o email de verdade (era só decorativo
  antes, digitado no formulário mas nunca usado como identidade de login).
- Nova coleção `phone_directory/{telefone} = { uid, email }` — tradução
  pública telefone → email, só pra permitir login por telefone. Leitura
  pública, criação só pelo próprio dono, **imutável** depois de criada.
- `firestore.rules`: `orders` → `create` agora também exige
  `request.auth.token.email_verified == true` (contas novas) OU o email
  disfarçado (contas antigas, grandfathered).
- **Esse arquivo precisa ser publicado** (`firebase deploy --only
  firestore:rules`) além do deploy normal de hosting, senão contas novas
  ficam bloqueadas de pedir mesmo com o email confirmado (o cliente
  confirma, mas o token antigo ainda não reflete isso nas regras até um
  `getIdToken(true)` — o app já faz isso sozinho, mas as regras publicadas
  também precisam estar atualizadas).

## Limitações conhecidas (conversadas com o Felipe)

- Email não é um recurso infinito de verdade (Gmail aceita
  `algo+123@gmail.com`, existem emails descartáveis) — não impede 100% quem
  está determinado a burlar, mas mata o golpe casual (hoje, fricção zero).
- O soft-block por dispositivo é fácil de contornar (limpar dados do
  navegador, trocar de aparelho) — é só uma camada a mais, não uma trava de
  verdade.
- Contas antigas continuam sem qualquer verificação — decisão consciente,
  serão apagadas antes do lançamento.

## Testes

`src/adapters/__tests__/AuthAdapter.test.js` (novo arquivo): cobre login
resolvendo telefone→email via `phone_directory` (achado, não achado, e
consulta com erro de rede — todos com fallback correto), e cadastro (recusa
telefone duplicado sem criar conta órfã no Auth; cadastro feliz grava email
real, chama verificação, grava `phone_directory`).

`src/adapters/__tests__/OrderAdapter.test.js` ganhou 2 casos novos: bloqueia
pedido de conta nova sem email confirmado; deixa passar conta antiga (email
disfarçado) mesmo sem `emailVerified`.

`npm test` (17/17) e `npm run build:web` rodados localmente e verdes antes
de entregar.

## Próximas fases (já combinadas com o Felipe)

- **Fase 2 — implementada** (sessão de 22/08/2026, ver
  `docs/feature-fase2-botoes-cardapio-admin.md`): ícone discreto pro
  "Cliente Não Retirou" na Fila do admin; abas Salgados/Doces também no
  Cardápio do admin, com a mesma navegação por clique do cardápio do
  cliente.
- **Fase 3 — não implementada ainda**: Header mais enxuto (hoje 3 camadas
  empilhadas) + menu escondido no admin (só Fila fixa, resto atrás de um
  ☰) + loja aberta/fechada controlada pelo Paulinho (aviso "Estamos
  fechados" pro cliente quando fechada).
