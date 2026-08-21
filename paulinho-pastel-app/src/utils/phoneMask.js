// Formata progressivamente um número de telefone brasileiro enquanto o
// usuário digita: (11) 99999-9999 (celular, 11 dígitos) ou (11) 9999-9999
// (fixo, 10 dígitos). Aceita qualquer entrada (com ou sem formatação prévia)
// e sempre devolve só os dígitos limpos junto com a versão mascarada.

export function maskPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11);

  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    // Fixo: (11) 9999-9999
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  // Celular: (11) 99999-9999
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function unmaskPhone(value) {
  return value.replace(/\D/g, '');
}
