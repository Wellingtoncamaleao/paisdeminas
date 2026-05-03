// Floresta: usa modelos GLTF do pack Quaternius Stylized Nature MegaKit (CC0).
// Cada categoria visual (arvores altas, frondosas, mortas, pedras) usa 1-3
// modelos diferentes pra ter variedade. Tudo via InstancedMesh pra performance
// (1 draw call por sub-mesh por modelo).
var arvoresPos = [];
var pedrasPos = [];
var copasParaVento = [];

function iniciarFloresta() {
  // Fase C: distribuicao por bioma. Cada categoria de modelos so spawna nos
  // biomas listados em `biomasPermitidos`. densidadeBioma() controla quanto
  // populadas ficam — caatinga 25% da mata, cerrado 55%, mata 100%.
  // Mata Atlantica (sul/leste): floresta densa e diversa
  criarFlorestaModelo(['CommonTree_1', 'CommonTree_3', 'CommonTree_5'], 1100, 0.55, 6, ['mata']);
  criarFlorestaModelo(['Pine_2', 'Pine_4'], 500, 0.45, 5, ['mata']);
  criarFlorestaModelo(['BirchTree_1', 'BirchTree_3'], 500, 0.5, 5, ['mata']);
  criarFlorestaModelo(['MapleTree_1', 'MapleTree_3'], 400, 0.55, 5, ['mata']);
  // Cerrado (centro/oeste): arvores tortas espacadas, gramineas
  criarFlorestaModelo(['TwistedTree_1', 'TwistedTree_3'], 650, 0.85, 5.5, ['cerrado', 'mata']);
  // Caatinga (norte): arvores secas raras
  criarFlorestaModelo(['DeadTree_1'], 350, 0.4, 5, ['cerrado', 'caatinga']);
  criarVegetacaoBaixa();
  criarPedras();
  criarManchasChao();
}

// Sorteia uma posicao aleatoria DENTRO da silhueta de MG (rejeicao via mask).
// Fallback: range antigo +/- 190 caso mapa-mg.js nao esteja carregado.
function sortearPosNoMapa(maxTentativas) {
  if (typeof sortearPontoNoEstado === 'function') {
    var p = sortearPontoNoEstado(maxTentativas || 30);
    if (p) return p;
  }
  return { x: (Math.random() - 0.5) * 380, z: (Math.random() - 0.5) * 380 };
}

