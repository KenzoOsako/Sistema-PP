// Envolve qualquer Promise com um tempo-limite. Se a promise não resolver
// nem rejeitar dentro do prazo, rejeita com um erro claro em vez de deixar
// a UI (ex: um spinner de login) travada para sempre — importante em redes
// restritivas (faculdade, corporativas) onde uma chamada de rede pode nunca
// retornar nem dar erro.
export function withTimeout(promise, ms = 20000, message = 'Tempo esgotado. Verifique sua conexão e tente novamente.') {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}
