# Fase 3 — Header enxuto, menu ☰ no admin e loja aberta/fechada

Sessão de 22/08/2026. Três mudanças combinadas com o Felipe, implementadas juntas porque a segunda depende da primeira (o menu ☰ só existe dentro do header) e a terceira mora dentro desse mesmo menu.

## 1. Header mais enxuto

**Antes:** três camadas empilhadas — uma faixa fixa de 44px reservando espaço de status bar (sempre, mesmo no PWA/web onde não existe barra de status nenhuma pra proteger), o selo de data em meia-lua flutuando por cima em `position: absolute`, e só depois a linha de verdade com título/botões.

**Depois:** uma linha só. O respiro do topo usa `useSafeAreaInsets()` (mesma lib e mesma ideia já usada na tab bar antiga do admin, ver App.js) em vez da faixa fixa — no PWA/web isso é 0, então o header ganha ~44px de volta na tela mais usada do app. O selo de data virou um chip simples dentro do cluster de botões da direita, junto com o resto (Sair / Pedidos / ☰).

**Pendência:** isso muda o visual que o Paulinho já tinha aprovado (a meia-lua flutuante). Manda um print pra ele antes de considerar essa tela "no ar de vez" — mesmo processo que já foi seguido da última vez que o Header mudou de cara.

Arquivo: `src/components/Header.js`. Novo prop: `onMenu` (mostra um ícone ☰ ao lado de `onLogout`/`right`).

## 2. Menu ☰ no admin (só Fila fixa)

**Antes:** área admin era um `Tab.Navigator` com 4 abas fixas na barra de baixo (Fila / Cardápio / Financeiro / Bloqueados).

**Depois:** só a Fila é fixa — é a tela que o Paulinho realmente olha o dia inteiro. Cardápio, Financeiro e Bloqueados viraram telas de stack normais (como as do fluxo do cliente), abertas pelo novo botão ☰ no header da Fila e fechadas com uma seta de voltar (`onBack`), sem precisar passar pelo menu de novo.

- `App.js`: removido o `Tab.Navigator` (`AdminTabs`); `AdminFila`/`AdminMenu`/`AdminDashboard`/`AdminBlocked` agora são `Stack.Screen` irmãos.
- Novo componente `src/components/AdminMenuModal.js`: dropdown ancorado no canto superior direito, com os 3 atalhos de navegação + o interruptor de loja (item 3 abaixo) + "Sair".
- `AdminFilaScreen.js`: Header ganhou `onMenu` (abre o `AdminMenuModal`) no lugar do antigo `onLogout` — Sair agora mora dentro do menu.
- `AdminMenuScreen.js` / `AdminDashboardScreen.js` / `AdminBlockedScreen.js`: Header trocou `logo + onLogout` por `onBack={() => navigation.goBack()}`, e o `handleLogout` local (que usava `navigation.getParent()?.reset(...)`, um resquício de quando essas telas viviam dentro do Tab.Navigator) foi removido — sem Tab pai, `navigation.reset()` já é direto quando precisa (só o `AdminMenuModal` chama isso agora, no Sair).

## 3. Loja aberta/fechada

Novo controle pro Paulinho fechar os pedidos sem precisar desligar o app ou esconder o cardápio inteiro (decisão do Felipe: cliente continua vendo o cardápio fechado, só não consegue *enviar* pedido).

