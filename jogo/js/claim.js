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

  // Rejeita claim fora da silhueta de MG (defesa em profundidade — colisao
  // ja barra mas se algum bug deixar passar, evita persistir lote invalido).
  if (typeof dentroDoEstado === 'function' && !dentroDoEstado(px, pz)) {
    mostrarDica('Voce esta fora de Minas Gerais', 2500);
    return;
  }

  var rotY = obterRotacaoAlinhada(px, pz);

  // Verifica se algum ponto do perimetro do retangulo invade a trilha
  if (perimetroInvadeATrilha(px, pz, CLAIM_LARG, CLAIM_PROF, rotY)) {
    mostrarDica('Terreno fica em cima da trilha — escolha outro lugar', 3500);
    return;
  }

  // Tenta clamar no servidor — pode ajustar rotY ou rejeitar por overlap
  var resp;
  try {
    resp = await apiSalvarClaim({
      x: px, z: pz, larg: CLAIM_LARG, prof: CLAIM_PROF, rotY: rotY
    });
  } catch (e) {
    mostrarDica(e.message || 'Não foi possível clamar', 3500);
    return;
  }

  // Server pode ter sobrescrito rotY pra alinhar com vizinho — usa o que voltou
  var rotYFinal = (resp && typeof resp.rotY === 'number') ? resp.rotY : rotY;

  claimAtual = {
    x: px, z: pz, larg: CLAIM_LARG, prof: CLAIM_PROF, rotY: rotYFinal, t: Date.now()
  };

  construirCercaVisual(px, pz, CLAIM_LARG, CLAIM_PROF, rotYFinal);
  if (typeof limparVegetacaoRetanguloRotacionado === 'function') {
    limparVegetacaoRetanguloRotacionado(px, pz, CLAIM_LARG - 1, CLAIM_PROF - 1, rotYFinal);
  }
  if (typeof atualizarPilhas === 'function') atualizarPilhas();
  mostrarMensagem('Esta terra é sua. Colete madeira e pedra para construir.', 5500);
}

// Testa 8 pontos no perimetro do retangulo proposto contra a trilha
function perimetroInvadeATrilha(cx, cz, larg, prof, rotY) {
  var halfL = larg / 2, halfP = prof / 2;
  var cosR = Math.cos(rotY || 0);
  var sinR = Math.sin(rotY || 0);
  var pontos = [
    // 4 cantos
    { x:  halfL, z:  halfP }, { x: -halfL, z:  halfP },
    { x: -halfL, z: -halfP }, { x:  halfL, z: -halfP },
    // 4 pontos medios das laterais (pra captar invasao mesmo se cantos OK)
    { x: 0, z:  halfP }, { x: 0, z: -halfP },
    { x:  halfL, z: 0 }, { x: -halfL, z: 0 }
  ];
  for (var i = 0; i < pontos.length; i++) {
    var px = cx + pontos[i].x * cosR - pontos[i].z * sinR;
    var pz = cz + pontos[i].x * sinR + pontos[i].z * cosR;
    if (distanciaAteTrilha(px, pz) < 3) return true;
  }
  return false;
}

// Calcula rotacao Y do novo terreno:
// 1) Se houver claim de OUTRO player perto (raio 35m), usa a mesma rotacao
//    — terrenos vizinhos ficam paralelos, organizados como em uma vila.
// 2) Senao, alinha com a tangente da trilha mais proxima.
function obterRotacaoAlinhada(x, z) {
  // 1. Vizinho mais proximo (claim de outro player)
  var rotVizinho = rotYDeClaimVizinhoMaisProx(x, z, 35);
  if (rotVizinho !== null) return rotVizinho;

  // 2. Tangente da trilha
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
  return Math.atan2(tan.z, tan.x);
}

// Acha o claim de outro jogador mais proximo dentro de raioBusca.
// Retorna a rotY dele (pra alinhar) ou null se nao houver.
function rotYDeClaimVizinhoMaisProx(x, z, raioBusca) {
  if (typeof claimsOutros === 'undefined') return null;
  var raio2 = raioBusca * raioBusca;
  var menorDist2 = Infinity;
  var melhorRotY = null;
  for (var id in claimsOutros) {
    var c = claimsOutros[id];
    if (c.x === undefined || c.z === undefined) continue;
    var dx = x - c.x;
    var dz = z - c.z;
    var d2 = dx * dx + dz * dz;
    if (d2 < raio2 && d2 < menorDist2) {
      menorDist2 = d2;
      melhorRotY = c.rotY || 0;
    }
  }
  return melhorRotY;
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

// Tecla H — volta pra casa (centro do claim, ou spawn se ainda não tem claim)
function voltarParaCasa() {
  if (!personagem) return;
  var alvo = null;
  if (claimAtual) {
    alvo = { x: claimAtual.x, z: claimAtual.z };
  } else if (window.session && window.session.player && window.session.player.spawn) {
    alvo = window.session.player.spawn;
  }
  if (!alvo) {
    if (typeof mostrarDica === 'function') mostrarDica('Você ainda não tem casa', 2500);
    return;
  }
  personagem.position.set(alvo.x, alturaSeguraEm(alvo.x, alvo.z), alvo.z);
  if (typeof mostrarDica === 'function') mostrarDica('Voltou pra casa', 1500);
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
