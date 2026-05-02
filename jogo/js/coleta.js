// Coleta de recursos: tecla E coleta arvore (madeira) ou pedra (pedra) mais proxima
var ultimaColetaMs = 0;
var cooldownColeta = 400;
var raioInteracao = 2.8;
var matrixZeroColeta = new THREE.Matrix4();

function inicializarColeta() {
  // Pre-cria matriz "zero" usada pra esconder instancias coletadas
  matrixZeroColeta.makeScale(0, 0, 0);
}

function tentarColeta() {
  var agora = performance.now();
  if (agora - ultimaColetaMs < cooldownColeta) return;

  var px = personagem.position.x;
  var pz = personagem.position.z;

  // -1. Móveis interativos (cama dorme, etc.) — prioridade alta
  if (typeof tentarInteragirMovel === 'function') {
    if (tentarInteragirMovel(px, pz, 1.8)) {
      ultimaColetaMs = agora;
      return;
    }
  }

  // 0. Se tem fogueira apagada perto, prioriza acender (mesma tecla E)
  if (typeof tentarAcenderFogueiraProx === 'function') {
    if (tentarAcenderFogueiraProx(px, pz, raioInteracao)) {
      ultimaColetaMs = agora;
      return;
    }
  }

  // 1. Tenta arvore mais proxima
  var arv = encontrarMaisProximo(arvoresPos, px, pz);
  if (arv) {
    removerArvore(arv);
    adicionarRecurso('madeira', 3);
    mostrarDica('+3 Madeira', 1500);
    ultimaColetaMs = agora;
    return;
  }

  // 2. Senao, tenta pedra
  var ped = encontrarMaisProximo(pedrasPos, px, pz);
  if (ped) {
    removerPedra(ped);
    adicionarRecurso('pedra', 1);
    mostrarDica('+1 Pedra', 1500);
    ultimaColetaMs = agora;
    return;
  }

  mostrarDica('Nada por perto para coletar', 1500);
}

function encontrarMaisProximo(arr, px, pz) {
  var menorDist = Infinity;
  var alvo = null;
  var raio2 = raioInteracao * raioInteracao;

  for (var i = 0; i < arr.length; i++) {
    var dx = px - arr[i].x;
    var dz = pz - arr[i].z;
    var d2 = dx * dx + dz * dz;
    if (d2 < menorDist && d2 < raio2) {
      menorDist = d2;
      alvo = arr[i];
    }
  }
  return alvo;
}

function removerArvore(arv) {
  // Esconde instancia (escala 0 — fica invisivel mas nao precisa mexer no count)
  arv.troncoMesh.setMatrixAt(arv.idx, matrixZeroColeta);
  arv.copaMesh.setMatrixAt(arv.idx, matrixZeroColeta);
  arv.troncoMesh.instanceMatrix.needsUpdate = true;
  arv.copaMesh.instanceMatrix.needsUpdate = true;

  // Tambem zera a matriz original guardada pelo vento (senao vento sobrescreve no proximo frame)
  if (typeof copasParaVento !== 'undefined') {
    for (var k = 0; k < copasParaVento.length; k++) {
      if (copasParaVento[k].mesh === arv.copaMesh) {
        var arr = copasParaVento[k].matrizesOriginais;
        for (var j = 0; j < 16; j++) arr[arv.idx * 16 + j] = 0;
      }
    }
  }

  // Tira do array de colisao
  var i = arvoresPos.indexOf(arv);
  if (i >= 0) arvoresPos.splice(i, 1);
}

function removerPedra(ped) {
  ped.mesh.setMatrixAt(ped.idx, matrixZeroColeta);
  ped.mesh.instanceMatrix.needsUpdate = true;

  var i = pedrasPos.indexOf(ped);
  if (i >= 0) pedrasPos.splice(i, 1);
}