- **Onde liga/desliga:** dentro do menu ☰ da Fila (`AdminMenuModal`) — um Switch com o rótulo "Loja aberta 🟢" / "Loja fechada 🔴".
- **Onde mora o dado:** documento único `store_status/main` no Firestore, campo `open: boolean`. Se o documento ainda não existir (banco novo, ninguém nunca mexeu no interruptor), o padrão é **aberta** — em três lugares consistentes: o adapter (leitura ao vivo), a regra do Firestore (enforcement) e o fallback client-side em `createOrder`. Essa feature nova nunca trava pedido de ninguém sozinha.
- **Novo adapter:** `src/adapters/StoreStatusAdapter.js` — `subscribeToStoreStatus` (tempo real, pro banner do cliente e pro Switch do menu), `getStoreOpen` (leitura pontual, usada pelo `OrderAdapter` antes de criar o pedido) e `setStoreOpen` (só admin).
- **Cliente (`ClientMenuScreen.js`):** banner fixo "🔴 Estamos fechados..." logo abaixo do header quando a loja está fechada. De propósito **não** desabilita o botão "Ver Carrinho" — o cliente continua podendo montar/ajustar o carrinho à vontade.
- **Checkout (`CheckoutScreen.js`):** é aqui que a Fase 3 realmente trava — o botão final ("Já paguei, enviar pedido!") fica desabilitado e vira "Loja fechada" quando `storeOpen` é false, com uma caixa de aviso vermelha explicando por quê. Assina o status ao vivo (cobre o caso raro do Paulinho fechar bem no meio do checkout).
- **Enforcement de verdade:** client-side dá só pra aviso bonito (dá pra "burlar" mudando o código do app). Quem impede de verdade é a regra `isStoreOpen()` em `firestore.rules`, usada no `allow create` de `orders` — só no CREATE, nunca no UPDATE, então o admin continua livre pra avançar pedidos já feitos antes de fechar a loja.

**IMPORTANTE pro próximo deploy:** `firestore.rules` mudou de novo (nova coleção `store_status` + `isStoreOpen()` no create de `orders`) — publicar junto com o resto (`firebase deploy --only hosting,firestore:rules`), senão a loja "fechada" no app não impede pedido nenhum de verdade (só o aviso visual funciona).

## Testes ajustados

- `src/screens/client/__tests__/ClientMenuScreen.test.js`: Header agora usa `useSafeAreaInsets`, então o teste passou a mockar `react-native-safe-area-context`. Primeira tentativa usou o mock oficial da própria lib (`react-native-safe-area-context/jest/mock`), mas isso **quebrou de verdade** rodando `npm test` (`Element type is invalid ... got: undefined`): aquele mock usa `export default {...}`, que vira `{ __esModule: true, default: {...} }` depois do Babel, e o import nomeado `{ SafeAreaProvider }` procura a propriedade no nível de cima do módulo — undefined, porque está tudo aninhado em `.default`. Trocado por um mock simples e explícito (`{ SafeAreaProvider: ({children}) => children, useSafeAreaInsets: () => ({top:0,...}) }`), sem essa armadilha. Também mocka `StoreStatusAdapter` (mesmo motivo do mock de `AuthAdapter` já existente: sem isso, inicializa o Firebase de verdade e derruba o processo).
  - **Segunda rodada, outro bug real achado rodando de verdade**: com esse mock corrigido, o teste passou a derrubar o processo INTEIRO do Node (não uma falha normal de teste) especificamente no 3º `fireEvent.press` — nunca no 1º nem no 2º — com `render function has not been called` vindo de dentro do `@testing-library/react-native`. Causa: o teste usava a API global `screen` (`screen.getAllByText(...)`) em vez do retorno de `render()`, e embrulhava cada `fireEvent.press` num `act(async () => {...})` manual e redundante (a lib já faz isso sozinha). Trocado por desestruturar `{ getAllByText, getByText }` direto de `render()` e tirado o `act()` manual — evita o singleton global por completo.
- `src/adapters/__tests__/OrderAdapter.test.js`: `createOrder` agora chama `getStoreOpen()` antes de tudo — mockado separadamente (`getStoreOpen: jest.fn().mockResolvedValue(true)`) pra não competir com os `getDoc.mockResolvedValueOnce(...)` que os testes já usavam pro snapshot de perfil do cliente.

## Status de validação

`npm run build:web` e `npm test` **rodados pelo Felipe e passaram limpo**: `4 passed, 4 total` / `17 passed, 17 total`. (Ficaram uns `console.error` de "overlapping act()" / "VirtualizedList update not wrapped in act" no output — são avisos benignos do modo dev do React sobre o timer interno da lista virtualizada, não falhas; não bloqueiam nada.)

Falta ainda: testar ao vivo no navegador (clicar no ☰, ligar/desligar a loja, ver o banner e o Checkout bloqueado), publicar `firestore.rules` (`firebase deploy --only hosting,firestore:rules`) e mandar um print do Header novo pro Paulinho aprovar.
