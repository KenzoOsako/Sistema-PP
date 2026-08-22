// Marca (só localStorage, só web/PWA — não existe em app nativo) que ESTE
// aparelho/navegador já mostrou a tela de "Conta Bloqueada" pra alguém, uma
// vez. Não é um bloqueio de verdade (dá pra contornar limpando dados do
// navegador ou usando outro aparelho) — é só uma fricção a mais, de graça,
// pro caso mais comum: a mesma pessoa, no mesmo celular/PC, tentando criar
// conta nova na hora depois de ser bloqueada. Ver
// docs/feature-antifraude-email.md.
const STORAGE_KEY = 'paulinho_device_had_blocked_account';

function hasLocalStorage() {
  try {
    return typeof localStorage !== 'undefined';
  } catch (e) {
    return false;
  }
}

export function markDeviceHadBlockedAccount() {
  if (!hasLocalStorage()) return;
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch (e) {
    // silencioso — não é crítico, só um aviso a mais.
  }
}

export function deviceHadBlockedAccount() {
  if (!hasLocalStorage()) return false;
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch (e) {
    return false;
  }
}
