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
  React Navigation (stack). Desde a Fase 3, a área admin não usa mais
  `bottom-tabs` — só a Fila é fixa, o resto (Cardápio/Financeiro/Bloqueados)
  são telas de stack abertas por um menu ☰.
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
App.js                          — navegação raiz (stack; admin = Fila fixa + telas atrás do ☰)
src/config.js                   — Pix, ADMIN_PHONES, NO_SHOW_TOLERANCE_MINUTES, etc.
src/theme/index.js               — cores, spacing, radii, sombras (design system)
src/services/firebase.js         — inicialização do Firebase (db normal + dbLite)
src/adapters/                    — camada que isola Firebase da UI
  AuthAdapter.js                 — login/cadastro/role/status da conta (bloqueio)
  OrderAdapter.js                — pedidos (criar, status, no-show, tempo real)
  ProductAdapter.js               — cardápio (criar/editar/pausar/excluir produto)
  StoreStatusAdapter.js           — loja aberta/fechada (Fase 3)
src/screens/
  auth/          LoginScreen, RegisterScreen
  client/        ClientMenuScreen, CartScreen, CheckoutScreen, ClientOrderStatusScreen, ClientBlockedScreen
  admin/         AdminFilaScreen, AdminMenuScreen, AdminDashboardScreen, AdminBlockedScreen
src/components/  Header (chip de data, Fase 3), Button, AppAlertModal, ConfirmModal, AdminMenuModal (Fase 3)
src/utils/       pixEmv (payload do QR Pix), phoneMask, withTimeout, notifiedOrders, showAlert, deviceBlockMarker
docs/            este briefing + feature-bloqueio-no-show.md +
                 feature-antifraude-email.md + feature-fase2-botoes-cardapio-admin.md +
                 feature-fase3-header-menu-loja.md
                 (features implementadas)
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

## Antifraude por email (Fase 1 do batch de 22/08/2026)

Implementado (sessão de 22/08/2026) — detalhe completo em
`docs/feature-antifraude-email.md`. Resumo rápido: pra o bloqueio acima ter
efeito de verdade (sem burlar criando conta nova na hora), cadastros novos
passam a usar o **email de verdade** como email da conta no Firebase Auth
(era o disfarçado `telefone@paulinhopastel.com` antes) — isso permite
`sendEmailVerification()` de graça. Login continua só com telefone: o app
resolve telefone→email por trás via a nova coleção pública
`phone_directory/{telefone}`. Pedido só pode ser feito com o email
confirmado (gate no client E no `firestore.rules`). Também tem um
soft-block bem simples por `localStorage`: aparelho que já mostrou a tela
de bloqueado avisa (não impede) na tela de cadastro. **Contas antigas
(email disfarçado) não são afetadas** — o Felipe confirmou que vai apagar
todas as contas de teste atuais antes do lançamento, então não precisavam
de migração.

**Importante pro próximo deploy**: `firestore.rules` mudou de novo (nova
coleção `phone_directory` + gate de `email_verified` em `orders`) — publicar
junto com o resto.

## Fase 2 — botões de risco + abas no Cardápio do admin

Implementado e **testado ao vivo, confirmado funcionando** (sessão de
22/08/2026, com o Felipe autorizando senha só pra essa sessão) — detalhe
completo em `docs/feature-fase2-botoes-cardapio-admin.md`. Resumo rápido:
"Cliente Não Retirou" na Fila do admin virou um ícone pequeno (🚫) no canto
do card em vez de um botão largo (menos risco de clique errado com
"Iniciar Preparo"). O Cardápio do admin ganhou abas Salgados/Doces com a
mesma navegação por clique do cardápio do cliente (mesmas funções de
rolagem, copiadas de propósito — ver comentário no código). Produto ganhou
campo `category` no formulário do admin.

**Bug real achado e corrigido no teste ao vivo**: a lista de produtos só
desenhava os primeiros ~10 itens (`initialNumToRender` padrão da
`VirtualizedList`) e isso não se resolvia sozinho parado — só com uma
rolagem manual. Corrigido com `initialNumToRender={50}` nos dois cardápios
(admin e cliente). Depois da correção, testado com clique real do mouse
nos dois sentidos (Doces → Salgados) e confirmado por captura de tela.

## Fase 3 — Header enxuto, menu ☰ no admin e loja aberta/fechada

Implementado (sessão de 22/08/2026), **ainda não testado ao vivo nem
validado com o Paulinho** — detalhe completo em
`docs/feature-fase3-header-menu-loja.md`. Resumo rápido: Header virou uma
linha só (o respiro do topo usa a safe-area real do aparelho em vez de uma
faixa fixa de 44px que sobrava inteira no PWA/web) — isso muda o visual que
o Paulinho já tinha aprovado (a meia-lua virou um chip simples), então
manda um print pra ele antes de considerar essa tela definitiva. A área
admin deixou de ser um Tab.Navigator com 4 abas: só a Fila é fixa, e
Cardápio/Financeiro/Bloqueados abrem por um novo menu ☰ no header da Fila
(`AdminMenuModal`), que também é onde o "Sair" foi morar. E tem um
interruptor novo de **loja aberta/fechada** nesse mesmo menu: fechada, o
cliente ainda vê o cardápio (banner avisando), mas o botão final do
Checkout ("Já paguei, enviar pedido!") fica desabilitado — e a regra do
Firestore (`isStoreOpen()`, só no create de `orders`) garante isso de
verdade, não só na tela.

**Importante pro próximo deploy**: `firestore.rules` mudou de novo (nova
coleção `store_status` + `isStoreOpen()` no create de `orders`) — publicar
junto com o resto, senão a loja "fechada" no app não bloqueia pedido
nenhum de verdade.

**Pendente antes de considerar essa fase fechada**: rodar `npm test` e
`npm run build:web` de verdade (essa sessão não teve como — ver a seção
"Onde as coisas ficam" logo abaixo) e testar ao vivo no navegador, do jeito
que a Fase 2 foi validada.

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
Depois de editar: `SendUserFile` pra entregar os arquivos, e
`mcp__remote-devices__device_commit_files` pra gravar direto em
`C:\Projetos\Sistema-PP\...` no PC do Felipe (só funciona com o app da
Claude aberto lá — se a conexão cair, os arquivos ficam entregues na
conversa mesmo assim, só não vão sozinhos pra pasta).

**Descoberta da sessão de 22/08/2026 (Fase 3)**: `npm test`/`npm run
build:web` **não** rodam bem de dentro desta sessão via
`mcp__remote-devices__device_bash` — esse comando executa num VM Linux à
parte (não é o Windows do Felipe de verdade), acessando a pasta montada
pela rede. Ler/percorrer o `node_modules` inteiro por essa montagem é lento
o bastante (uma listagem rasa de ~550 pastas já levou quase 3s) pra estourar
o timeout de 45s do `device_bash` antes até do Jest terminar de subir —
tentado repetidas vezes nesta sessão, sempre estourando o tempo, inclusive
rodando em background (que também não sobrevive entre chamadas da
ferramenta, cada uma roda num sandbox que morre no fim). **Conclusão**:
depois de editar por aqui e gravar os arquivos na pasta do Felipe, quem
precisa rodar `npm test` e `npm run build:web` de verdade é o Felipe,
direto no PowerShell dele (rápido, porque lá o `node_modules` é local de
verdade) — os comandos exatos estão na seção "Como buildar e publicar" no
topo deste documento.
