# Briefing — Paulinho Pastel (Sistema PP)

Documento de contexto pra puxar em qualquer conversa nova. Cole ele inteiro
(ou o link, se tiver publicado em algum lugar) no início de uma sessão nova
pra eu retomar de onde parou sem precisar reexplicar tudo.

## O que é

App de pedidos pra uma barraca de pastel (dono: Paulinho/Paulo César da
Silva). Cliente pede pelo celular sem fila, admin (o Paulinho) gerencia
cardápio, fila de pedidos e financeiro. React Native + Expo, rodando como
PWA (funciona também instalado na tela de início do celular).

## Stack e onde tudo mora

- **App**: React Native + Expo SDK 57, `react-native-web` (build pra web),
  React Navigation (stack + bottom-tabs).
- **Backend**: Firebase — Auth (login por telefone, disfarçado de e-mail
  `TELEFONE@paulinhopastel.com`), Firestore (banco), Hosting (PWA).
  Projeto Firebase: **`paulinho-pastel-dev`**.
- **Repo**: `github.com/KenzoOsako/Sistema-PP`, pasta `paulinho-pastel-app/`
  dentro dele (o repo tem outras coisas na raiz).
- **PC do Felipe**: pasta local `C:\Projetos\Sistema-PP\paulinho-pastel-app`
  — essa pasta **não tem `.git`** nela mesma. Fluxo de commit é: clonar o
  repo fresco numa pasta irmã (`C:\Projetos\Sistema-PP-repo`), `robocopy` o
  conteúdo de `paulinho-pastel-app` pra dentro do clone, e daí sim
  `git add/commit/push` de dentro do clone. Local isso tudo é
  `C:\Projetos\Sistema-PP` (a pasta conectada via bridge do Claude).
- **App ao vivo**: https://paulinho-pastel-dev.web.app

## Como buildar e publicar (sempre nessa ordem)

```powershell
# 1. Commitar o código (na pasta do CLONE, não na original)
cd C:\Projetos\Sistema-PP-repo
robocopy C:\Projetos\Sistema-PP\paulinho-pastel-app paulinho-pastel-app /E /XD node_modules .expo dist
git add -A
git commit -m "..."
git push

# 2. Build + deploy (na pasta ORIGINAL, que tem node_modules — o clone não tem)
cd C:\Projetos\Sistema-PP\paulinho-pastel-app
npm run build:web
npx firebase-tools deploy --only hosting,firestore:rules
```

Rodar dev server local: `npm start` (ou o comando padrão do Expo) dentro da
pasta original.

**Pegadinha de cache**: o `firebase.json` já tem `headers` configurados pra
não cachear `index.html`/`manifest.json` (só os JS com hash no nome ficam em
cache longo). Isso foi corrigido numa sessão anterior — se voltar a acontecer
"deploy não aplicou", é cache do navegador do celular/PC de quem testou, não
do servidor: manda dar Ctrl+Shift+R ou limpar cache do site.

## Login e papéis (admin vs cliente)

Não existe mais promoção manual de admin pelo console do Firebase. A regra
(código em `src/adapters/AuthAdapter.js` + espelhada em `firestore.rules`,
função tem que ficar igual nos dois lugares):

- Todo cadastro novo vira `role: 'client'`, **exceto** quem se cadastra com
  um telefone que está em `ADMIN_PHONES` (`src/config.js`) — esses já nascem
  `role: 'admin'`, sem precisar de ninguém mexer no console.
- `ADMIN_PHONES` hoje tem dois números:
  - `19987011974` — telefone de verdade do Paulinho (mesmo da chave Pix).
  - `99999999999` — **credencial mestra do time** (não é telefone real),
    criada pra dar acesso admin de qualquer lugar sem depender do telefone
    do Paulinho. Cada pessoa que usar isso cadastra com a própria senha —
    ninguém (nem o Claude) guarda essa senha em lugar nenhum.
