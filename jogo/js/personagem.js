// Personagem do player principal — usa modelo .glb com skeletal animation
// (Idle/Walk/Run cross-faded). Camisa "colorida" via tint do material principal.
var personagem;

// Mantida pra compatibilidade com codigo antigo (cor de camisa hash do nome)
var CORES_COLONO = {
  pele: 0xd49060,
  camisa: 0x7a4a26,
  calca: 0x3d2812,
  chapeu: 0xc8a060,
  barba: 0x3a2010,
  bota: 0x2a1808,
  cabelo: 0x2a1810,
  cinto: 0x4a2812,
  sandalia: 0x6a3818,
  manga: 0x5a3818
};

function iniciarPersonagem() {
  // O modelo deve ter sido pre-carregado em main.js antes de chamar isso
  var corHex = CORES_COLONO.camisa;
  if (window.session && window.session.player && window.session.player.cor_camisa
      && typeof corHslParaHex === 'function') {
    var c = corHslParaHex(window.session.player.cor_camisa);
    if (c) corHex = c;
  }
  personagem = criarColonoComAnimacao(corHex);
  personagem.position.set(-160, 0, -160);
  personagem.rotation.y = Math.PI / 4;
  cena.add(personagem);
}

function atualizarPersonagem(delta) {
  if (!personagem) return;
  animarColonoGLB(personagem, {
    andando: estaAndando, correndo: correndo, delta: delta
  });
}

// Compat: outros-jogadores.js chama criarCorpoColono — redireciona pro modelo
function criarCorpoColono(corCamisa) {
  return criarColonoComAnimacao(corCamisa);
}

// Compat: animarColono delega pro animarColonoGLB
function animarColono(grupo, estado) {
  animarColonoGLB(grupo, estado);
}
