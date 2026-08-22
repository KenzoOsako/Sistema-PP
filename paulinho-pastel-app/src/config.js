// Configuração central do app.
//
// Chave Pix real do Paulinho (telefone), cadastrada no Mercado Pago em nome
// de Paulo César da Silva. Guardada aqui no formato local (sem +55), que é
// como o Paulinho de fato vê/copia a chave (igual digitaria escolhendo
// "telefone" no próprio banco). O +55 exigido pelo Banco Central no payload
// EMV do QR Code é adicionado só na hora de gerar o QR, via
// toDictPhoneKey() em src/utils/pixEmv.js.
export const PIX_KEY = '19987011974';
export const PIX_MERCHANT_NAME = 'Paulo Cesar da Silva';
export const PIX_MERCHANT_CITY = 'Sao Paulo';

// Telefone de login do Paulinho. Hoje é o mesmo número da chave Pix acima,
// mas ficam como constantes separadas de propósito — uma é "com quem eu
// falo pra logar" e a outra é "pra onde o dinheiro vai", coisas que podem
// divergir no futuro (ex.: Paulinho troca de celular mas mantém a chave
// Pix antiga cadastrada no nome dele). Quem se cadastra com esse telefone
// exato já vira admin automaticamente (ver AuthAdapter.register e a regra
// espelhada em firestore.rules).
export const ADMIN_PHONE = '19987011974';

// Credencial "mestra" reservada pro time (Felipe/Kenzo) conseguir entrar no
// painel admin de qualquer lugar — celular emprestado, PC da faculdade, etc.
// — sem depender do telefone/senha do Paulinho. Não é um número de verdade,
// é só um identificador reservado que também vira admin automaticamente ao
// se cadastrar, do mesmo jeito que ADMIN_PHONE. Cada um escolhe a própria
// senha no cadastro — ninguém, nem o Claude, guarda ou digita ela.
export const ADMIN_MASTER_PHONE = '99999999999';

// Qualquer telefone dessa lista vira admin automaticamente ao se cadastrar.
// Nenhum outro cai como admin — é essa lista (e a cópia dela em
// firestore.rules) que decide, não o app.
export const ADMIN_PHONES = [ADMIN_PHONE, ADMIN_MASTER_PHONE];

// Feature "Cliente Não Retirou" (ver docs/feature-bloqueio-no-show.md).
//
// Janela de tolerância: o botão "Cliente Não Retirou" só fica habilitado na
// fila do admin depois de X minutos contados do pedido ficar pronto (ou da
// criação, pros raríssimos casos de sumiço antes de chegar em "pronto").
// Evita o Paulinho marcar um cliente como não-retirou cedo demais, por
// engano, com o pastel ainda quentinho no balcão. 20 min é um valor
// assumido pelo Felipe (ponto que o documento de backlog deixava em
// aberto) — fácil de ajustar aqui se o Paulinho achar curto/longo demais
// no uso real.
export const NO_SHOW_TOLERANCE_MINUTES = 20;
