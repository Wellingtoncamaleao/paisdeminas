// Carrega modelos 3D da vegetacao (Quaternius Stylized Nature MegaKit, CC0)
// Usa GLTFLoader pra carregar todos em paralelo no boot e expoe factory
// criarInstancedDeModelo(id, n) que retorna array de InstancedMesh (1 por
// sub-mesh: tronco + folhas) com a transform local do GLTF preservada.
//
// Cada InstancedMesh recebe `matrixBase` (transform absoluto do sub-mesh
// dentro do GLTF) — quando posicionar uma instancia, multiplicar a matriz
// do dummy pelo matrixBase pra preservar offset entre tronco/folhas.

window.modelosVegetacao = {};

var LISTA_VEGETACAO = [
  'CommonTree_1', 'CommonTree_3', 'CommonTree_5',
  'TwistedTree_1', 'TwistedTree_3',
  'Pine_2', 'Pine_4',
  'DeadTree_1',
  'Bush_Common', 'Bush_Common_Flowers',
  'Fern_1',
  'Grass_Common_Tall', 'Grass_Wispy_Tall',
  'Rock_Medium_1', 'Rock_Medium_2', 'Rock_Medium_3',
  'Pebble_Round_1', 'Pebble_Round_3',
  // Adicoes do Ultimate Stylized Nature 2022 (variedade extra)
  'BirchTree_1', 'BirchTree_3',
  'MapleTree_1', 'MapleTree_3',
  'Bush_Large_Flowers',
  'Flower_1_Clump'
];

// Altura alvo (em metros do mundo) por modelo. Pack Quaternius vem em escalas
// muito inconsistentes (CommonTree=7m, TwistedTree=17m). Normalizamos no boot
// pra todas terem altura visualmente coerente entre si.
var ALTURA_ALVO = {
  CommonTree_1: 6, CommonTree_3: 6, CommonTree_5: 6,
  TwistedTree_1: 7, TwistedTree_3: 7,
  Pine_2: 7, Pine_4: 7,
  DeadTree_1: 5,
  Bush_Common: 0.7, Bush_Common_Flowers: 0.7,
  Fern_1: 0.6,
  Grass_Common_Tall: 0.5, Grass_Wispy_Tall: 0.5,
  Rock_Medium_1: 0.9, Rock_Medium_2: 0.9, Rock_Medium_3: 0.9,
  Pebble_Round_1: 0.4, Pebble_Round_3: 0.4,
  BirchTree_1: 7, BirchTree_3: 7,
  MapleTree_1: 6.5, MapleTree_3: 6.5,
  Bush_Large_Flowers: 1.2,
  Flower_1_Clump: 0.4
};

// Fator de escala calculado por modelo no boot (alturaAlvo / alturaReal)
window.escalaModelos = {};

function carregarModelosVegetacao() {
  if (Object.keys(window.modelosVegetacao).length > 0) return Promise.resolve();
  if (!window.GLTFLoader) {
    return new Promise(function(resolve, reject) {
      window.addEventListener('threeReady', function() {
        carregarModelosVegetacao().then(resolve).catch(reject);
      }, { once: true });
    });
  }
  var loader = new window.GLTFLoader();
  var promises = LISTA_VEGETACAO.map(function(id) {
    return new Promise(function(resolve, reject) {
      loader.load(
        'assets/vegetacao/' + id + '.gltf',
        function(gltf) {
          window.modelosVegetacao[id] = gltf;
          // Calcula fator de normalizacao baseado na altura alvo
          gltf.scene.updateMatrixWorld(true);
          var box = new THREE.Box3().setFromObject(gltf.scene);
          var altura = box.max.y - box.min.y;
          var alturaAlvo = ALTURA_ALVO[id] || 5;
          window.escalaModelos[id] = altura > 0.001 ? (alturaAlvo / altura) : 1;
          resolve();
        },
        undefined,
        function(err) {
          console.error('Erro carregando ' + id, err);
          reject(err);
        }
      );
    });
  });
  return Promise.all(promises);
}

