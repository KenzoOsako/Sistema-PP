# Mapa das duas aplicações

Referência inspecionada: commit `220755706b5a7cc1493022702667e44e08f82ab2`.

A comparação dos objetos Git encontrou **48 pares de arquivos idênticos e 20 pares diferentes** entre a raiz e `paulinho-pastel-app/`. Isso é uma comparação de conteúdo, não uma prova de equivalência funcional.

## Divergências relevantes

- `App.js`: composição e navegação.
- `firestore.rules`: regras distintas; não escolher uma versão apenas pelo tamanho ou pela data.
- `src/adapters/AuthAdapter.js` e `OrderAdapter.js`: fluxos de autenticação e pedidos.
- `src/config.js`: configuração que deve ser conferida localmente, sem divulgar valores operacionais.
- `src/components/Header.js`.
- Telas de administração: `AdminBlockedScreen`, `AdminDashboardScreen` e `AdminFilaScreen`.
- Telas de autenticação: `LoginScreen` e `RegisterScreen`.
- Telas do cliente: `CartScreen`, `CheckoutScreen`, `ClientMenuScreen` e `ClientOrderStatusScreen`.
- `src/services/notifications.js`.
- Testes de `AuthAdapter` e `ClientMenuScreen`.
- `.gitignore` e cache local `.firebase/hosting.ZGlzdA.cache`.

## Arquivos presentes somente em uma versão

Na raiz, entre os módulos de aplicação comparados:

- `src/components/AdminDrawerMenu.js`
- `src/components/ClientOrderWatcher.js`
- `src/screens/admin/AdminOrderSearchScreen.js`
- `src/screens/admin/AdminStoreStatusScreen.js`
- `src/screens/auth/EmailVerificationLandingScreen.js`

Na cópia interna:

- `src/components/AdminMenuModal.js`
- `verify.js`
- `verify_zero_trust.js`

Os manifestos `package.json` são idênticos na referência, mas isso não torna as telas, regras e adaptadores iguais. O nome de um arquivo de verificação também não comprova a propriedade de segurança anunciada.

## Critérios para consolidar

1. Executar os testes de cada diretório com seleção explícita, evitando que a descoberta recursiva misture as cópias.
2. Comparar os fluxos de cadastro/login, pedidos, fila, situação da loja, e-mail e notificações.
3. Validar regras Firestore com dados fictícios e acessos permitidos/negados, em ambiente separado.
4. Escolher uma aplicação canônica e portar funcionalidades exclusivas com regressões.
5. Ajustar CI, documentação e caminhos de build para a versão escolhida.
6. Só depois remover a cópia redundante em um commit próprio, revisável, preservando o histórico.

Esta PR é documental. Não executa essa consolidação, não altera regras ou dados hospedados e não homologa o aplicativo.
