// Pilhas de recursos visiveis dentro do terreno cercado
// 1 tora = 3 madeira (= 1 coleta de arvore). 1 pedra visual = 1 pedra coletada.
// Cada pilha (madeira / pedra) é um Group separado com posição absoluta —
// pode ser movida individualmente (offsets salvos em claim.pilhaXXXOffX/Z).
var pilhaMadeiraGrupo = null;
var pilhaPedraGrupo = null;
var MADEIRA_POR_TORA = 3;

// Offsets default relativos ao centro do claim (se jogador não escolheu manualmente)
var OFFSET_PADRAO_MAD = { x: -3, z: 0 };
var OFFSET_PADRAO_PED = { x:  3, z: 0 };

function atualizarPilhas() {
  // Limpa grupos antigos
  if (pilhaMadeiraGrupo) {
    cena.remove(pilhaMadeiraGrupo);
    descartar(pilhaMadeiraGrupo);
    pilhaMadeiraGrupo = null;
  }
  if (pilhaPedraGrupo) {
    cena.remove(pilhaPedraGrupo);
    descartar(pilhaPedraGrupo);
    pilhaPedraGrupo = null;
  }

  if (!claimAtual) return;

  var cx = claimAtual.x, cz = claimAtual.z;
  var offMad = obterOffsetPilha('madeira');
  var offPed = obterOffsetPilha('pedra');

  var nToras = Math.floor(inventario.madeira / MADEIRA_POR_TORA);
  if (nToras > 0) {
    pilhaMadeiraGrupo = new THREE.Group();
    pilhaMadeiraGrupo.userData.eMovel = true;
    pilhaMadeiraGrupo.userData.tipoPilha = 'madeira';
    construirPilhaMadeira(pilhaMadeiraGrupo, nToras);
    var pmx = cx + offMad.x, pmz = cz + offMad.z;
    pilhaMadeiraGrupo.position.set(pmx, alturaSeguraEm(pmx, pmz), pmz);
    pilhaMadeiraGrupo.rotation.y = claimAtual.pilhaMadRot || 0;
    cena.add(pilhaMadeiraGrupo);
  }

  if (inventario.pedra > 0) {
    pilhaPedraGrupo = new THREE.Group();
    pilhaPedraGrupo.userData.eMovel = true;
    pilhaPedraGrupo.userData.tipoPilha = 'pedra';
    construirPilhaPedra(pilhaPedraGrupo, inventario.pedra);
    var ppx = cx + offPed.x, ppz = cz + offPed.z;
    pilhaPedraGrupo.position.set(ppx, alturaSeguraEm(ppx, ppz), ppz);
    pilhaPedraGrupo.rotation.y = claimAtual.pilhaPedRot || 0;
    cena.add(pilhaPedraGrupo);
  }
}

function obterOffsetPilha(tipo) {
  if (tipo === 'madeira') {
    if (claimAtual.pilhaMadOffX !== null && claimAtual.pilhaMadOffX !== undefined) {
      return { x: claimAtual.pilhaMadOffX, z: claimAtual.pilhaMadOffZ };
    }
    return OFFSET_PADRAO_MAD;
  }
  if (tipo === 'pedra') {
    if (claimAtual.pilhaPedOffX !== null && claimAtual.pilhaPedOffX !== undefined) {
      return { x: claimAtual.pilhaPedOffX, z: claimAtual.pilhaPedOffZ };
    }
    return OFFSET_PADRAO_PED;
  }
  return { x: 0, z: 0 };
}

function descartar(grupo) {
  grupo.traverse(function(obj) {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  });
}

function construirPilhaMadeira(grupo, nToras) {
  var mat = new THREE.MeshLambertMaterial({ color: 0x7a4a2c });
  var geo = new THREE.CylinderGeometry(0.18, 0.18, 1.6, 7);

  var perFileira = 4;
  var alturaTora = 0.36;
  var espacamentoZ = 0.42;
  var torasPorPilha = perFileira + (perFileira - 1) + (perFileira - 2) + (perFileira - 3); // 10

  for (var i = 0; i < nToras; i++) {
    var pilhaIdx = Math.floor(i / torasPorPilha);
    var localIdx = i % torasPorPilha;
    var fileira = 0, restante = localIdx;
    while (restante >= (perFileira - fileira)) {
      restante -= (perFileira - fileira);
      fileira++;
    }
    var col = restante;
    var torasNaFileira = perFileira - fileira;
    var deslocZ = (col - (torasNaFileira - 1) / 2) * espacamentoZ;

    var tora = new THREE.Mesh(geo, mat);
    tora.position.set(
      pilhaIdx * 1.0,
      0.18 + fileira * alturaTora,
      deslocZ
    );
    tora.rotation.z = Math.PI / 2;
    tora.castShadow = true;
    tora.receiveShadow = true;
    grupo.add(tora);
  }
}

function construirPilhaPedra(grupo, nPedras) {
  var mat = new THREE.MeshLambertMaterial({ color: 0x6e6e6e, flatShading: true });
  var geo = new THREE.DodecahedronGeometry(0.35);

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
    var camada = 0, restante = localIdx;
    while (restante >= camadas[camada].max) {
      restante -= camadas[camada].max;
      camada++;
    }
    var c = camadas[camada];
    var nNestaCamada = c.max;
    var ang = nNestaCamada === 1 ? 0 : (restante / nNestaCamada) * Math.PI * 2 + camada * 0.3;
    var px = piramideIdx * 1.8 + Math.cos(ang) * c.raio;
    var pz = Math.sin(ang) * c.raio;

    var pedra = new THREE.Mesh(geo, mat);
    pedra.position.set(px, c.y, pz);
    pedra.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    pedra.scale.setScalar(0.7 + Math.random() * 0.5);
    pedra.castShadow = true;
    grupo.add(pedra);
  }
}
