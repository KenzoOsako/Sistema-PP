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
