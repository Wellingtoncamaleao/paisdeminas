// Carrega modelos GLB do Pirate Kit (CC0) usados pra ambientacao aquatica:
// docks (pontes), cliffs (penhascos), palmeiras, barcos, props (barril, bau).
// GLTF embedded (1 arquivo cada, 50KB-1MB).

window.modelosPirate = {};

var LISTA_PIRATE = [
  'Environment_Dock', 'Environment_Dock_Broken', 'Environment_Dock_Pole',
  'Environment_Cliff1', 'Environment_Cliff2', 'Environment_Cliff3',
  'Environment_PalmTree_1', 'Environment_PalmTree_2', 'Environment_PalmTree_3',
  'Ship_Small',
  'Prop_Barrel', 'Prop_Chest_Closed', 'Prop_Bucket', 'Prop_Anchor'
];

// Altura alvo pra normalizacao de escala (Pirate Kit vem em escalas variadas)
var ALTURA_PIRATE = {
  Environment_Dock: 0.4,
  Environment_Dock_Broken: 0.4,
  Environment_Dock_Pole: 1.5,
  Environment_Cliff1: 7,
  Environment_Cliff2: 8,
  Environment_Cliff3: 6,
  Environment_PalmTree_1: 8,
  Environment_PalmTree_2: 9,
  Environment_PalmTree_3: 7,
  Ship_Small: 3.5,
  Prop_Barrel: 1.0,
  Prop_Chest_Closed: 0.8,
  Prop_Bucket: 0.5,
  Prop_Anchor: 1.0
};

window.escalaPirate = {};

function carregarModelosPirate() {
  if (Object.keys(window.modelosPirate).length > 0) return Promise.resolve();
  if (!window.GLTFLoader) {
    return new Promise(function(resolve, reject) {
      window.addEventListener('threeReady', function() {
        carregarModelosPirate().then(resolve).catch(reject);
      }, { once: true });
    });
  }
  var loader = new window.GLTFLoader();
  var promises = LISTA_PIRATE.map(function(id) {
    return new Promise(function(resolve, reject) {
      loader.load(
        'assets/aquatico/' + id + '.gltf',
        function(gltf) {
          window.modelosPirate[id] = gltf;
          gltf.scene.updateMatrixWorld(true);
          var box = new THREE.Box3().setFromObject(gltf.scene);
          var altura = box.max.y - box.min.y;
          var alvo = ALTURA_PIRATE[id] || 2;
          window.escalaPirate[id] = altura > 0.001 ? (alvo / altura) : 1;
          resolve();
        },
        undefined,
        function(err) {
          console.error('Erro carregando pirate ' + id, err);
          reject(err);
        }
      );
    });
  });
  return Promise.all(promises);
}

// Clona modelo, normaliza escala e prepara material (mesmo padrao vegetacao3d).
function criarInstanciaPirate(modeloId) {
  var gltf = window.modelosPirate[modeloId];
  if (!gltf) {
    console.warn('pirate nao carregado:', modeloId);
    return new THREE.Group();
  }
  var fator = window.escalaPirate[modeloId] || 1;
  var grupo = gltf.scene.clone(true);
  grupo.scale.setScalar(fator);

  grupo.traverse(function(o) {
    if (o.isMesh && o.material) {
      o.castShadow = true;
      o.receiveShadow = true;
      var mats = Array.isArray(o.material) ? o.material : [o.material];
      var clonados = mats.map(function(m) {
        var c = m.clone();
        if (c.map) c.map.colorSpace = THREE.SRGBColorSpace;
        c.transparent = false;
        c.alphaTest = 0.5;
        c.side = THREE.FrontSide;
        if ('roughness' in c) c.roughness = 0.85;
        if ('metalness' in c) c.metalness = 0.0;
        return c;
      });
      o.material = clonados.length === 1 ? clonados[0] : clonados;
    }
  });

  return grupo;
}

