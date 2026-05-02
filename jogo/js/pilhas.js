// Pilhas de recursos visiveis dentro do terreno cercado
// Cada item visual = N unidades do inventario:
//   - 1 tora = 3 madeira (= 1 coleta de arvore)
//   - 1 pedra visual = 1 pedra coletada
var pilhasGrupo = null;
var MADEIRA_POR_TORA = 3;

function atualizarPilhas() {
  // Limpa grupo anterior se existir
  if (pilhasGrupo) {
    cena.remove(pilhasGrupo);
    pilhasGrupo.traverse(function(obj) {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    pilhasGrupo = null;
  }

  // Sem claim, nao tem onde empilhar
  if (!claimAtual) return;

  pilhasGrupo = new THREE.Group();

  var cx = claimAtual.x;
  var cz = claimAtual.z;

  // Pilha de madeira ao oeste do centro do claim
  var nToras = Math.floor(inventario.madeira / MADEIRA_POR_TORA);
  if (nToras > 0) construirPilhaMadeira(cx - 3, cz, nToras);

  // Pilha de pedra ao leste do centro do claim
  if (inventario.pedra > 0) construirPilhaPedra(cx + 3, cz, inventario.pedra);

  cena.add(pilhasGrupo);
}

function construirPilhaMadeira(cx, cz, nToras) {
  var mat = new THREE.MeshLambertMaterial({ color: 0x7a4a2c });
  var geo = new THREE.CylinderGeometry(0.18, 0.18, 1.6, 7);

  // Empilhar como pilha de lenha: 4 por fileira no chao,
  // depois 3 em cima, 2 em cima, 1 — depois recomeca atras
  var perFileira = 4;
  var alturaTora = 0.36;
  var espacamentoZ = 0.42;
  var nFileirasPorPilha = 4;
  var torasPorPilha = perFileira + (perFileira - 1) + (perFileira - 2) + (perFileira - 3); // 4+3+2+1 = 10

  for (var i = 0; i < nToras; i++) {
    var pilhaIdx = Math.floor(i / torasPorPilha);
    var localIdx = i % torasPorPilha;

    // Descobre em qual fileira (camada vertical) e em qual coluna esta
    var fileira = 0, restante = localIdx;
    while (restante >= (perFileira - fileira)) {
      restante -= (perFileira - fileira);
      fileira++;
    }
    var col = restante;

    // Centro da fileira
    var torasNaFileira = perFileira - fileira;
    var deslocZ = (col - (torasNaFileira - 1) / 2) * espacamentoZ;

    var tora = new THREE.Mesh(geo, mat);
    tora.position.set(
      cx + pilhaIdx * 1.0,           // pilhas extras crescem pra leste
      0.18 + fileira * alturaTora,
      cz + deslocZ
    );
    tora.rotation.z = Math.PI / 2; // deita o cilindro horizontalmente
    tora.castShadow = true;
    tora.receiveShadow = true;
    pilhasGrupo.add(tora);
  }
}

function construirPilhaPedra(cx, cz, nPedras) {
  var mat = new THREE.MeshLambertMaterial({ color: 0x6e6e6e, flatShading: true });
  var geo = new THREE.DodecahedronGeometry(0.35);

  // Cada piramide acomoda ate 16 pedras (7+5+3+1). Acima disso, cria pilhas adjacentes.
  var camadas = [
    { y: 0.20, max: 7, raio: 0.55 },
    { y: 0.55, max: 5, raio: 0.42 },
    { y: 0.85, max: 3, raio: 0.28 },
    { y: 1.10, max: 1, raio: 0 }
  ];
  var pedrasPorPiramide = 16;

  for (var i = 0; i < nPedras; i++) {
    var piramideIdx = Math.floor(i / pedrasPorPiramide);
    var localIdx = i % pedrasPorPiramide;

    // Descobre camada e indice dentro da camada
    var camada = 0, restante = localIdx;
    while (restante >= camadas[camada].max) {
      restante -= camadas[camada].max;
      camada++;
    }
    var c = camadas[camada];
    var nNestaCamada = c.max;
    var ang = nNestaCamada === 1 ? 0 : (restante / nNestaCamada) * Math.PI * 2 + camada * 0.3;
    var px = cx + piramideIdx * 1.8 + Math.cos(ang) * c.raio;
    var pz = cz + Math.sin(ang) * c.raio;

    var pedra = new THREE.Mesh(geo, mat);
    pedra.position.set(px, c.y, pz);
    pedra.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    pedra.scale.setScalar(0.7 + Math.random() * 0.5);
    pedra.castShadow = true;
    pilhasGrupo.add(pedra);
  }
}
