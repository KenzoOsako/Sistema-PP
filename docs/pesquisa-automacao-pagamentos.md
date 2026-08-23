# Pesquisa: automatizar confirmação de pagamento (Pix/cartão) e pagamento remoto

Data: 23/08/2026 · Etapa 3 · Status: **pesquisa de viabilidade, nada implementado ainda**

## O que foi pedido

Duas ideias relacionadas, mas tecnicamente diferentes:

1. **Automatizar a confirmação do Pix** que já existe hoje (o Paulinho olha manualmente
   se o dinheiro caiu na conta e confirma no app) — e, se possível, também puxar
   confirmação de pagamentos no cartão direto da maquininha.
2. **Aceitar pagamento remoto** (crédito/débito) direto pelo app, sem o cliente
   precisar passar o cartão na maquininha na hora da retirada — o que resolveria
   de vez o problema de bloqueio por não pagamento no cartão (hoje só é cobrado
   fisicamente na retirada; ver `docs/feature-bloqueio-no-show.md`).

## A restrição técnica central: isso sempre exige um backend

Hoje o Sistema PP **não tem nenhum backend próprio** — só o app (cliente) conversando
direto com Firestore/Firebase Auth. Todo o resto (Cloud Functions, servidor, etc.)
simplesmente não existe ainda.

Toda opção pesquisada (Mercado Pago, InfinitePay, Stone) funciona do mesmo jeito por
baixo dos panos: o app pede pro provedor "gerar uma cobrança" (via API), o provedor
devolve um QR Code/link, e quando o cliente paga, o provedor avisa **via webhook** —
uma chamada HTTP que o provedor faz pro *seu* servidor, não pro celular do cliente.

Um webhook só pode ser recebido por algo que fica escutando na internet o tempo
todo com um endereço fixo — o app rodando no celular do cliente não serve pra isso
(ele fecha, perde conexão, cada cliente tem um app diferente rodando). Ou seja: **não
tem como fazer isso só no app, sem um servidor**. No ecossistema Firebase que já
usamos, isso significa **Cloud Functions** — que exige migrar o projeto do plano
gratuito (Spark) pro plano pago por uso (Blaze). O Blaze tem uma faixa gratuita
generosa (cobra só acima de um volume que uma barraca pequena dificilmente atinge),
mas é uma mudança de arquitetura real, não só mais um arquivo `.js`.

## Comparação dos três provedores

| | Mercado Pago | InfinitePay | Stone |
|---|---|---|---|
| Já usado hoje? | **Sim** — é onde a chave Pix do Paulinho está cadastrada | Não | Não |
| Checkout/API de cobrança documentada | Sim (Checkout API / Checkout Pro / Payments API) | Sim (Checkout Integrado, documentação pública) | Sim (mais focado em e-commerce/DevCenter, parece exigir mais processo de integração) |
| Webhook de confirmação | Sim | Sim (a doc chega a dizer que webhook é "mais eficiente que ficar consultando manualmente") | Sim, em geral |
| Pix via API | Sim, QR dinâmico gerado por cobrança (diferente da chave estática fixa que usamos hoje) | Sim, e a documentação menciona taxa zero em Pix | Sim |
| Cartão via checkout remoto (sem maquininha física) | Sim (Payment Brick / Checkout Transparente) | Sim (aceita cartão no checkout integrado) | Sim (voltado a e-commerce) |
| Precisa de backend próprio | Sim | Sim, confirmado explicitamente na doc: "você precisa lidar com POST, processar webhook ou fazer polling, validar pedido no seu sistema" | Sim |
| Vantagem principal pro nosso caso | Reaproveita a conta que já existe — não precisa abrir cadastro em outro lugar nem trocar a chave Pix que o Paulinho já usa | Checkout gratuito, Pix sem taxa (segundo a própria doc) | Marca forte em maquininha física — pode fazer mais sentido se o objetivo for só ler pagamentos da maquininha em si, não checkout remoto |

