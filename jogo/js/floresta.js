// Floresta: 3 tipos de arvore + pedras + samambaias + arbustos + manchas de chao
// Tudo via InstancedMesh pra performance (1 draw call por tipo)
var arvoresPos = [];
var pedrasPos = [];

// Refs globais pras copas (usadas pelo modulo de vento na animação)
var copasParaVento = [];

function iniciarFloresta() {
  criarArvoresAltas();
  criarArvoresLargas();
  criarPalmeiras();
  criarPedras();
  criarSamambaias();
  criarArbustos();
  criarManchasChao();
}

// Tipo 1: árvore alta — tronco fino + copa cone (40% do total)
function criarArvoresAltas() {
  var total = 160;
  var troncoGeo = new THREE.CylinderGeometry(0.28, 0.42, 4, 6);
  troncoGeo.translate(0, 2, 0);
  var copaGeo = new THREE.ConeGeometry(2.0, 5.5, 7);
  copaGeo.translate(0, 6.5, 0);

  var troncoMat = new THREE.MeshLambertMaterial({
    color: 0x6a4a30, map: texturaCasca()
  });
  var copaMat = new THREE.MeshLambertMaterial({
    color: 0x6a8a3a, map: texturaFolhagem()
  });

  var troncos = new THREE.InstancedMesh(troncoGeo, troncoMat, total);
  var copas = new THREE.InstancedMesh(copaGeo, copaMat, total);
  troncos.castShadow = true;
  copas.castShadow = true;

  preencherArvores(troncos, copas, total, 0.55, 1, 5.5);
  cena.add(troncos);
  cena.add(copas);
  copasParaVento.push({ mesh: copas, intensidade: 0.05, matrizesOriginais: clonarMatrizes(copas) });
}

// Tipo 2: árvore frondosa larga — tronco grosso curto + copa esférica achatada (30%)
function criarArvoresLargas() {
  var total = 120;
  var troncoGeo = new THREE.CylinderGeometry(0.5, 0.65, 2.8, 7);
  troncoGeo.translate(0, 1.4, 0);
  var copaGeo = new THREE.IcosahedronGeometry(2.5, 0);
  copaGeo.scale(1.2, 0.85, 1.2);
  copaGeo.translate(0, 4.5, 0);

  var troncoMat = new THREE.MeshLambertMaterial({
    color: 0x7a5230, map: texturaCasca()
  });
  var copaMat = new THREE.MeshLambertMaterial({
    color: 0x7a9a4a, map: texturaFolhagem(), flatShading: true
  });

  var troncos = new THREE.InstancedMesh(troncoGeo, troncoMat, total);
  var copas = new THREE.InstancedMesh(copaGeo, copaMat, total);
  troncos.castShadow = true;
  copas.castShadow = true;

  preencherArvores(troncos, copas, total, 0.85, 2, 5.5);
  cena.add(troncos);
  cena.add(copas);
  copasParaVento.push({ mesh: copas, intensidade: 0.04, matrizesOriginais: clonarMatrizes(copas) });
}

// Tipo 3: palmeira — tronco fino alto + tufo de folhas (30%)
function criarPalmeiras() {
  var total = 120;
  var troncoGeo = new THREE.CylinderGeometry(0.22, 0.32, 6.5, 6);
  troncoGeo.translate(0, 3.25, 0);
  // Folhas: icosaedro achatado verde-claro (estilo coqueiro estilizado)
  var folhasGeo = new THREE.IcosahedronGeometry(1.6, 0);
  folhasGeo.scale(1.5, 0.4, 1.5);
  folhasGeo.translate(0, 6.7, 0);

  var troncoMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2a });
  var folhasMat = new THREE.MeshLambertMaterial({ color: 0x4a7a32, flatShading: true });

  var troncos = new THREE.InstancedMesh(troncoGeo, troncoMat, total);
  var folhas = new THREE.InstancedMesh(folhasGeo, folhasMat, total);
  troncos.castShadow = true;
  folhas.castShadow = true;

  preencherArvores(troncos, folhas, total, 0.45, 2, 6);
  cena.add(troncos);
  cena.add(folhas);
  copasParaVento.push({ mesh: folhas, intensidade: 0.07, matrizesOriginais: clonarMatrizes(folhas) });
}

// Clona as matrizes de instancia atuais (chamado apos preencherArvores) — pro vento
function clonarMatrizes(meshInstanced) {
  var copia = new Float32Array(meshInstanced.instanceMatrix.array.length);
  copia.set(meshInstanced.instanceMatrix.array);
  return copia;
}

// Helper: distribui N árvores pelo mapa, evitando trilha
// Cada arvore guarda refs (troncoMesh, copaMesh, idx) pra remocao na coleta
function preencherArvores(meshA, meshB, total, raioColisao, escMin, distMinTrilha) {
  var dummy = new THREE.Object3D();
  var colocadas = 0;
  var tentativas = 0;

  while (colocadas < total && tentativas < total * 14) {
    tentativas++;
    var x = (Math.random() - 0.5) * 380;
    var z = (Math.random() - 0.5) * 380;

    if (distanciaAteTrilha(x, z) < distMinTrilha) continue;

    var escala = 0.7 + Math.random() * 0.7;
    var rot = Math.random() * Math.PI * 2;

    dummy.position.set(x, 0, z);
    dummy.rotation.y = rot;
    dummy.scale.set(escala, escala, escala);
    dummy.updateMatrix();

    meshA.setMatrixAt(colocadas, dummy.matrix);
    meshB.setMatrixAt(colocadas, dummy.matrix);

    arvoresPos.push({
      x: x, z: z, raio: raioColisao * escala,
      troncoMesh: meshA, copaMesh: meshB, idx: colocadas
    });
    colocadas++;
  }

  meshA.count = colocadas;
  meshB.count = colocadas;
  meshA.instanceMatrix.needsUpdate = true;
  meshB.instanceMatrix.needsUpdate = true;
}

