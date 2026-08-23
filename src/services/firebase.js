import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getFirestore as getFirestoreLite } from 'firebase/firestore/lite';

// Projeto Firebase próprio do Felipe, criado pra destravar os testes da
// Fase 0 sem depender do acesso do Kenzo (o projeto "paulinho-pastel"
// original tinha a Cloud Firestore API desabilitada no Google Cloud, e só
// quem é dono do projeto pode habilitar isso). Trocar de volta pro projeto
// principal quando a equipe decidir migrar/consolidar.
const firebaseConfig = {
  apiKey: "AIzaSyCqLQGUrINfXRclbUqum9CMsJQjzN9x6Mk",
  authDomain: "paulinho-pastel-dev.firebaseapp.com",
  projectId: "paulinho-pastel-dev",
  storageBucket: "paulinho-pastel-dev.firebasestorage.app",
  messagingSenderId: "724682088792",
  appId: "1:724682088792:web:c4aea02887c1783550452d",
  measurementId: "G-1TX770YCL3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Redes de faculdade/corporativas (e às vezes até WSL, com sua própria rede
// virtualizada) costumam ter problemas com o canal de streaming (WebChannel/
// gRPC) que o Firestore usa por padrão no navegador. A versão "auto-detect"
// tenta o canal normal primeiro e só troca pra long-polling se detectar
// falha — essa detecção em si pode levar vários segundos. Forçando
// long-polling direto, pulamos essa detecção e a conexão fica mais rápida
// e consistente (é o transporte compatível com qualquer proxy/firewall).
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  // Sem isso, o long-polling ainda usa a Fetch API com streaming de corpo —
  // que é justamente o que proxy/antivírus de rede restrita costuma
  // interromper no meio, deixando a requisição pendurada pra sempre (foi o
  // getDoc de getUserRole estourando o timeout mesmo com long-polling
  // ligado). Forçando XHR em vez de fetch-stream, a conexão fecha e reabre
  // do jeito clássico, que é o que atravessa esse tipo de rede.
  useFetchStreams: false,
});

// SEGUNDA conexão com o MESMO banco, mas usando o SDK "Lite" do Firestore.
//
// Diagnóstico: toda chamada simples de Auth (login/cadastro — um POST só,
// pergunta-resposta) sempre voltou rápido, em qualquer rede testada (WSL e
// Windows nativo). Só as chamadas do Firestore normal, que mantêm um canal
// de streaming permanente aberto (WebChannel/long-polling) mesmo pra uma
// leitura única, é que travam — mesmo já forçando long-polling e XHR acima.
// Isso indica que a rede (WSL, roteador ou provedor) está especificamente
// atrapalhando esse tipo de conexão de longa duração, não o Firestore/
// Google em si.
//
// O SDK Lite (`firebase/firestore/lite`) faz cada operação como uma
// chamada REST avulsa — exatamente como o Auth — sem canal persistente.
// Deve ser praticamente imune a esse bloqueio. A limitação é que ele NÃO
// suporta onSnapshot (tempo real), então usamos:
//   - `dbLite` para toda ação pontual: login/cadastro (getUserRole, setDoc
//     do perfil), criar pedido, mudar status do pedido, cadastrar/excluir
//     produto.
//   - `db` (normal) só pra quem realmente precisa de tempo real: a lista
//     ao vivo de pedidos (fila do admin) e de produtos (cardápio).
export const dbLite = getFirestoreLite(app);
