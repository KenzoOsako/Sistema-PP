# Feature (backlog) — cliente não retirou o pedido

Status: **planejado, não implementado**. Documentado aqui pra não perder a ideia
antes de conversar com o Paulinho. Nada disso está no app ainda.

## O problema

Hoje, se um cliente faz um pedido "cartão/dinheiro na retirada" e some — não vai
buscar, não paga — o Paulinho fica sem dois recursos: o dinheiro do pastel e o
ingrediente que já foi gasto fazendo ele. Pedido Pix não tem esse risco (já foi
pago antes de entrar no forno), mas mesmo assim precisa sumir da fila igual.

## Fluxo desejado

**1. Cadastro** ganha um checkbox de "Aceito os termos e condições", cobrindo
(pelo menos): que pedidos não retirados/pagos podem levar ao bloqueio da conta
até a quitação, e uma cláusula genérica de "outras situações não previstas
aqui, mas que seguem o bom senso do estabelecimento" — pra não precisar prever
100% dos casos por escrito.

**2. Na fila do admin**, cada pedido ganha um botão extra pra esse cenário
(nome sugerido: **"Cliente Não Retirou"** — evita a palavra "bloquear" no
botão em si, já que o bloqueio é consequência, não a ação direta). Clicar
pede confirmação (modal: "Confirma que o cliente não veio buscar/pagar esse
pedido?").

Depois de confirmado:
- **Se o pedido era Pix** (já pago): só sai da fila, sem bloquear ninguém —
  não há dívida, o Paulinho já recebeu.
- **Se era cartão/dinheiro na retirada** (não pago): o pedido some da fila E a
  conta do cliente é bloqueada, com uma dívida registrada igual ao valor do
  pedido.

**3. Cliente bloqueado**: da próxima vez que ele logar, em vez do cardápio
normal, vê uma tela de aviso mostrando o "recibo" daquele pedido (data, itens,
valor) e uma mensagem tipo "Você fez esse pedido e não retirou/pagou. Regularize
pra voltar a usar o app." Sem acesso ao resto do app enquanto bloqueado.

**4. Nova aba no admin: "Bloqueados"**, listando cada conta bloqueada com o
pedido que gerou o bloqueio. Pra cada uma, duas ações:
- **Pago** → cliente apareceu e acertou depois. Desbloqueia a conta, dívida
  quitada, e o valor entra normalmente nas vendas do dia da quitação.
- **Perdoar dívida** → Paulinho decide relevar (ex.: cliente teve uma emergência
  de verdade). Desbloqueia a conta, mas **sem** contar como venda — e o custo
  do ingrediente daquele pedido (que já foi gasto e jogado fora) precisa
  aparecer como prejuízo no Financeiro, não só desaparecer da conta.

## O que isso implica no banco/código (rascunho, ainda não desenhado em detalhe)

- `orders`: precisa de um jeito de marcar "não retirado" (ex.: `status:
  'no_show'`) e, quando gera dívida, guardar o valor e o motivo.
- `users`: precisa de `blocked: boolean`, mais os dados do pedido que causou o
  bloqueio (pra mostrar o "recibo" na tela de aviso), e `terms_accepted_at`
  (timestamp de quando aceitou os termos no cadastro).
- Login/navegação: depois de autenticar, checar `blocked` antes de decidir pra
  onde mandar o cliente (cardápio normal vs. tela de bloqueio).
- Financeiro: nova métrica de "prejuízo por não comparecimento" (dívidas
  perdoadas), separada das vendas normais, pra manter a margem realista.
- Novo screen `AdminBlockedScreen.js` + nova aba no `AdminTabs` (`App.js`).

## Em aberto (decidir com o Paulinho antes de construir)

- Nome exato do botão na fila (sugestão acima, mas vale validar com ele).
- Se um cliente pode acumular mais de um bloqueio/dívida ao mesmo tempo, ou
  se um já bloqueia tudo até resolver.
- Prazo — tem uma janela de tolerância antes do Paulinho poder marcar "não
  retirou", ou fica a critério dele a qualquer momento?