- **Autocura**: se o cadastro falhar em salvar o documento em
  `users/{uid}` (rede ruim, timeout — aconteceu de verdade numa rede de
  faculdade), a conta existe no Firebase Auth mas fica "presa" como cliente
  pra sempre. `getAccountStatus()` (a função que o login realmente chama
  hoje — `getUserRole()` virou um wrapper fino em cima dela) detecta isso
  (documento não existe) e recria o documento certo na hora, baseado no
  telefone da própria conta. Corrigido numa sessão recente — antes disso,
  login de admin podia "não funcionar" silenciosamente em rede instável.
  `getAccountStatus()` também é quem decide se um CLIENTE está bloqueado
  (ver seção de bloqueio abaixo) e manda ele pra tela certa no login.

Não existe mais nenhuma conta fixa de admin com credencial conhecida — foi
apagada de propósito (reset completo do banco pedido pelo Felipe). Ninguém,
incluindo o Claude, tem/guarda senha de ninguém.

## Estrutura do código

```
App.js                          — navegação raiz (stack + tabs do admin)
src/config.js                   — Pix, ADMIN_PHONES, NO_SHOW_TOLERANCE_MINUTES, etc.
src/theme/index.js               — cores, spacing, radii, sombras (design system)
src/services/firebase.js         — inicialização do Firebase (db normal + dbLite)
src/adapters/                    — camada que isola Firebase da UI
  AuthAdapter.js                 — login/cadastro/role/status da conta (bloqueio)
  OrderAdapter.js                — pedidos (criar, status, no-show, tempo real)
  ProductAdapter.js               — cardápio (criar/editar/pausar/excluir produto)
src/screens/
  auth/          LoginScreen, RegisterScreen
  client/        ClientMenuScreen, CartScreen, CheckoutScreen, ClientOrderStatusScreen, ClientBlockedScreen
  admin/         AdminFilaScreen, AdminMenuScreen, AdminDashboardScreen, AdminBlockedScreen
src/components/  Header (selo de data em meia-lua), Button, AppAlertModal, ConfirmModal
src/utils/       pixEmv (payload do QR Pix), phoneMask, withTimeout, notifiedOrders, showAlert
docs/            este briefing + feature-bloqueio-no-show.md (feature implementada)
```

## Decisões técnicas importantes (não reverter sem motivo)

- **Firestore Lite (`firebase/firestore/lite`) pra operações pontuais**
  (create/update/delete/get), **Firestore normal (`onSnapshot`) só pra
  tempo real** (fila do admin, pedidos do cliente, cardápio). Lite não
  suporta listener contínuo.
- **`withTimeout()`** envolve toda Promise única do Lite — sem isso, rede
  ruim trava a UI num "Enviando..." pra sempre sem nunca mostrar erro.
- **`onSnapshot` que recebe erro morre pra sempre** (comportamento do
  Firestore) — por isso `subscribeToOrders`/os listeners do cliente se
  reinscrevem sozinhos com um novo token em vez de só logar o erro.
- **`jest.config.js`** existe separado do `package.json` porque a chave
  `"jest"` no `package.json` substituiria (não estenderia) o preset do
  `jest-expo`, quebrando o transform de ESM do Firebase.
- **`hermes-parser` forçado em `overrides`** no `package.json` (versão
  0.37.0) — sem isso, `@react-native/codegen` puxa uma versão antiga e
  quebrada dessa dependência transitiva.
- **CI** (`.github/workflows/ci.yml`, "Full-Stack CI/CD Gatekeeper") roda
  `npm ci --legacy-peer-deps && npm test` em todo push/PR pra `main`. Tá
  verde.

## Cardápio e financeiro

19 produtos reais (15 salgados + 4 doces), preços reais tirados de foto do
cardápio físico. Custo de cada item é uma estimativa bottom-up (massa +
óleo + embalagem + recheio + rateio de custo fixo mensal — trailer, gás,
transporte — dividido por um volume mensal assumido), não um chute de
margem fixa. Produto tem `active: boolean` — `false` = pausado (some do
cardápio do cliente, mas o admin continua vendo/gerenciando).

## Fluxo de pedido e status

