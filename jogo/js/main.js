// Boot do jogo: cena, camera, renderer, loop principal
var cena, camera, renderer, relogio;

function iniciarJogo() {
  cena = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    72,
    window.innerWidth / window.innerHeight,
    0.1,
    400
  );

  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('canvas-jogo'),
    antialias: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  if (renderer.outputColorSpace !== undefined) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  // Sombras dinamicas
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Tone mapping cinematografico (color grading suave dourado)
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  relogio = new THREE.Clock();

  // Ordem importa: mundo → trilha → floresta (depende da trilha) → personagem → controles → camera → audio
  iniciarMundo();
  inicializarEstrelas();   // depende do ceuGrupo criado em iniciarMundo
  iniciarTrilha();
  iniciarFloresta();
  iniciarPersonagem();
  iniciarControles();
  iniciarCamera();
  iniciarAudio();
  inicializarTempo();      // ciclo dia/noite

  // Modulos da Fase 2: inventario + HUD + claim + coleta + pilhas visuais
  inicializarInventario();
  inicializarHud();
  inicializarClaim();
  inicializarColeta();
  // Materializa as pilhas se ja houver claim+inventario salvos
  atualizarPilhas();
  // Fase 3: construcao de cabanas
  inicializarConstrucao();
  // Fase 3.1: fumaca das chamines das cabanas existentes
  inicializarFumaca();
  // Fogueiras (carrega do localStorage)
  inicializarFogueiras();
  // Outros jogadores (Fase 4.1+4.2): polling do servidor pra ver claims/cabanas/fogueiras/avatares
  inicializarOutrosJogadores();
  // Controles touch (auto-detecta mobile)
  inicializarTouch();

  window.addEventListener('resize', aoRedimensionar);

  animar();
}

function aoRedimensionar() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animar() {
  requestAnimationFrame(animar);
  var delta = Math.min(relogio.getDelta(), 0.1);

  atualizarControles(delta);
  atualizarPersonagem(delta);
  atualizarCamera(delta);
  atualizarCeu();
  atualizarTempo(delta);
  atualizarSombra();
  atualizarVento(delta);
  atualizarConstrucao(delta);
  atualizarFumaca(delta);
  atualizarFogueiras(delta);
  atualizarOutrosJogadores(delta);
  atualizarAudio(delta);
  enviarPingPosicao();

  renderer.render(cena, camera);
}

// Estado carregado do servidor antes do jogo iniciar
window.estadoServidor = null;

// Boot: tela login → tela inicial → jogo
document.addEventListener('DOMContentLoaded', function() {
  inicializarLogin();

  document.getElementById('btn-comecar').addEventListener('click', async function() {
    if (!window.session) {
      mostrarMensagem('Faça login antes de começar.', 3000);
      inicializarLogin();
      return;
    }
    var btn = document.getElementById('btn-comecar');
    btn.disabled = true;
    btn.textContent = 'Carregando...';
    try {
      window.estadoServidor = await apiCarregarEstado();
    } catch (e) {
      btn.disabled = false;
      btn.textContent = 'Começar';
      alert('Erro ao carregar estado do servidor: ' + e.message);
      return;
    }

    var telaInicial = document.getElementById('tela-inicial');
    telaInicial.classList.add('oculto');

    setTimeout(function() {
      iniciarJogo();
      mostrarMensagem('Bem-vindo a Minas Gerais, ' + window.session.player.nome + '.', 5000);
    }, 300);
  });
});

// Ping de posicao no servidor a cada 2s (Fase 4.2 vai usar isso pra mostrar outros)
var ultimoPing = 0;
function enviarPingPosicao() {
  if (!window.session || !personagem) return;
  var agora = performance.now();
  if (agora - ultimoPing < 2000) return;
  ultimoPing = agora;
  apiPingPosicao(
    personagem.position.x, personagem.position.z, personagem.rotation.y
  ).catch(function() {}); // silencioso — sem network nao quebra o jogo
}

function mostrarMensagem(texto, duracao) {
  var msg = document.getElementById('mensagem');
  msg.textContent = texto;
  msg.classList.remove('oculto');
  setTimeout(function() {
    msg.classList.add('oculto');
  }, duracao);
}
