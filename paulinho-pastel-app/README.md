# Paulinho Pastel — cópia interna

Este diretório contém a versão atualmente usada pela CI. Ele diverge da aplicação localizada na raiz do repositório.

Consulte o [README principal](../README.md) para instalação, limites da validação e cuidados antes de usar dados reais. O [mapa das versões](../docs/repository-layout.md) registra as diferenças; o [guia antigo](../docs/legacy-setup.md) foi preservado como referência histórica.

Para reproduzir a seleção atual da CI, execute neste diretório `npm ci --legacy-peer-deps` e `npm test -- --runInBand`. Isso não testa automaticamente a aplicação da raiz nem valida o Firebase hospedado.
