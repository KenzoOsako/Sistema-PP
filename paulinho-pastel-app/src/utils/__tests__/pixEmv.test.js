import { generatePixPayload, crc16ccitt } from '../pixEmv';

describe('pixEmv (geração de payload EMV do Pix)', () => {
  it('calcula o CRC16-CCITT corretamente (vetor de teste padrão da indústria)', () => {
    // Vetor de teste universal do algoritmo CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF),
    // independente do Pix: check("123456789") deve ser 0x29B1.
    expect(crc16ccitt('123456789')).toBe('29B1');
  });

  it('calcula corretamente o tamanho do campo da chave Pix, mesmo para chaves longas (bug antigo)', () => {
    // A versão anterior tinha o tamanho da chave fixo em "11" (assumindo telefone),
    // o que quebrava para chaves de e-mail como esta (22 caracteres).
    const payload = generatePixPayload({
      pixKey: 'paulinho@pastel.com.br', // 22 caracteres
      merchantName: 'Paulinho Pastel',
      merchantCity: 'Sao Paulo',
      amount: 9.5,
    });

    // Campo 26 (Merchant Account Info) deve conter "0122" (id "01", tamanho "22") antes da chave.
    expect(payload).toContain('0122paulinho@pastel.com.br');
  });

  it('sempre termina com um CRC16 de 4 caracteres hexadecimais válidos (campo 6304 nunca fica em branco)', () => {
    const payload = generatePixPayload({
      pixKey: '11999999999',
      merchantName: 'Paulinho Pastel',
      merchantCity: 'Sao Paulo',
      amount: 23.5,
    });

    const crcIndex = payload.lastIndexOf('6304');
    const crc = payload.slice(crcIndex + 4);
    expect(crc).toHaveLength(4);
    expect(crc).toMatch(/^[0-9A-F]{4}$/);

    // O CRC deve corresponder ao cálculo sobre o payload até e incluindo "6304".
    const payloadWithoutCrc = payload.slice(0, crcIndex + 4);
    expect(crc).toBe(crc16ccitt(payloadWithoutCrc));
  });

  it('lança erro se a chave Pix não for informada (evita gerar QR Code inválido silenciosamente)', () => {
    expect(() => generatePixPayload({ merchantName: 'X', merchantCity: 'Y' })).toThrow();
  });
});