// Cria ponte sobre o rio no cruzamento real com a trilha.
// Varre pontos da trilha procurando o que tem menor distancia ao rio
// e usa esse ponto pra ancorar a ponte (auto-ajusta a qualquer mudanca
// de coords da trilha/rio — antes era hardcoded em (30,20) da escala antiga).
function colocarPontePirate() {
  if (!window.rioSpline || typeof trilhaSpline === 'undefined' || !trilhaSpline) return;

  // Acha t da trilha onde a distancia ao rio e minima
  var menorDist2 = Infinity;
  var melhorT = 0;
  for (var i = 0; i <= 200; i++) {
    var t = i / 200;
    var pt = trilhaSpline.getPoint(t);
    var d = distanciaAteRio(pt.x, pt.z);
    if (d * d < menorDist2) {
      menorDist2 = d * d;
      melhorT = t;
    }
  }
  var pTrilha = trilhaSpline.getPoint(melhorT);
  var info = pontoRioMaisProx(pTrilha.x, pTrilha.z);
  if (!info) return;
  var p = info.ponto;
  var tan = window.rioSpline.getTangent(info.t);
  // Ponte perpendicular ao rio
  var ponte = criarInstanciaPirate('Environment_Dock');
  ponte.position.set(p.x, 0.0, p.z);
  ponte.rotation.y = Math.atan2(tan.x, tan.z);
  // Escala pra cobrir LARGURA_RIO * 2 com folga
  var escalaCobertura = (LARGURA_RIO * 2.4) / 6.5; // 6.5 era largura quando 2.5x cobria
  ponte.scale.setScalar(window.escalaPirate.Environment_Dock * escalaCobertura);
  cena.add(ponte);
}

// Cria pequena doca em uma margem do rio + barco ancorado
function colocarDocaEbarco() {
  if (!window.rioSpline) return;
  // Doca proxima ao trecho leste do rio (t=0.75)
  var pDoca = window.rioSpline.getPoint(0.78);
  var tan = window.rioSpline.getTangent(0.78);
  var perpX = -tan.z, perpZ = tan.x;

  // Doca extending pra dentro do rio
  var doca = criarInstanciaPirate('Environment_Dock');
  doca.position.set(pDoca.x + perpX * 4, 0.0, pDoca.z + perpZ * 4);
  doca.rotation.y = Math.atan2(perpX, perpZ);
  cena.add(doca);

  // Pole pra amarrar barco
  var pole = criarInstanciaPirate('Environment_Dock_Pole');
  pole.position.set(pDoca.x + perpX * 6, 0.0, pDoca.z + perpZ * 6);
  cena.add(pole);

  // Barco ancorado proximo (do outro lado da doca)
  var barco = criarInstanciaPirate('Ship_Small');
  barco.position.set(pDoca.x - perpX * 1, 0.2, pDoca.z - perpZ * 1);
  barco.rotation.y = Math.atan2(tan.x, tan.z);
  cena.add(barco);

  // Props decorativos perto da doca
  var barril1 = criarInstanciaPirate('Prop_Barrel');
  barril1.position.set(pDoca.x + perpX * 7.5, 0.0, pDoca.z + perpZ * 7.5);
  cena.add(barril1);
  var barril2 = criarInstanciaPirate('Prop_Barrel');
  barril2.position.set(pDoca.x + perpX * 8.5, 0.0, pDoca.z + perpZ * 8.0);
  cena.add(barril2);
  var bau = criarInstanciaPirate('Prop_Chest_Closed');
  bau.position.set(pDoca.x + perpX * 7.5, 0.0, pDoca.z + perpZ * 9);
  bau.rotation.y = Math.atan2(perpX, perpZ);
  cena.add(bau);
}

// Espalha 8-12 palmeiras ao longo das margens do rio
function colocarPalmeirasMargem() {
  if (!window.rioSpline) return;
  var modelos = ['Environment_PalmTree_1', 'Environment_PalmTree_2', 'Environment_PalmTree_3'];
  for (var i = 0; i < 12; i++) {
    var t = 0.05 + (i / 12) * 0.9;
    var p = window.rioSpline.getPoint(t);
    var tan = window.rioSpline.getTangent(t);
    var perpX = -tan.z, perpZ = tan.x;
    var lado = (i % 2 === 0) ? 1 : -1;
    var dist = LARGURA_RIO + 1.5 + Math.random() * 2;
    var palm = criarInstanciaPirate(modelos[i % 3]);
    palm.position.set(p.x + perpX * dist * lado, 0, p.z + perpZ * dist * lado);
    palm.rotation.y = Math.random() * Math.PI * 2;
    cena.add(palm);
  }
}

// Cliffs perto das pontas do rio (nascente sudoeste e foz norte)
// Posiciona dinamicamente nos extremos do rio pra acompanhar qualquer
// mudanca de coords (antes estava hardcoded na escala antiga).
function colocarCliffs() {
  if (!window.rioSpline) return;
  var pInicio = window.rioSpline.getPoint(0.02);
  var pFim = window.rioSpline.getPoint(0.98);

  var c1 = criarInstanciaPirate('Environment_Cliff1');
  c1.position.set(pInicio.x - 8, 0, pInicio.z + 4);
  c1.rotation.y = Math.PI * 0.3;
  cena.add(c1);

  var c2 = criarInstanciaPirate('Environment_Cliff2');
  c2.position.set(pFim.x + 8, 0, pFim.z + 4);
  c2.rotation.y = -Math.PI * 0.4;
  cena.add(c2);
}
