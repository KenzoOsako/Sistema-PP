# Feature — cliente não retirou o pedido

Status: **implementado** (sessão de 21/08/2026). Este documento agora descreve
o que está no app de verdade, não mais um rascunho de backlog.

## O problema

Se um cliente faz um pedido "cartão/dinheiro na retirada" e some — não vai
buscar, não paga — o Paulinho fica sem dois recursos: o dinheiro do pastel e o
ingrediente que já foi gasto fazendo ele. Pedido Pix não tem esse risco (já foi
pago antes de entrar no forno), mas mesmo assim precisa sumir da fila igual.

## Decisões tomadas (as 3 que estavam em aberto)

Validadas com o Felipe nesta sessão (ainda não confirmadas com o Paulinho —
fácil de ajustar se ele achar diferente no uso real):

1. **Nome do botão**: "Cliente Não Retirou" (mantida a sugestão original).
2. **Acúmulo de bloqueio**: um bloqueio já trava a conta inteira — não dá pra
   acumular duas dívidas ao mesmo tempo. Se surgir um segundo no-show antes do
   primeiro ser resolvido, o `markNoShow` simplesmente sobrescreve o bloqueio
   ativo (mesmo padrão simples, sem histórico de múltiplas dívidas).
3. **Janela de tolerância**: existe, e é configurável em
   `src/config.js` → `NO_SHOW_TOLERANCE_MINUTES` (valor assumido: **20
   minutos**). O botão "Cliente Não Retirou" fica desabilitado (com contagem
   regressiva visível) até esse tempo passar desde que o pedido ficou pronto
   (`ready_at`) — ou desde a criação (`created_at`), pro raro caso de sumiço
   antes de chegar em "pronto".

## Fluxo implementado

**1. Cadastro** (`RegisterScreen.js`) tem um checkbox obrigatório de "Aceito
os termos e condições" — texto inline cobrindo bloqueio por não
retirado/pago + cláusula de bom senso. `AuthAdapter.register()` grava
`terms_accepted_at` (timestamp do servidor) no documento do usuário. Contas
antigas não têm esse campo e não são afetadas retroativamente.

**2. Na fila do admin** (`AdminFilaScreen.js`), cada pedido ativo tem o botão
"Cliente Não Retirou", desabilitado durante a janela de tolerância. Clicar
abre um `ConfirmModal` (componente novo, reutilizável — `Cancelar`/
`Confirmar`, com texto diferente pra Pix vs. cartão/dinheiro).

Ao confirmar, `OrderAdapter.markNoShow(order)`:
- Sempre marca o pedido como `status: 'no_show'`.
- **Pix**: só isso — sem dívida, sem bloqueio (já foi pago).
- **Cartão/dinheiro na retirada**: também bloqueia `users/{client_id}`
  (`blocked: true` + `blocked_order_id` + `blocked_order_snapshot` — o
  "recibo" — + `blocked_at`).

**3. Cliente bloqueado**: no próximo login, `LoginScreen` chama
`AuthAdapter.getAccountStatus(uid)` (substituiu o antigo `getUserRole` como
função principal — `getUserRole` virou um wrapper fino em cima dela pra não
quebrar quem só precisa do papel) e, se `blocked === true`, manda o cliente
pra `ClientBlockedScreen` em vez do cardápio. Essa tela mostra o "recibo"
(itens, data, valor) e não tem acesso a mais nada do app — só um botão
"Sair".

**4. Aba "Bloqueados" no admin** (`AdminBlockedScreen.js`, novo ícone 🔒 no
`AdminTabs`), com listener em tempo real (`AuthAdapter.subscribeToBlockedUsers`,
query `users` com `where('blocked','==',true)`). Cada conta bloqueada tem duas
ações (ambas com `ConfirmModal` antes de disparar):
- **Pago ✅** → `OrderAdapter.resolveNoShow(orderId, clientId, 'paid')`.
  Desbloqueia a conta; o valor entra nas vendas do **dia da quitação**
  (não do dia original do pedido).
- **Perdoar Dívida** → `resolveNoShow(orderId, clientId, 'forgiven')`.
  Desbloqueia a conta; nunca conta como venda, mas o custo do ingrediente
  aparece como "Prejuízo (Não Comparecimento)" no Financeiro, no dia em que
  foi perdoado.

**5. Financeiro** (`AdminDashboardScreen.js`) foi ajustado pra não vazar
pedidos não pagos nas vendas do dia:
- Pedidos `no_show` sem resolução NÃO contam em vendas/lucro/itens vendidos
  enquanto ficam pendentes.
- Pedidos resolvidos como `'paid'` entram nas vendas do dia de
  `debt_resolved_at`, não de `created_at`.
- Pedidos resolvidos como `'forgiven'` nunca entram em vendas — só somam ao
  novo card "Prejuízo (Não Comparecimento)" (só aparece quando > 0), com o
  custo (não o preço) dos itens perdidos.
- "Pedidos Hoje" continua contando por `created_at`, incluindo no-shows —
  é uma métrica operacional, não financeira.

## Banco de dados (o que mudou de verdade)

- `orders`: novos campos `ready_at` (carimbado por `updateOrderStatus` ao
  virar `'ready'`), `no_show_at`, `debt_resolved` (`'paid' | 'forgiven'` ou
  ausente = pendente), `debt_resolved_at`. Novo status possível: `'no_show'`.
- `users`: novos campos `blocked` (boolean, `false` no cadastro a partir de
  agora), `blocked_order_id`, `blocked_order_snapshot` (recibo), `blocked_at`,
  `terms_accepted_at`.
- `firestore.rules`: admin agora pode **ler qualquer** documento em `users`
  (necessário pra query da aba Bloqueados) e **atualizar** só os campos de
  bloqueio (`blocked`, `blocked_order_id`, `blocked_order_snapshot`,
  `blocked_at`) de contas que não são a dele — nunca `role`/`name`/`email`/
  `phone` de outra pessoa. **Esse arquivo precisa ser publicado** (`firebase
  deploy --only firestore:rules`) além do deploy normal de hosting, senão a
  aba Bloqueados fica com permissão negada em produção mesmo com o código já
  no ar.

## Testes

`src/adapters/__tests__/OrderAdapter.test.js` ganhou 4 casos novos cobrindo
`markNoShow` (Pix não bloqueia, cartão/dinheiro bloqueia) e `resolveNoShow`
(desbloqueia + rejeita resolução inválida). `npm test` e `npm run build:web`
rodados localmente e verdes antes de entregar.

## Ainda em aberto (validar com o Paulinho quando possível)

- Confirmar se 20 minutos de tolerância é um tempo bom na prática — é fácil
  de mudar em `NO_SHOW_TOLERANCE_MINUTES` (`src/config.js`).
- Confirmar se "um bloqueio já trava tudo" (sem acumular dívidas) é
  suficiente, ou se algum dia vai precisar de histórico de múltiplos
  no-shows por cliente.
- Não existe reforço de aceite de termos pra contas criadas antes dessa
  mudança — decisão consciente pra não travar ninguém retroativamente, mas
  vale o Paulinho saber que só cobre cadastros novos.
