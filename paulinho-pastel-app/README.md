# Paulinho Pastel — cópia interna

Este diretório contém uma das versões testadas separadamente pela CI. Ele diverge da aplicação localizada na raiz do repositório.

Consulte o [README principal](../README.md) para instalação, limites da validação e cuidados antes de usar dados reais. O [mapa das versões](../docs/repository-layout.md) registra as diferenças; o [guia antigo](../docs/legacy-setup.md) foi preservado como referência histórica.

Use Node.js 24. Neste diretório, execute `npm ci --legacy-peer-deps` e `npm test -- --runInBand --roots src`. Esse comando testa somente esta cópia. A CI possui outro job para a raiz; os testes não validam o Firebase hospedado.