// Paleta tropical brasileira — override de cores Quaternius (que vem outono)
function corPaletaPorMaterial(nome) {
  if (!nome) return null;
  if (/Leaf_Pine|Leaves_Pine/i.test(nome)) return 0x3a6a30;     // pinheiro verde escuro
  if (/Leaves_TwistedTree/i.test(nome))    return 0x5a8030;     // verde-amarelo
  if (/Leaves_BirchTree|Leaves_MapleTree/i.test(nome)) return 0x6a8a3a; // verde-amarelo brilhante
  if (/Bark_BirchTree/i.test(nome))        return 0xd0c8b8;     // birch tem tronco branco-bege
  if (/Bark_MapleTree/i.test(nome))        return 0x6a4a26;     // marrom escuro
  if (/Leaves_NormalTree|Leaves/i.test(nome)) return 0x4a8033;  // verde tropical medio
  if (/Bark_DeadTree/i.test(nome))         return 0x6a5040;     // morta cinza-bege
  if (/Bark_TwistedTree/i.test(nome))      return 0x6a4a26;     // marrom escuro
  if (/Bark|Tree|Trunk/i.test(nome))       return 0x7a5230;     // marrom comum
  if (/Rocks?/i.test(nome))                return 0x9a9a96;     // cinza pedra
  if (/Grass/i.test(nome))                 return 0x6a9a3a;     // verde grass claro
  if (/Bush/i.test(nome))                  return 0x4a7028;     // verde bush
  if (/Fern/i.test(nome))                  return 0x4a8030;     // verde fern
  if (/Mushroom/i.test(nome))              return null;         // mantem cor original
  return null;
}

// Extrai sub-meshes do GLTF com geometry + material + matrix absoluta no root.
// Material clonado e tintado pra paleta tropical brasileira.
function extrairSubmeshes(gltf) {
  var subs = [];
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(function(o) {
    if (o.isMesh && o.material) {
      var matOrig = Array.isArray(o.material) ? o.material[0] : o.material;
      var nome = matOrig.name || '';
      var matNovo = matOrig.clone();
      if (matNovo.map) matNovo.map.colorSpace = THREE.SRGBColorSpace;
      var corPaleta = corPaletaPorMaterial(nome);
      if (corPaleta !== null) {
        matNovo.color.setHex(corPaleta);
      }
      // Garante que nao fica brilhoso/metalico
      if ('roughness' in matNovo) matNovo.roughness = 0.95;
      if ('metalness' in matNovo) matNovo.metalness = 0.0;
      // Desliga transparencia (folhas Quaternius vem com alphaMap que renderiza
      // preto quando o blending nao bate). Pra estilo cartoon basta opacidade total.
      matNovo.transparent = false;
      matNovo.alphaTest = 0.5;
      matNovo.alphaMap = null;
      matNovo.depthWrite = true;
      matNovo.side = THREE.FrontSide;
      // Boost emissive sutil pra folhas/troncos nao ficarem pretos em sombra
      if (matNovo.emissive && corPaleta !== null) {
        matNovo.emissive.setHex(corPaleta);
        matNovo.emissiveIntensity = 0.18;
      }
      subs.push({
        geometry: o.geometry,
        material: matNovo,
        matrixBase: o.matrixWorld.clone()
      });
    }
  });
  return subs;
}

// Cria array de InstancedMesh pro modelo (1 por sub-mesh). Cada inst recebe
// userData.matrixBase ja com fator de normalizacao incorporado.
function criarInstancedDeModelo(modeloId, total) {
  var gltf = window.modelosVegetacao[modeloId];
  if (!gltf) {
    console.warn('modelo nao carregado:', modeloId);
    return [];
  }
  var fator = window.escalaModelos[modeloId] || 1;
  var matNorm = new THREE.Matrix4().makeScale(fator, fator, fator);
  var subs = extrairSubmeshes(gltf);
  return subs.map(function(sub) {
    var inst = new THREE.InstancedMesh(sub.geometry, sub.material, total);
    inst.castShadow = true;
    inst.receiveShadow = true;
    inst.count = 0;
    // matrixBase = normalizacao(altura alvo) × transform local do sub-mesh
    inst.userData.matrixBase = matNorm.clone().multiply(sub.matrixBase);
    return inst;
  });
}

// Posiciona instancia: combina dummy.matrix com matrixBase do sub-mesh.
// Aplica em todos InstancedMesh do array (mantem tronco e folhas alinhados).
function posicionarInstancia(insts, idx, dummy) {
  for (var i = 0; i < insts.length; i++) {
    var matFinal = dummy.matrix.clone().multiply(insts[i].userData.matrixBase);
    insts[i].setMatrixAt(idx, matFinal);
  }
}

function finalizarInstanced(insts, count) {
  for (var i = 0; i < insts.length; i++) {
    insts[i].count = count;
    insts[i].instanceMatrix.needsUpdate = true;
  }
}
