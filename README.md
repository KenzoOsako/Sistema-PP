# Sistema-PP — Paulinho Pastel

Protótipo de atendimento para clientes e administração, desenvolvido com React Native, Expo, Firebase Authentication e Firestore.

O repositório contém **duas versões divergentes da aplicação**: uma na raiz e outra em `paulinho-pastel-app/`. Elas não são equivalentes. Esta documentação torna essa situação explícita; não elimina versões, não migra dados e não muda o ambiente Firebase.

## Onde está cada parte

| Caminho | Conteúdo |
| --- | --- |
| `App.js`, `src/` | Aplicação da raiz, com funcionalidades ausentes da cópia interna |
| `paulinho-pastel-app/` | Segunda versão, testada em um job separado |
| `firestore.rules`, `firestore.indexes.json` | Regras e índices da versão da raiz |
| `docs/` | Requisitos, decisões e documentação de funcionalidades |
| `.github/workflows/ci.yml` | Jobs independentes de testes para raiz e cópia interna |

O [mapa de divergências](docs/repository-layout.md) registra os arquivos que precisam ser reconciliados antes de consolidar o projeto.

## Instalação e desenvolvimento

Use Node.js 24, versão adotada pela CI. A documentação oficial do [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) informa Node.js 22.13.x como mínimo. O antigo requisito Node 18+ e a configuração anterior de CI em Node 20 não atendiam a esse mínimo.

Para trabalhar na aplicação da raiz:

```bash
git clone https://github.com/KenzoOsako/Sistema-PP.git
cd Sistema-PP
npm ci --legacy-peer-deps
npm run start
```

Os scripts `web`, `android` e `ios` iniciam os fluxos do Expo. Dependem de navegador, emulador ou dispositivo e das ferramentas compatíveis com o SDK. `build:web` exporta a versão web e aplica o ajuste PWA em `scripts/patch-pwa-html.js`.

Para reproduzir o job da cópia interna, entre em `paulinho-pastel-app/` antes de instalar e testar. Não misture código de uma versão com regras, configuração ou artefatos da outra.

## Testes e limites

Os testes existentes exercitam adaptadores de autenticação/pedidos, componentes do cardápio e geração de payload Pix, com dependências Firebase simuladas.

Execute em cada diretório de aplicação. `--roots src` restringe o Jest àquela versão, evitando descoberta recursiva e colisão com o manifesto da outra cópia:

```bash
npm test -- --runInBand --roots src
```

A CI instala e executa Jest separadamente na raiz e em `paulinho-pastel-app/`, com permissões de leitura e actions fixadas por SHA. Os 17 testes da raiz passaram localmente em Node.js 24. Os testes de cardápio ainda emitem avisos de `act()`/atualizações assíncronas; eles precisam de revisão, e um resultado verde não os elimina. A aprovação de ambos os jobs não comprova segurança das regras Firestore, pagamentos, notificações ou funcionamento em produção.

## Antes de usar com pessoas ou dados reais

- Validar a configuração Firebase da versão escolhida e testar autorização com contas fictícias e regras correspondentes. Não publicar regras ou alterar papéis automaticamente durante esta organização.
- Conferir a configuração Pix localmente. Gerar um QR Code não confirma recebimento ou liquidação do pagamento.
- Verificar índices, fluxo de cadastro, confirmação de e-mail, perfis de cliente/admin e notificações no ambiente de teste.
- O README anterior relata exposição histórica de um token do Notion. A remoção de `.env` da versão atual não revoga credenciais nem limpa o histórico. A rotação precisa ser confirmada pelo responsável; ela não foi verificada nesta revisão.
- Não versionar credenciais, arquivos locais de ambiente, caches Firebase ou builds. `.env.example` contém somente um campo vazio para a automação Notion; não representa toda a configuração do aplicativo.

O [guia anterior](docs/legacy-setup.md) foi preservado para consulta histórica. Suas versões, contagens de testes e instruções de demonstração não devem ser tomadas como estado atual sem verificação.

## Próxima etapa de organização

Reproduzir os testes das duas versões separadamente, verificar suas regras e funcionalidades, decidir a versão canônica e só então consolidar com regressões e revisão. Não há equivalência comprovada; esta PR não remove nenhuma das duas aplicações.

A [licença MIT](LICENSE) permanece preservada. O conteúdo de projetos da organização Profit-LTDA não foi copiado para este repositório.
