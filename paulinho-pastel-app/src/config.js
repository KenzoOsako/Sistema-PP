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
// espelhada em firestore.rules — nenhum outro telefone consegue isso).
export const ADMIN_PHONE = '19987011974';