`orders.status`: `received` → `preparing` → `ready` → `completed` (ou
`no_show`, ver seção de bloqueio abaixo).

- Pix: pagamento é confirmado no início (`received` → `preparing` já é
  "Confirmar Pix"). No fim, o botão do admin é **"Entregue ✅"** (não pede
  pagamento de novo).
- Cartão/dinheiro na retirada (`on_pickup`): só é cobrado na entrega, então
  o botão final é **"Finalizado ✅"**.
- Os dois, ao clicar, jogam o pedido pra `completed`, que some da fila do
  admin mas continua contando nas métricas do Financeiro.
- Ao virar `ready`, o pedido ganha `ready_at` (carimbo usado pela janela de
  tolerância do botão "Cliente Não Retirou" — ver seção de bloqueio).
- Notificação de "pronto" pro cliente dispara **uma única vez por pedido**
  (persistida em `localStorage`, ver `src/utils/notifiedOrders.js`) — antes
  disso podia repetir toda vez que o cliente reabria o app.

## Pix

`config.js` guarda a chave em formato local (`19987011974`, sem `+55`) —
é o que aparece na tela e é copiado. O `+55` exigido pelo Banco Central no
payload EMV do QR é adicionado só na hora de gerar o QR
(`toDictPhoneKey()` em `src/utils/pixEmv.js`), nunca no que o cliente vê.

## Bloqueio por não comparecimento ("Cliente Não Retirou")

Implementado (sessão de 21/08/2026) — detalhe completo em
`docs/feature-bloqueio-no-show.md`. Resumo rápido: cadastro tem checkbox de
termos obrigatório; a fila do admin ganhou o botão "Cliente Não Retirou"
(com janela de tolerância configurável, `NO_SHOW_TOLERANCE_MINUTES` em
`config.js`); Pix só sai da fila sem dívida, cartão/dinheiro bloqueia a
conta (`users.blocked`); cliente bloqueado vê uma tela de "recibo" no
próximo login em vez do cardápio; nova aba "Bloqueados" no admin resolve
via "Pago ✅" (conta como venda no dia da quitação) ou "Perdoar Dívida"
(vira prejuízo no Financeiro, nunca venda).

**Importante pro próximo deploy**: além do `firebase deploy --only
hosting,firestore:rules` de sempre, o `firestore.rules` MUDOU pra essa
feature (admin agora lê/atualiza campos de bloqueio de qualquer usuário) —
se esquecer de publicar as regras, a aba Bloqueados fica com permissão
negada em produção mesmo com o app já atualizado.

Pontos ainda não validados com o Paulinho de verdade (só decisões do
Felipe pra destravar a implementação, fáceis de revisar): os 20 minutos de
tolerância, e o modelo "um bloqueio já trava tudo" (sem acumular múltiplas
dívidas por cliente). Ver detalhes em `docs/feature-bloqueio-no-show.md`.

## Regras de segurança do Claude que valem pra esse projeto

Coisas que eu (Claude) nunca faço nesse projeto, mesmo autorizado: digitar
senha em campo nenhum (nem a minha, nem de ninguém), criar conta em nome de
alguém, ou apagar dado permanentemente sem o usuário apertar o botão ele
mesmo (oriento com o comando/passo exato, mas quem executa é sempre o
Felipe). Isso já apareceu nesse projeto (reset do banco, apagar contas) e
vai continuar valendo em conversas futuras.

## Onde as coisas ficam quando eu (Claude) trabalho nisso

Ambiente de trabalho: sessão cloud, arquivos ficam espelhados em
`/mnt/user-data/uploads/Sistema-PP/paulinho-pastel-app/` durante a sessão.
Depois de editar, sempre: `npm test` + `npm run build:web` pra validar,
`SendUserFile` pra entregar os arquivos, e
`mcp__remote-devices__device_commit_files` pra gravar direto em
`C:\Projetos\Sistema-PP\...` no PC do Felipe (só funciona com o app da
Claude aberto lá — se a conexão cair, os arquivos ficam entregues na
conversa mesmo assim, só não vão sozinhos pra pasta).