// Limpa arvores e pedras dentro de um retangulo alinhado aos eixos (usado no claim retangular)
function limparVegetacaoRetangulo(cx, cz, larg, prof) {
  var halfL = larg / 2;
  var halfP = prof / 2;
  for (var i = arvoresPos.length - 1; i >= 0; i--) {
    var dx = arvoresPos[i].x - cx;
    var dz = arvoresPos[i].z - cz;
    if (Math.abs(dx) < halfL && Math.abs(dz) < halfP) removerArvore(arvoresPos[i]);
  }
  for (var j = pedrasPos.length - 1; j >= 0; j--) {
    var dx2 = pedrasPos[j].x - cx;
    var dz2 = pedrasPos[j].z - cz;
    if (Math.abs(dx2) < halfL && Math.abs(dz2) < halfP) removerPedra(pedrasPos[j]);
  }
}

// Versao rotacionada: limpa dentro de um retangulo com rotacao Y arbitraria
function limparVegetacaoRetanguloRotacionado(cx, cz, larg, prof, rotY) {
  var halfL = larg / 2;
  var halfP = prof / 2;
  var cosR = Math.cos(-(rotY || 0));
  var sinR = Math.sin(-(rotY || 0));

  for (var i = arvoresPos.length - 1; i >= 0; i--) {
    var dx = arvoresPos[i].x - cx;
    var dz = arvoresPos[i].z - cz;
    var localX = dx * cosR - dz * sinR;
    var localZ = dx * sinR + dz * cosR;
    if (Math.abs(localX) < halfL && Math.abs(localZ) < halfP) removerArvore(arvoresPos[i]);
  }
  for (var j = pedrasPos.length - 1; j >= 0; j--) {
    var dx2 = pedrasPos[j].x - cx;
    var dz2 = pedrasPos[j].z - cz;
    var localX2 = dx2 * cosR - dz2 * sinR;
    var localZ2 = dx2 * sinR + dz2 * cosR;
    if (Math.abs(localX2) < halfL && Math.abs(localZ2) < halfP) removerPedra(pedrasPos[j]);
  }
}

// Limpa todas as arvores e pedras dentro de um circulo (legado, ainda usado se quiser)
function limparVegetacaoCirculo(cx, cz, raio) {
  var raio2 = raio * raio;
  for (var i = arvoresPos.length - 1; i >= 0; i--) {
    var dx = arvoresPos[i].x - cx;
    var dz = arvoresPos[i].z - cz;
    if (dx * dx + dz * dz < raio2) removerArvore(arvoresPos[i]);
  }
  for (var j = pedrasPos.length - 1; j >= 0; j--) {
    var dx2 = pedrasPos[j].x - cx;
    var dz2 = pedrasPos[j].z - cz;
    if (dx2 * dx2 + dz2 * dz2 < raio2) removerPedra(pedrasPos[j]);
  }
}

// Limpa arvores e pedras dentro do bbox rotacionado de uma cabana (mais preciso)
function limparVegetacaoBboxCabana(cabana) {
  var halfL = ((typeof LADOS_CABANA !== 'undefined' && LADOS_CABANA[cabana.tipo]) || 4) / 2 + 0.5;
  var cosR = Math.cos(-(cabana.rotY || 0));
  var sinR = Math.sin(-(cabana.rotY || 0));

  for (var i = arvoresPos.length - 1; i >= 0; i--) {
    var dx = arvoresPos[i].x - cabana.x;
    var dz = arvoresPos[i].z - cabana.z;
    var localX = dx * cosR - dz * sinR;
    var localZ = dx * sinR + dz * cosR;
    if (Math.abs(localX) < halfL && Math.abs(localZ) < halfL) {
      removerArvore(arvoresPos[i]);
    }
  }
  for (var j = pedrasPos.length - 1; j >= 0; j--) {
    var dx2 = pedrasPos[j].x - cabana.x;
    var dz2 = pedrasPos[j].z - cabana.z;
    var localX2 = dx2 * cosR - dz2 * sinR;
    var localZ2 = dx2 * sinR + dz2 * cosR;
    if (Math.abs(localX2) < halfL && Math.abs(localZ2) < halfL) {
      removerPedra(pedrasPos[j]);
    }
  }
}