Não pesquisei os detalhes de taxas exatas cobradas por transação processada via API
(isso muda com frequência e varia por volume/negociação) — antes de decidir, vale
confirmar direto no site/atendimento do provedor escolhido quanto seria cobrado por
Pix e por cartão processados assim, porque hoje o Pix "manual" (chave própria) não
tem taxa nenhuma, e isso muda a conta.

## O que cada ideia resolveria de verdade

**Confirmação automática do Pix**: tira o trabalho manual do Paulinho de ficar
checando o extrato — o pedido muda de status sozinho assim que o webhook chega.
Ganho real, mas não resolve o problema de bloqueio (Pix já não gera bloqueio hoje,
justamente porque é pago antes).

**Pagamento remoto no cartão**: esse sim ataca o problema de bloqueio de verdade.
Hoje só o Pix é pago ANTES (por isso nunca gera dívida) — cartão/dinheiro são
cobrados só na retirada, e é exatamente aí que mora o risco de "cliente não veio
buscar". Se o cartão também puder ser cobrado no ato do pedido (igual o Pix já
funciona), o mesmo problema desaparece pra quem escolher pagar assim. Dinheiro físico
continua sendo a única exceção que não dá pra "automatizar" — vai sempre depender de
alguém aparecer com dinheiro na mão.

## Se decidir seguir em frente, os passos seriam

1. Escolher o provedor (recomendo considerar Mercado Pago primeiro, por já ser a
   conta que o Paulinho usa e ter a documentação mais madura em português).
2. Criar as credenciais de API (chave de acesso/token) na conta do provedor.
3. Migrar o projeto Firebase pro plano Blaze e criar a primeira Cloud Function
   (endpoint que recebe o webhook).
4. Trocar o QR Code Pix estático atual (`src/utils/pixEmv.js`, gerado localmente
   no app) por uma cobrança de verdade criada via API a cada pedido — isso também
   resolve, de quebra, o problema de "o Paulinho tem que confirmar o valor certo
   manualmente", já que a cobrança já nasce vinculada ao valor exato do pedido.
5. Pro cartão remoto: usar o SDK de tokenização do provedor (ex.: Payment Brick do
   Mercado Pago) — os dados do cartão nunca passam pelo nosso código, só pelo SDK
   oficial (isso importa: lidar com número de cartão "cru" tem exigências de
   segurança/PCI que não queremos assumir por conta própria).
6. Testar bastante em modo sandbox/teste antes de qualquer cliente real pagar de
   verdade por esse caminho novo.

## Recomendação

Não é um trabalho de "mais uma tela" — é a primeira peça de backend do projeto, e
muda como pagamento funciona pros dois métodos. Sugiro tratar como uma etapa própria
mais pra frente (não nesta leva), começando pelo Mercado Pago (por já ser a conta em
uso) primeiro só pra confirmação automática do Pix (mudança mais contida), e só
depois avaliar pagamento remoto de cartão quando isso estiver validado.

---

Sources:
- [Webhooks do Mercado Pago — Capture IPN com HookScope](https://hookscope.com.br/webhook-mercado-pago/)
- [Como integrar o Mercado Pago ao PDV via API](https://www.mercadopago.com.br/blog/integracao-mercado-pago-pdv-erp-api)
- [Pix - Configuração da integração (Mercado Pago Developers)](https://www.mercadopago.com.br/developers/pt/docs/checkout-api/integration-configuration/integrate-with-pix)
- [Checkout Para Venda Integrada Direto no Seu Site (InfinitePay)](https://www.infinitepay.io/checkout-documentacao)
- [Como usar o Checkout Integrado da InfinitePay?](https://ajuda.infinitepay.io/pt-BR/articles/10766888-como-usar-o-checkout-da-infinitepay)
- [API de pagamento: o que é, como funciona e por que utilizar? (Stone)](https://conteudo.stone.com.br/api-de-pagamento/)
- [Stone para o seu E-commerce: Checkout, Pix, Boleto e Mais](https://www.stone.com.br/tipos-de-negocio/ecommerce)
