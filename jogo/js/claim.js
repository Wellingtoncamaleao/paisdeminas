// Claim de terreno: tecla C demarca um lote retangular ao redor do jogador
// Visual: 4 estacas grandes nos cantos + cordinha conectando os topos (sem cerca completa)
// Persiste em localStorage. Migra automaticamente do formato antigo (raio circular).
var claimAtual = null;
var cercaGrupo = null;
var CHAVE_CLAIM = 'paisdeminas-claim';

// Tamanho default do terreno (em unidades = metros aproximados)
var CLAIM_LARG = 24;
var CLAIM_PROF = 16;

function inicializarClaim() {
  // Estado vem do servidor (window.estadoServidor.claim) - carregado antes do iniciarJogo
  if (!window.estadoServidor || !window.estadoServidor.claim) return;
  claimAtual = window.estadoServidor.claim;

  construirCercaVisual(claimAtual.x, claimAtual.z, claimAtual.larg, claimAtual.prof, claimAtual.rotY);
  if (typeof limparVegetacaoRetanguloRotacionado === 'function') {
    limparVegetacaoRetanguloRotacionado(
      claimAtual.x, claimAtual.z,
      claimAtual.larg - 1, claimAtual.prof - 1,
      claimAtual.rotY
    );
  }
}

async function tentarClaim() {
  if (claimAtual) {
    mostrarDica('Voce ja tem um terreno', 2500);
    return;
  }

  var px = personagem.position.x;
  var pz = personagem.position.z;

  if (distanciaAteTrilha(px, pz) < 5) {
    mostrarDica('Saia da trilha para clamar terreno', 2500);
    return;
  }

  var rotY = obterRotacaoAlinhada(px, pz);

  // Tenta clamar no servidor — pode falhar se outro jogador ja clamou ali
  try {
    await apiSalvarClaim({
      x: px, z: pz, larg: CLAIM_LARG, prof: CLAIM_PROF, rotY: rotY
    });
  } catch (e) {
    mostrarDica(e.message || 'Não foi possível clamar', 3500);
    return;
  }

  claimAtual = { x: px, z: pz, larg: CLAIM_LARG, prof: CLAIM_PROF, rotY: rotY, t: Date.now() };

  construirCercaVisual(px, pz, CLAIM_LARG, CLAIM_PROF, rotY);
  if (typeof limparVegetacaoRetanguloRotacionado === 'function') {
    limparVegetacaoRetanguloRotacionado(px, pz, CLAIM_LARG - 1, CLAIM_PROF - 1, rotY);
  }
  if (typeof atualizarPilhas === 'function') atualizarPilhas();
  mostrarMensagem('Esta terra é sua. Colete madeira e pedra para construir.', 5500);
}

// Acha a tangente da trilha mais proxima e devolve a rotacao Y que alinha
// o lado comprido (largura) do terreno com a direcao da trilha
function obterRotacaoAlinhada(x, z) {
  if (typeof trilhaSpline === 'undefined' || !trilhaSpline) return 0;
  var menorDist = Infinity;
  var melhorT = 0;
  for (var i = 0; i <= 120; i++) {
    var t = i / 120;
    var p = trilhaSpline.getPoint(t);
    var dx = x - p.x;
    var dz = z - p.z;
    var d = dx * dx + dz * dz;
    if (d < menorDist) {
      menorDist = d;
      melhorT = t;
    }
  }
  var tan = trilhaSpline.getTangent(melhorT);
  // Largura local (eixo X) deve apontar pra direcao da trilha
  return Math.atan2(tan.z, tan.x);
}

// Cerca minimalista — só 4 estacas grandes nos cantos. Sem cordinha (dá pra
// fazer cerca completa depois gastando madeira coletada — feature futura).
// rotY rotaciona o retangulo pra alinhar com a trilha.
function construirCercaVisual(x, z, larg, prof, rotY) {
  if (cercaGrupo) cena.remove(cercaGrupo);
  cercaGrupo = new THREE.Group();

  var matEstaca = new THREE.MeshLambertMaterial({ color: 0x4a2812 });
  var alturaEstaca = 1.8;
  var raioEstaca = 0.10;

  var halfL = larg / 2;
  var halfP = prof / 2;

  // Cantos em coords locais (sem rotacao ainda)
  var cantosLocais = [
    {  x:  halfL, z:  halfP },
    {  x: -halfL, z:  halfP },
    {  x: -halfL, z: -halfP },
    {  x:  halfL, z: -halfP }
  ];

  var cosR = Math.cos(rotY || 0);
  var sinR = Math.sin(rotY || 0);

  var estacaGeo = new THREE.CylinderGeometry(raioEstaca, raioEstaca * 1.2, alturaEstaca, 8);
  for (var i = 0; i < cantosLocais.length; i++) {
    var c = cantosLocais[i];
    // Aplica rotacao
    var ex = x + c.x * cosR - c.z * sinR;
    var ez = z + c.x * sinR + c.z * cosR;
    var estaca = new THREE.Mesh(estacaGeo, matEstaca);
    estaca.position.set(ex, alturaEstaca / 2, ez);
    estaca.castShadow = true;
    cercaGrupo.add(estaca);
  }

  cena.add(cercaGrupo);
}

// Helper pra construcao.js: ponto (px, pz) está dentro do retângulo rotacionado do claim?
function dentroDoClaim(px, pz, margem) {
  if (!claimAtual) return false;
  var m = margem || 0;
  var dx = px - claimAtual.x;
  var dz = pz - claimAtual.z;
  var rotY = claimAtual.rotY || 0;
  var cosR = Math.cos(-rotY);
  var sinR = Math.sin(-rotY);
  var localX = dx * cosR - dz * sinR;
  var localZ = dx * sinR + dz * cosR;
  return Math.abs(localX) < (claimAtual.larg / 2 - m) &&
         Math.abs(localZ) < (claimAtual.prof / 2 - m);
}
