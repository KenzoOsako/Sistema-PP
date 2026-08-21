// Config do Jest extraída pra arquivo próprio (em vez de ficar dentro do
// "jest" no package.json) porque precisamos ESTENDER o preset do jest-expo
// dinamicamente, não substituí-lo — um objeto estático em JSON sobrescreve
// por completo as chaves do preset (transform, transformIgnorePatterns),
// e copiar esses valores à mão quebra silenciosamente a cada bump de versão
// do jest-expo/@react-native.
//
// Dois bugs reais corrigidos aqui, achados rodando "npm test" local e
// reproduzindo o mesmo erro do CI (workflow "Full-Stack CI/CD Gatekeeper"):
//
// 1. O SDK do Firebase (v9+) é distribuído em ESM puro (import/export) em
//    vários pacotes (firebase/app, firebase/firestore/lite, @firebase/*).
//    O preset padrão do jest-expo ignora tudo em node_modules exceto uma
//    lista de pacotes React Native/Expo — Firebase não está nessa lista,
//    então o Jest tentava rodar o ESM cru como CommonJS e quebrava com
//    "SyntaxError: Unexpected token 'export'". Resolvido liberando
//    "firebase" e "@firebase" no transformIgnorePatterns (ou seja,
//    passam pelo Babel como tudo mais).
// 2. Depois de liberar a transformação, sobrava um arquivo .mjs solto
//    (@firebase/util/dist/postinstall.mjs) que também quebrava, porque o
//    padrão de transform do preset só casa arquivos .js/.jsx/.ts/.tsx —
//    nunca .mjs. Resolvido reaproveitando a MESMA config do babel-jest do
//    preset (não uma cópia hardcoded) também pra extensão .mjs.
const preset = require('jest-expo/jest-preset');

const jsxTransform = preset.transform['\\.[jt]sx?$'];

module.exports = {
  ...preset,
  maxWorkers: 1,
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|firebase|@firebase))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
  transform: {
    ...preset.transform,
    ...(jsxTransform ? { '\\.mjs$': jsxTransform } : {}),
  },
};
