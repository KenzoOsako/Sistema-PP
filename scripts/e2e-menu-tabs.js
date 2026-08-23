// Teste E2E (Playwright, headless) da navegação por abas do cardápio do
// cliente ("Salgados"/"Doces" — ClientMenuScreen.js). Existe porque essa
// mesma navegação já foi "corrigida" 2 vezes antes sem funcionar de vez —
// da próxima vez que mexer nisso, RODE ESTE SCRIPT antes de considerar
// resolvido, não só leia o código.
//
// Por que não faz parte do `npm test` normal: a tela do cardápio fica
// atrás do login, e a regra de segurança deste projeto proíbe digitar
// senha em qualquer campo, mesmo pra teste. Este script contorna isso
// SEM NUNCA LOGAR: precisa que App.js tenha `initialRouteName="ClientMenu"`
// temporariamente (pula a tela de login inteira) e que o Firestore não
// esteja acessível (sem sessão logada, subscribeToProducts falha por
// permissão e a tela cai sozinha no cardápio mockado — MOCK_PRODUCTS, 19
// itens reais, mesmos do cardápio de verdade), então roda tudo com dados
// puramente locais, sem tocar no Firebase de produção.
//
// Como rodar:
//   1. Em App.js, troque temporariamente:
//        initialRouteName="Login"  →  initialRouteName="ClientMenu"
//   2. npm run build:web
//   3. npx serve -s dist -l 8123   (em outro terminal, ou em background)
//   4. PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scripts/e2e-menu-tabs.js
//   5. Reverta o App.js pro original (initialRouteName="Login") antes de
//      commitar — NUNCA suba o app com o login pulado.
//
// Sai com código 0 e "TUDO OK" se passar, ou lança erro (código != 0) na
// primeira asserção que falhar.
const { chromium } = require('playwright');

const BASE_URL = process.env.E2E_URL || 'http://localhost:8123';

function assert(condition, message) {
  if (!condition) throw new Error(`FALHOU: ${message}`);
  console.log(`  ok — ${message}`);
}

function getScrollContainer(page) {
  return page.evaluate(() => {
    for (const el of document.querySelectorAll('div')) {
      const s = getComputedStyle(el);
      if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
        return { scrollTop: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
      }
    }
    return null;
  });
}

function isTabActive(page, label) {
  // A aba ativa usa cor de fundo/texto diferentes (ver styles.tabActive em
  // ClientMenuScreen.js) — checa a cor de texto renderizada em vez de
  // depender de classes CSS geradas (que mudam a cada build).
  return page.evaluate((lbl) => {
    const els = Array.from(document.querySelectorAll('div')).filter(el => el.textContent === lbl && el.children.length === 0);
    if (!els.length) return null;
    const color = getComputedStyle(els[0]).color;
    // colors.surface (#FFFFFF) na aba ativa vs colors.textSecondary (#78716C) na inativa.
    return color === 'rgb(255, 255, 255)';
  }, label);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));

  console.log(`Abrindo ${BASE_URL} ...`);
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  assert(pageErrors.length === 0, `nenhum erro JS não tratado na carga (achou: ${pageErrors.join('; ')})`);

  const initial = await getScrollContainer(page);
  assert(initial !== null, 'existe um container com scroll (a lista do cardápio carregou)');
  assert(initial.scrollTop === 0, 'começa no topo (scrollTop 0)');
  assert(await isTabActive(page, 'Salgados'), 'aba "Salgados" começa ativa');

  console.log('Clicando em "Doces"...');
  await page.getByText('Doces', { exact: true }).first().click();
  await page.waitForTimeout(700);
  const afterDoces = await getScrollContainer(page);
  assert(afterDoces.scrollTop > 400, `rolou de verdade pra baixo ao clicar em Doces (scrollTop=${afterDoces.scrollTop})`);
  assert(await isTabActive(page, 'Doces'), 'aba "Doces" fica marcada como ativa depois do clique');
  assert(!(await isTabActive(page, 'Salgados')), 'aba "Salgados" NÃO fica mais ativa');

  console.log('Clicando em "Salgados" de volta...');
  await page.getByText('Salgados', { exact: true }).first().click();
  await page.waitForTimeout(700);
  const afterSalgados = await getScrollContainer(page);
  assert(afterSalgados.scrollTop === 0, `voltou pro topo ao clicar em Salgados (scrollTop=${afterSalgados.scrollTop}) — esse é o bug que já "foi corrigido" 2x antes sem funcionar`);
  assert(await isTabActive(page, 'Salgados'), 'aba "Salgados" volta a ficar ativa');

  console.log('Repetindo ida e volta (2ª rodada, pra garantir que não é sorte de primeira tentativa)...');
  await page.getByText('Doces', { exact: true }).first().click();
  await page.waitForTimeout(700);
  assert((await getScrollContainer(page)).scrollTop > 400, 'Doces funciona de novo na 2ª tentativa');
  await page.getByText('Salgados', { exact: true }).first().click();
  await page.waitForTimeout(700);
  assert((await getScrollContainer(page)).scrollTop === 0, 'Salgados volta ao topo de novo na 2ª tentativa');

  await browser.close();
  console.log('\nTUDO OK — navegação de abas do cardápio funcionando nos dois sentidos, repetidamente.');
})().catch(err => {
  console.error('\n' + err.message);
  process.exit(1);
});
