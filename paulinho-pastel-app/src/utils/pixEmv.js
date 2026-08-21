// Gerador de payload Pix EMV (BR Code) - QR Code estático
// Baseado no manual do Banco Central: https://www.bcb.gov.br/estabilidadefinanceira/pix
//
// Corrige dois bugs críticos que existiam na versão anterior (string hardcoded):
// 1. O tamanho da chave Pix era fixo em 11 caracteres (assumindo telefone),
//    quebrando para chaves de e-mail ou aleatórias (EVP) com outro tamanho.
// 2. Faltava o checksum CRC16-CCITT no final, sem o qual nenhum app bancário
//    reconhece o QR Code como válido.

function removeAccents(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ''); // remove qualquer caractere fora do ASCII imprimível
}

// Campo EMV: ID (2 dígitos) + Tamanho (2 dígitos) + Valor
function emvField(id, value) {
  const length = String(value.length).padStart(2, '0');
  return `${id}${length}${value}`;
}

// CRC16-CCITT (poly 0x1021, init 0xFFFF) - algoritmo exigido pelo padrão EMV/Pix
export function crc16ccitt(payload) {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Gera o payload Pix EMV completo (Copia e Cola / QR Code estático).
 * @param {Object} params
 * @param {string} params.pixKey - Chave Pix (telefone, e-mail, CPF/CNPJ ou aleatória)
 * @param {string} params.merchantName - Nome do recebedor (máx. 25 caracteres)
 * @param {string} params.merchantCity - Cidade do recebedor (máx. 15 caracteres)
 * @param {number} [params.amount] - Valor da cobrança. Se omitido, o QR fica com valor livre.
 * @param {string} [params.txid] - Identificador da transação (máx. 25 caracteres, "***" = sem txid fixo)
 * @returns {string} payload EMV pronto para renderizar no QRCode
 */
export function generatePixPayload({ pixKey, merchantName, merchantCity, amount, txid = '***' }) {
  if (!pixKey || typeof pixKey !== 'string') {
    throw new Error('Chave Pix inválida ou ausente.');
  }

  const payloadFormat = emvField('00', '01');
  const merchantAccountInfo = emvField('26', emvField('00', 'br.gov.bcb.pix') + emvField('01', pixKey));
  const mcc = emvField('52', '0000');
  const currency = emvField('53', '986'); // BRL
  const amountField = amount != null ? emvField('54', Number(amount).toFixed(2)) : '';
  const country = emvField('58', 'BR');
  const name = emvField('59', removeAccents(merchantName).toUpperCase().slice(0, 25));
  const city = emvField('60', removeAccents(merchantCity).toUpperCase().slice(0, 15));
  const additionalData = emvField('62', emvField('05', txid.slice(0, 25)));

  const payloadWithoutCrc =
    payloadFormat + merchantAccountInfo + mcc + currency + amountField + country + name + city + additionalData + '6304';

  const crc = crc16ccitt(payloadWithoutCrc);
  return payloadWithoutCrc + crc;
}
