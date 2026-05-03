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
  // Spawn inicial provisorio — main.js sobrescreve depois com spawn salvo
  // ou modo escolher. Y vem do terreno (Fase B com relevo).
  personagem.position.set(-160, alturaSeguraEm(-160, -160), -160);
  personagem.rotation.y = Math.PI / 4;
  cena.add(personagem);
}

function atualizarPersonagem(delta) {
  if (!personagem) return;
  // Gruda no terreno: Y do personagem = altura do solo na posicao XZ atual.
  // Sem isso, em terreno com relevo o personagem flutua/afunda.
  if (typeof alturaEm === 'function') {
    personagem.position.y = alturaEm(personagem.position.x, personagem.position.z);
  }
  animarColonoGLB(personagem, {
    andando: estaAndando, correndo: correndo, delta: delta
  });
}

// Helper: altura do terreno em (x, z), com fallback a 0 caso relevo.js nao
// esteja carregado. Usado em iniciarPersonagem e em pontos onde a altura
// precisa ser definida ANTES do loop atualizar (spawn, claim, voltarParaCasa).
function alturaSeguraEm(x, z) {
  return (typeof alturaEm === 'function') ? alturaEm(x, z) : 0;
}

// Compat: outros-jogadores.js chama criarCorpoColono — redireciona pro modelo
function criarCorpoColono(corCamisa) {
  return criarColonoComAnimacao(corCamisa);
}

// Compat: animarColono delega pro animarColonoGLB
function animarColono(grupo, estado) {
  animarColonoGLB(grupo, estado);
}
