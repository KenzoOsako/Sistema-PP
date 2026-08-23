// O export web do Expo (Metro) não injeta automaticamente o link do
// manifest.json nem as meta tags específicas que o iOS/Safari exige pra
// "Adicionar à Tela de Início" funcionar em modo standalone (sem barra do
// navegador). Este script roda depois do `expo export --platform web` e
// insere essas tags no dist/index.html gerado.
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('dist/index.html não encontrado. Rode "expo export --platform web" antes.');
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');

const pwaTags = `
  <link rel="manifest" href="/manifest.json"/>
  <link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Paulinho Pastel">
  <meta name="mobile-web-app-capable" content="yes">
</head>`;

if (html.includes('rel="manifest"')) {
  console.log('Tags de PWA já presentes, nada a fazer.');
} else {
  html = html.replace('</head>', pwaTags);
  fs.writeFileSync(indexPath, html);
  console.log('Tags de PWA injetadas em dist/index.html com sucesso.');
}
