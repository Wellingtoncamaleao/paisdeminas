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
  try {
    var salvo = localStorage.getItem(CHAVE_CLAIM);
    if (!salvo) return;
    claimAtual = JSON.parse(salvo);

    // Migracao: claim antigo tinha 'raio' (circular). Converte pra retangulo equivalente.
    if (claimAtual.raio !== undefined && claimAtual.larg === undefined) {
      claimAtual.larg = Math.max(CLAIM_LARG, claimAtual.raio * 2);
      claimAtual.prof = Math.max(CLAIM_PROF, Math.round(claimAtual.raio * 1.4));
      delete claimAtual.raio;
      try { localStorage.setItem(CHAVE_CLAIM, JSON.stringify(claimAtual)); } catch (e) {}
    }

    construirCercaVisual(claimAtual.x, claimAtual.z, claimAtual.larg, claimAtual.prof);
    // Limpa vegetacao residual ao recarregar
    if (typeof limparVegetacaoRetangulo === 'function') {
      limparVegetacaoRetangulo(claimAtual.x, claimAtual.z, claimAtual.larg - 1, claimAtual.prof - 1);
    }
  } catch (e) {
    console.warn('Falha ao ler claim:', e);
  }
}

function tentarClaim() {
  if (claimAtual) {
    mostrarDica('Voce ja tem um terreno', 2500);
    return;
  }

  var px = personagem.position.x;
  var pz = personagem.position.z;

  // Nao deixa clamar em cima da trilha
  if (distanciaAteTrilha(px, pz) < 5) {
    mostrarDica('Saia da trilha para clamar terreno', 2500);
    return;
  }

  claimAtual = {
    x: px, z: pz,
    larg: CLAIM_LARG, prof: CLAIM_PROF,
    t: Date.now()
  };

  try {
    localStorage.setItem(CHAVE_CLAIM, JSON.stringify(claimAtual));
  } catch (e) {
    console.warn('Falha ao salvar claim:', e);
  }

  construirCercaVisual(px, pz, CLAIM_LARG, CLAIM_PROF);
  // Limpa arvores e pedras dentro do retangulo (terra agora pertence ao jogador)
  if (typeof limparVegetacaoRetangulo === 'function') {
    limparVegetacaoRetangulo(px, pz, CLAIM_LARG - 1, CLAIM_PROF - 1);
  }
  if (typeof atualizarPilhas === 'function') atualizarPilhas();
  mostrarMensagem('Esta terra é sua. Colete madeira e pedra para construir.', 5500);
}

// Cerca minimalista — 4 estacas grandes nos cantos + cordinha conectando os topos
function construirCercaVisual(x, z, larg, prof) {
  if (cercaGrupo) cena.remove(cercaGrupo);
  cercaGrupo = new THREE.Group();

  var matEstaca = new THREE.MeshLambertMaterial({ color: 0x4a2812 });
  var matCorda = new THREE.MeshLambertMaterial({ color: 0x8a5a2c });

  var alturaEstaca = 1.8;
  var raioEstaca = 0.10;
  var alturaCorda = 1.65;

  var halfL = larg / 2;
  var halfP = prof / 2;

  var cantos = [
    { x:  halfL, z:  halfP }, // NE (frente direita)
    { x: -halfL, z:  halfP }, // NW (frente esquerda)
    { x: -halfL, z: -halfP }, // SW (trás esquerda)
    { x:  halfL, z: -halfP }  // SE (trás direita)
  ];

  // 4 estacas grandes nos cantos
  var estacaGeo = new THREE.CylinderGeometry(raioEstaca, raioEstaca * 1.2, alturaEstaca, 8);
  for (var i = 0; i < cantos.length; i++) {
    var c = cantos[i];
    var estaca = new THREE.Mesh(estacaGeo, matEstaca);
    estaca.position.set(x + c.x, alturaEstaca / 2, z + c.z);
    estaca.castShadow = true;
    cercaGrupo.add(estaca);
  }

  // Cordinha conectando os topos (4 segmentos)
  var corda = function(x1, z1, x2, z2) {
    var dx = x2 - x1;
    var dz = z2 - z1;
    var len = Math.sqrt(dx * dx + dz * dz);
    var geo = new THREE.BoxGeometry(len, 0.04, 0.04);
    var m = new THREE.Mesh(geo, matCorda);
    m.position.set(x + (x1 + x2) / 2, alturaCorda, z + (z1 + z2) / 2);
    m.rotation.y = -Math.atan2(dz, dx);
    cercaGrupo.add(m);
  };

  for (var j = 0; j < cantos.length; j++) {
    var a = cantos[j];
    var b = cantos[(j + 1) % cantos.length];
    corda(a.x, a.z, b.x, b.z);
  }

  cena.add(cercaGrupo);
}

// Helper pra construcao.js: ponto (px, pz) está dentro do retângulo do claim?
function dentroDoClaim(px, pz, margem) {
  if (!claimAtual) return false;
  var m = margem || 0;
  var dx = px - claimAtual.x;
  var dz = pz - claimAtual.z;
  return Math.abs(dx) < (claimAtual.larg / 2 - m) &&
         Math.abs(dz) < (claimAtual.prof / 2 - m);
}
