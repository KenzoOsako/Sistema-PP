import subprocess

content = """---
tags:
  - architecture
  - mobile
  - paulinho-pastel
status: in-progress
---
# Paulinho Pastel - Arquitetura (Fase 0)

## Visão Geral
Protótipo de aplicativo (Cliente e Admin) para validação de hipótese de valor com o Paulinho. O foco é resolver a dor do tempo de espera e fila física.

## Stack Tecnológica
- **Mobile (Front-end):** React Native + Expo
  - *Justificativa:* Compilação rápida de APK, desenvolvimento ágil, cross-platform.
- **Backend-as-a-Service (BaaS):** Firebase
  - *Autenticação:* Firebase Auth (Telefone + Senha).
  - *Banco de Dados:* Firestore (Sincronização em tempo real para a fila de pedidos).
  - *Notificações:* Firebase Cloud Messaging (Push notifications para o cliente).
- **Pagamentos:** Gerador local de payload Pix EMV (QR Code estático direto para a chave do Paulinho).

## Estrutura de Dados (Draft Inicial)
- **Users:** `id`, `phone`, `role` (client | admin)
- **Products:** `id`, `name`, `description`, `price`
- **Orders:** `id`, `client_id`, `items`, `total`, `status` (received, preparing, ready), `created_at`
"""

cmd = ["obsidian", "create", "name=Paulinho Pastel - Arquitetura Fase 0", f"content={content}", "vault=Main"]
try:
    subprocess.run(cmd, check=True, shell=True)
    print("Nota criada no Obsidian!")
except Exception as e:
    print(e)
