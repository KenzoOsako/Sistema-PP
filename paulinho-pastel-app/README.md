# Paulinho Pastel — App (Fase 0)

Protótipo de atendimento (cliente + admin) para o Paulinho Pastel. React Native + Expo, Firebase (Auth + Firestore).

## Pré-requisitos

- Node.js 18+ instalado
- Um celular com o app **Expo Go** instalado (Android: Play Store / iOS: App Store) — mais rápido para testar do que gerar APK
- Celular e computador na **mesma rede Wi-Fi**

## Rodando localmente

```bash
cd paulinho-pastel-app
npm install --legacy-peer-deps
npx expo start
```

Isso abre um QR Code no terminal. Escaneie com a câmera do celular (iOS) ou pelo app Expo Go (Android) — o app abre direto, sem precisar instalar nada além do Expo Go.

> `--legacy-peer-deps` é necessário por causa de conflitos de peer dependency entre o Expo SDK 57 e algumas libs de teste — não afeta o app em si, só a instalação.

## Rodando os testes

```bash
npx jest
```

Devem passar 3 suítes / 6 testes (adapter de pedidos, tela de cardápio, gerador de payload Pix).

## ⚠️ Antes de qualquer demonstração real

1. **Chave Pix**: edite `src/config.js` e troque `CHAVE_PIX_DO_PAULINHO_AQUI` pela chave Pix real dele. Sem isso, o QR Code gerado é estruturalmente válido mas aponta para uma chave inexistente — não vai cair dinheiro nenhum.
2. **Firestore Rules**: publique o conteúdo de `firestore.rules` no console do Firebase (Firestore Database → Regras) ou via `firebase deploy --only firestore:rules`. Sem isso, dependendo do modo do projeto, o banco pode estar público demais (qualquer um lê/escreve) ou fechado demais (nada funciona).
3. **Índice do Firestore**: publique `firestore.indexes.json` (`firebase deploy --only firestore:indexes`) ou crie manualmente no console. Sem isso, a tela "Meus Pedidos" do cliente vai quebrar com um erro de índice ausente na primeira vez que rodar — teste esse fluxo especificamente antes da reunião.
4. **Conta admin**: crie uma conta normal pelo app (registro com telefone/senha), depois vá no console do Firebase → Firestore → coleção `users` → ache o documento pelo `uid` dessa conta → mude o campo `role` de `"client"` para `"admin"` manualmente. É assim que uma conta vira admin agora (antes era só digitar "999", o que foi removido por segurança).
5. **Rotacionar o token do Notion**: o `.env` com o token antigo esteve commitado publicamente neste repositório. Gere um novo token nas integrações do Notion antes de reusar qualquer automação que dependa dele.

## Gerando um APK para instalar direto (sem Expo Go)

Para o fluxo real da demo (QR Code no trailer → download do APK), use o EAS Build:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```

Isso gera um link de download do `.apk` ao final do build (roda na nuvem da Expo, leva alguns minutos). Esse é o link que vai virar QR Code para o Paulinho escanear.
