// Boot do jogo: cena, camera, renderer, loop principal
var cena, camera, renderer, relogio;

function iniciarJogo() {
  cena = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    72,
    window.innerWidth / window.innerHeight,
    0.1,
    1700
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

  // Ordem importa: mapa-mg → mundo → trilha → floresta (depende da trilha) → personagem → controles → camera → audio
  // mapa-mg.js gera a silhueta de MG (mask + bounds) usada por mundo, colisao,
  // floresta, spawn, claim — precisa rodar primeiro de tudo.
  if (typeof iniciarMapaMG === 'function') iniciarMapaMG();
  iniciarMundo();
  inicializarEstrelas();   // depende do ceuGrupo criado em iniciarMundo
  iniciarTrilha();
  iniciarRio();           // depois da trilha (floresta filtra ambos)
  iniciarFloresta();
  // Decoracao aquatica do Pirate Kit (precisa de rio + modelos carregados)
  if (typeof colocarPontePirate === 'function') {
    colocarPontePirate();
    colocarDocaEbarco();
    colocarPalmeirasMargem();
    colocarCliffs();
  }
  // Spawna animais animados pelo mapa
  if (typeof spawnarAnimais === 'function') spawnarAnimais();
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

  // Gating de spawn — primeiro login: jogador escolhe onde nascer
  // Login subsequente: posiciona no spawn salvo
  var spawn = window.estadoServidor && window.estadoServidor.player && window.estadoServidor.player.spawn;
  if (spawn) {
    personagem.position.set(spawn.x, 0, spawn.z);
  } else {
    // Sem spawn salvo: entra no modo "escolha onde nascer"
    if (typeof entrarModoEscolherSpawn === 'function') entrarModoEscolherSpawn();
  }

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
  if (typeof atualizarAnimais === 'function') atualizarAnimais(delta);
  if (typeof atualizarMover === 'function') atualizarMover(delta);
  atualizarAudio(delta);
  enviarPingPosicao();

  renderer.render(cena, camera);
}

// Estado carregado do servidor antes do jogo iniciar
window.estadoServidor = null;

// Boot: tela login → tela inicial → jogo
document.addEventListener('DOMContentLoaded', function() {
  inicializarLogin();

  // Pre-carrega modelos 3d (colono + vegetacao + pirate) em background
  if (typeof carregarModeloColono === 'function') {
    carregarModeloColono().catch(function(e) { console.error('Erro colono:', e); });
  }
  if (typeof carregarModelosVegetacao === 'function') {
    carregarModelosVegetacao().catch(function(e) { console.error('Erro vegetacao:', e); });
  }
  if (typeof carregarModelosPirate === 'function') {
    carregarModelosPirate().catch(function(e) { console.error('Erro pirate:', e); });
  }
  if (typeof carregarModelosAnimais === 'function') {
    carregarModelosAnimais().catch(function(e) { console.error('Erro animais:', e); });
  }

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
      // Carrega estado + modelos 3d em paralelo
      var resultados = await Promise.all([
        apiCarregarEstado(),
        carregarModeloColono(),
        carregarModelosVegetacao(),
        carregarModelosPirate(),
        carregarModelosAnimais()
      ]);
      window.estadoServidor = resultados[0];
    } catch (e) {
      btn.disabled = false;
      btn.textContent = 'Começar';
      alert('Erro ao carregar: ' + e.message);
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