// Distribui N arvores entre os modelos da lista, evitando trilha.
// Cria 1 InstancedMesh por sub-mesh por modelo. arvoresPos guarda ref pra
// coleta funcionar (compativel com codigo antigo).
// `biomasPermitidos` (Fase C, opcional): array tipo ['mata'] ou ['cerrado','caatinga'].
// Se passado, so spawna onde biomaEm(x,z) esta na lista.
function criarFlorestaModelo(modelosIds, total, raioColisao, distMinTrilha, biomasPermitidos) {
  if (modelosIds.length === 0) return;

  // Pre-cria 1 array de InstancedMesh por modelo (cada modelo pode ter varias)
  var instsPorModelo = modelosIds.map(function(id) {
    return criarInstancedDeModelo(id, total);
  });

  // Adiciona todas a cena
  instsPorModelo.forEach(function(insts) {
    insts.forEach(function(inst) { cena.add(inst); });
  });

  // Indices de proximo slot disponivel em cada modelo
  var nextIdx = modelosIds.map(function() { return 0; });

  var dummy = new THREE.Object3D();
  var colocadas = 0;
  var tentativas = 0;
  var maxTentativas = total * 14;

  while (colocadas < total && tentativas < maxTentativas) {
    tentativas++;
    var pos = sortearPosNoMapa(8);
    if (!pos) continue;
    var x = pos.x;
    var z = pos.z;
    if (distanciaAteTrilha(x, z) < distMinTrilha) continue;
    if (typeof distanciaAteRio === 'function' && distanciaAteRio(x, z) < LARGURA_RIO + 2) continue;
    // Evita plantar em encostas muito ingremes (parede de serra)
    if (typeof inclinacaoEm === 'function' && inclinacaoEm(x, z) > 0.45) continue;
    // Filtro por bioma (Fase C)
    if (biomasPermitidos && typeof biomaEm === 'function') {
      var biomaLocal = biomaEm(x, z);
      if (biomasPermitidos.indexOf(biomaLocal) === -1) continue;
      // Aplica densidade do bioma como prob de aceitar — caatinga rejeita 75%
      if (typeof densidadeEm === 'function' && Math.random() > densidadeEm(x, z)) continue;
    }

    var modeloIdx = Math.floor(Math.random() * modelosIds.length);
    var insts = instsPorModelo[modeloIdx];
    var idx = nextIdx[modeloIdx];
    if (idx >= total) continue; // pouco provavel mas seguro

    var escala = 0.7 + Math.random() * 0.7;
    var rot = Math.random() * Math.PI * 2;

    var yChao = (typeof alturaEm === 'function') ? alturaEm(x, z) : 0;
    dummy.position.set(x, yChao, z);
    dummy.rotation.y = rot;
    dummy.scale.set(escala, escala, escala);
    dummy.updateMatrix();

    posicionarInstancia(insts, idx, dummy);

    // arvoresPos guarda referencia pro tronco (insts[0]) e pras "copas" (insts[1] se existir).
    // Compativel com coleta.js que faz removerArvore({troncoMesh, copaMesh, idx}).
    arvoresPos.push({
      x: x, z: z, raio: raioColisao * escala,
      troncoMesh: insts[0],
      copaMesh: insts[1] || insts[0], // se so 1 sub-mesh, usa o mesmo
      idx: idx,
      // pra animacao de vento, guarda ref do mesh de folhas
      _todosInsts: insts
    });
    nextIdx[modeloIdx] = idx + 1;
    colocadas++;
  }

  // Finaliza com count correto e marca matriz dirty
  for (var m = 0; m < instsPorModelo.length; m++) {
    finalizarInstanced(instsPorModelo[m], nextIdx[m]);
    // Adiciona copas (sub-mesh 2+) ao vento se existir
    if (instsPorModelo[m].length >= 2) {
      copasParaVento.push({
        mesh: instsPorModelo[m][1],
        intensidade: 0.04,
        matrizesOriginais: clonarMatrizes(instsPorModelo[m][1])
      });
    }
  }
}

function clonarMatrizes(meshInstanced) {
  var copia = new Float32Array(meshInstanced.instanceMatrix.array.length);
  copia.set(meshInstanced.instanceMatrix.array);
  return copia;
}

// Pedras — usa Rock_Medium_1/2/3 e Pebble_Round
function criarPedras() {
  var modelos = ['Rock_Medium_1', 'Rock_Medium_2', 'Rock_Medium_3', 'Pebble_Round_1', 'Pebble_Round_3'];
  var total = 1000;

  var instsPorModelo = modelos.map(function(id) {
    return criarInstancedDeModelo(id, total);
  });
  instsPorModelo.forEach(function(insts) {
    insts.forEach(function(inst) { cena.add(inst); });
  });

  var nextIdx = modelos.map(function() { return 0; });
  var dummy = new THREE.Object3D();
  var colocadas = 0;
  var tentativas = 0;

  while (colocadas < total && tentativas < total * 10) {
    tentativas++;
    var pos = sortearPosNoMapa(8);
    if (!pos) continue;
    var x = pos.x;
    var z = pos.z;
    if (distanciaAteTrilha(x, z) < 4) continue;
    if (typeof distanciaAteRio === 'function' && distanciaAteRio(x, z) < LARGURA_RIO + 2) continue;

    var modeloIdx = Math.floor(Math.random() * modelos.length);
    var insts = instsPorModelo[modeloIdx];
    var idx = nextIdx[modeloIdx];
    if (idx >= total) continue;

    var escala = 0.7 + Math.random() * 1.0;
    var yChao = (typeof alturaEm === 'function') ? alturaEm(x, z) : 0;
    dummy.position.set(x, yChao, z);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    dummy.scale.set(escala, escala, escala);
    dummy.updateMatrix();

    posicionarInstancia(insts, idx, dummy);

    pedrasPos.push({
      x: x, z: z, raio: 0.6 * escala,
      mesh: insts[0], idx: idx
    });
    nextIdx[modeloIdx] = idx + 1;
    colocadas++;
  }

  for (var m = 0; m < instsPorModelo.length; m++) {
    finalizarInstanced(instsPorModelo[m], nextIdx[m]);
  }
}