function criarPedras() {
  var total = 140;
  var geo = new THREE.DodecahedronGeometry(0.5);
  var mat = new THREE.MeshLambertMaterial({
    color: 0xa0a0a0, map: texturaPedra(), flatShading: true
  });
  var pedras = new THREE.InstancedMesh(geo, mat, total);
  pedras.castShadow = true;
  pedras.receiveShadow = true;

  var dummy = new THREE.Object3D();
  var colocadas = 0;
  var tentativas = 0;

  while (colocadas < total && tentativas < total * 10) {
    tentativas++;
    var x = (Math.random() - 0.5) * 380;
    var z = (Math.random() - 0.5) * 380;
    if (distanciaAteTrilha(x, z) < 4) continue;

    var escala = 0.5 + Math.random() * 1.3;
    dummy.position.set(x, escala * 0.3, z);
    dummy.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    dummy.scale.set(escala, escala, escala);
    dummy.updateMatrix();

    pedras.setMatrixAt(colocadas, dummy.matrix);
    pedrasPos.push({
      x: x, z: z, raio: 0.6 * escala,
      mesh: pedras, idx: colocadas
    });
    colocadas++;
  }

  pedras.count = colocadas;
  pedras.instanceMatrix.needsUpdate = true;
  cena.add(pedras);
}

function criarSamambaias() {
  var total = 800;
  var geo = new THREE.ConeGeometry(0.45, 0.9, 5);
  var mat = new THREE.MeshLambertMaterial({ color: 0x4a8033 });
  var tufos = new THREE.InstancedMesh(geo, mat, total);

  var dummy = new THREE.Object3D();
  var colocadas = 0;
  var tentativas = 0;

  while (colocadas < total && tentativas < total * 6) {
    tentativas++;
    var x = (Math.random() - 0.5) * 380;
    var z = (Math.random() - 0.5) * 380;
    if (distanciaAteTrilha(x, z) < 3.5) continue;

    var escala = 0.6 + Math.random() * 1.0;
    dummy.position.set(x, escala * 0.4, z);
    dummy.rotation.y = Math.random() * Math.PI * 2;
    dummy.scale.set(escala, escala, escala);
    dummy.updateMatrix();

    tufos.setMatrixAt(colocadas, dummy.matrix);
    colocadas++;
  }

  tufos.count = colocadas;
  tufos.instanceMatrix.needsUpdate = true;
  cena.add(tufos);
}

// Arbustos baixos verde-escuro — preenchem vazios entre árvores
function criarArbustos() {
  var total = 250;
  var geo = new THREE.IcosahedronGeometry(0.5, 0);
  var mat = new THREE.MeshLambertMaterial({ color: 0x2d5a25, flatShading: true });
  var arbustos = new THREE.InstancedMesh(geo, mat, total);
  arbustos.castShadow = true;

  var dummy = new THREE.Object3D();
  var colocadas = 0;
  var tentativas = 0;

  while (colocadas < total && tentativas < total * 6) {
    tentativas++;
    var x = (Math.random() - 0.5) * 380;
    var z = (Math.random() - 0.5) * 380;
    if (distanciaAteTrilha(x, z) < 4) continue;

    var escala = 0.5 + Math.random() * 0.9;
    dummy.position.set(x, escala * 0.35, z);
    dummy.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    dummy.scale.set(escala, escala * 0.7, escala);
    dummy.updateMatrix();

    arbustos.setMatrixAt(colocadas, dummy.matrix);
    colocadas++;
  }

  arbustos.count = colocadas;
  arbustos.instanceMatrix.needsUpdate = true;
  cena.add(arbustos);
}

// Manchas de chao: musgo verde-claro e folhas marrom-amarelas espalhadas
function criarManchasChao() {
  var geoCirc = new THREE.CircleGeometry(1, 8);
  geoCirc.rotateX(-Math.PI / 2); // deita horizontal

  // Manchas de musgo claro
  var musgoMat = new THREE.MeshLambertMaterial({ color: 0x6a9c4a });
  var musgo = new THREE.InstancedMesh(geoCirc, musgoMat, 180);
  musgo.receiveShadow = true;
  preencherManchas(musgo, 180, 0.05, 1.5, 3.5);
  cena.add(musgo);

  // Manchas de folhas secas marrons
  var folhasMat = new THREE.MeshLambertMaterial({ color: 0x7a5a32 });
  var folhas = new THREE.InstancedMesh(geoCirc, folhasMat, 130);
  folhas.receiveShadow = true;
  preencherManchas(folhas, 130, 0.06, 1.2, 2.8);
  cena.add(folhas);
}

function preencherManchas(mesh, total, alturaY, escMin, escMax) {
  var dummy = new THREE.Object3D();
  for (var i = 0; i < total; i++) {
    var x = (Math.random() - 0.5) * 390;
    var z = (Math.random() - 0.5) * 390;
    var esc = escMin + Math.random() * (escMax - escMin);
    dummy.position.set(x, alturaY, z);
    dummy.rotation.y = Math.random() * Math.PI * 2;
    dummy.scale.set(esc, 1, esc);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.count = total;
  mesh.instanceMatrix.needsUpdate = true;
}