// Vegetacao baixa: bushes, ferns, grass espalhados — decorativo, sem colisao
function criarVegetacaoBaixa() {
  var modelos = ['Bush_Common', 'Bush_Common_Flowers', 'Bush_Large_Flowers', 'Fern_1', 'Grass_Common_Tall', 'Grass_Wispy_Tall', 'Flower_1_Clump'];
  var total = 4500;

  var instsPorModelo = modelos.map(function(id) {
    return criarInstancedDeModelo(id, total);
  });
  instsPorModelo.forEach(function(insts) {
    insts.forEach(function(inst) { cena.add(inst); });
  });

  var nextIdx = modelos.map(function() { return 0; });
  var dummy = new THREE.Object3D();
  var colocadas = 0;
  var tentativas = 0;

  while (colocadas < total && tentativas < total * 6) {
    tentativas++;
    var pos = sortearPosNoMapa(8);
    if (!pos) continue;
    var x = pos.x;
    var z = pos.z;
    if (distanciaAteTrilha(x, z) < 2.5) continue;
    if (typeof distanciaAteRio === 'function' && distanciaAteRio(x, z) < LARGURA_RIO + 1) continue;
    // Densidade local por bioma — caatinga vegetacao baixa rara
    if (typeof densidadeEm === 'function' && Math.random() > densidadeEm(x, z)) continue;

    // Escolhe modelo baseado no bioma local (Fase C). Mata+Cerrado → arbustos+gramineas;
    // caatinga so grama esparsa
    var modeloId = (typeof sortearModeloVegetacao === 'function')
      ? sortearModeloVegetacao(x, z, 'arbustos')
      : modelos[Math.floor(Math.random() * modelos.length)];
    if (!modeloId) continue;
    var modeloIdx = modelos.indexOf(modeloId);
    if (modeloIdx < 0) continue;
    var insts = instsPorModelo[modeloIdx];
    var idx = nextIdx[modeloIdx];
    if (idx >= total) continue;

    var escala = 0.6 + Math.random() * 0.9;
    var yChao = (typeof alturaEm === 'function') ? alturaEm(x, z) : 0;
    dummy.position.set(x, yChao, z);
    dummy.rotation.y = Math.random() * Math.PI * 2;
    dummy.scale.set(escala, escala, escala);
    dummy.updateMatrix();

    posicionarInstancia(insts, idx, dummy);
    nextIdx[modeloIdx] = idx + 1;
    colocadas++;
  }

  for (var m = 0; m < instsPorModelo.length; m++) {
    finalizarInstanced(instsPorModelo[m], nextIdx[m]);
  }
}

// Manchas de chao: musgo + folhas secas (mantem do codigo original — primitivas funcionam bem)
function criarManchasChao() {
  var geoCirc = new THREE.CircleGeometry(1, 8);
  geoCirc.rotateX(-Math.PI / 2);

  var musgoMat = new THREE.MeshLambertMaterial({ color: 0x6a9c4a });
  var musgo = new THREE.InstancedMesh(geoCirc, musgoMat, 1500);
  musgo.receiveShadow = true;
  preencherManchas(musgo, 1500, 0.05, 1.5, 3.5);
  cena.add(musgo);

  var folhasMat = new THREE.MeshLambertMaterial({ color: 0x7a5a32 });
  var folhas = new THREE.InstancedMesh(geoCirc, folhasMat, 1100);
  folhas.receiveShadow = true;
  preencherManchas(folhas, 1100, 0.06, 1.2, 2.8);
  cena.add(folhas);
}

function preencherManchas(mesh, total, alturaY, escMin, escMax) {
  var dummy = new THREE.Object3D();
  var colocadas = 0;
  var tentativas = 0;
  while (colocadas < total && tentativas < total * 4) {
    tentativas++;
    var pos = sortearPosNoMapa(6);
    if (!pos) continue;
    var esc = escMin + Math.random() * (escMax - escMin);
    var yChao = (typeof alturaEm === 'function') ? alturaEm(pos.x, pos.z) : 0;
    dummy.position.set(pos.x, yChao + alturaY, pos.z);
    dummy.rotation.y = Math.random() * Math.PI * 2;
    dummy.scale.set(esc, 1, esc);
    dummy.updateMatrix();
    mesh.setMatrixAt(colocadas, dummy.matrix);
    colocadas++;
  }
  mesh.count = colocadas;
  mesh.instanceMatrix.needsUpdate = true;
}
