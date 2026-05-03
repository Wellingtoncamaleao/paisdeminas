// Carrega animais animados (Quaternius Ultimate Animated Animals, CC0).
// Cada animal tem ~13 anims embutidas. Usamos: Idle, Walk.
// Distribui ~12 animais pelo mapa com IA simples (vagueia em pequenos circulos).

window.modelosAnimais = {};
window.animaisInstancias = []; // [{ grupo, mixer, actions, estado, alvoX, alvoZ, fase }]

// 7 animais — modelos Quaternius mapeados pra fauna brasileira:
// Cow=Vaca, Horse=Cavalo, Deer=Cervo, Fox=Lobo Guara, Bull=Boi,
// Stag=Veado-Galheiro, Donkey=Burro Tropeiro
var LISTA_ANIMAIS = ['Cow', 'Horse', 'Deer', 'Fox', 'Bull', 'Stag', 'Donkey'];

var ALTURA_ANIMAL = {
  Cow: 1.4, Horse: 1.7, Deer: 1.5, Fox: 0.6,
  Bull: 1.6, Stag: 1.7, Donkey: 1.4
};

// Pesos de spawn — mais bois/vacas (gado de fazenda) e cervos (mata),
// menos lobos (raros). Soma normalizada na funcao de sorteio.
var PESO_ANIMAL = {
  Cow: 3, Bull: 2, Horse: 1.5, Donkey: 1.5,
  Deer: 2.5, Stag: 1.5, Fox: 0.8
};

window.escalaAnimais = {};

function carregarModelosAnimais() {
  if (Object.keys(window.modelosAnimais).length > 0) return Promise.resolve();
  if (!window.GLTFLoader) {
    return new Promise(function(resolve, reject) {
      window.addEventListener('threeReady', function() {
        carregarModelosAnimais().then(resolve).catch(reject);
      }, { once: true });
    });
  }
  var loader = new window.GLTFLoader();
  var promises = LISTA_ANIMAIS.map(function(id) {
    return new Promise(function(resolve, reject) {
      loader.load(
        'assets/animais/' + id + '.gltf',
        function(gltf) {
          window.modelosAnimais[id] = gltf;
          gltf.scene.updateMatrixWorld(true);
          var box = new THREE.Box3().setFromObject(gltf.scene);
          var altura = box.max.y - box.min.y;
          var alvo = ALTURA_ANIMAL[id] || 1;
          window.escalaAnimais[id] = altura > 0.001 ? (alvo / altura) : 1;
          resolve();
        },
        undefined,
        function(err) { console.error('Erro animal ' + id, err); reject(err); }
      );
    });
  });
  return Promise.all(promises);
}

// Cria 1 instancia animada do animal — clona scene+skeleton, mixer + actions
function criarInstanciaAnimal(modeloId) {
  var gltf = window.modelosAnimais[modeloId];
  if (!gltf) return null;
  var fator = window.escalaAnimais[modeloId] || 1;
  var skinned = window.cloneSkeleton(gltf.scene);
  skinned.scale.setScalar(fator);
  skinned.traverse(function(o) {
    if (o.isMesh && o.material) {
      o.castShadow = true;
      o.frustumCulled = false;
      var mats = Array.isArray(o.material) ? o.material : [o.material];
      var clonados = mats.map(function(m) {
        var c = m.clone();
        if (c.map) c.map.colorSpace = THREE.SRGBColorSpace;
        c.transparent = false;
        if ('roughness' in c) c.roughness = 0.85;
        if ('metalness' in c) c.metalness = 0.0;
        return c;
      });
      o.material = clonados.length === 1 ? clonados[0] : clonados;
    }
  });

  var mixer = new THREE.AnimationMixer(skinned);
  var actions = {};
  gltf.animations.forEach(function(clip) {
    actions[clip.name] = mixer.clipAction(clip);
  });
  if (actions.Idle) actions.Idle.play();

  return { grupo: skinned, mixer: mixer, actions: actions, estadoAnim: 'Idle' };
}

// Spawna ~12 animais aleatoriamente pelo mapa, longe da trilha e rio
function spawnarAnimais() {
  // Sorteio ponderado por peso: gado/cervo mais comum, lobo raro
  var pesos = LISTA_ANIMAIS.map(function(m) { return PESO_ANIMAL[m] || 1; });
  var pesoTotal = pesos.reduce(function(a, b) { return a + b; }, 0);
  function sortearModelo() {
    var r = Math.random() * pesoTotal;
    var acc = 0;
    for (var i = 0; i < LISTA_ANIMAIS.length; i++) {
      acc += pesos[i];
      if (r < acc) return LISTA_ANIMAIS[i];
    }
    return LISTA_ANIMAIS[0];
  }

  var tentativas = 0;
  while (window.animaisInstancias.length < 22 && tentativas < 300) {
    tentativas++;
    // Sorteia ponto dentro da silhueta de MG (Fase A) — fallback range antigo
    var x, z;
    if (typeof sortearPontoNoEstado === 'function') {
      var pos = sortearPontoNoEstado(15);
      if (!pos) continue;
      x = pos.x; z = pos.z;
    } else {
      x = (Math.random() - 0.5) * 320;
      z = (Math.random() - 0.5) * 320;
    }
    if (typeof distanciaAteTrilha === 'function' && distanciaAteTrilha(x, z) < 6) continue;
    if (typeof distanciaAteRio === 'function' && distanciaAteRio(x, z) < 8) continue;

    var modId = sortearModelo();
    var inst = criarInstanciaAnimal(modId);
    if (!inst) continue;
    var yChao = (typeof alturaEm === 'function') ? alturaEm(x, z) : 0;
    inst.grupo.position.set(x, yChao, z);
    inst.grupo.rotation.y = Math.random() * Math.PI * 2;
    inst.tipoAnimal = modId;
    inst.alvoX = x;
    inst.alvoZ = z;
    inst.fase = Math.random() * 10;
    inst.tempoIdle = 0;
    inst.tempoWalk = 0;
    cena.add(inst.grupo);
    window.animaisInstancias.push(inst);
  }
}

// Atualiza animais — IA simples: alterna Idle (3-6s) com Walk pra ponto random proximo (3-5m)
// PERF: pausa mixer.update + anim de animais > 60m do player (skinning eh caro).
// Animais distantes ficam congelados em pose mas continuam visiveis.
var DIST_ANIMAL_LOD2 = 60 * 60; // ao quadrado pra evitar sqrt
function atualizarAnimais(delta) {
  var px = (typeof personagem !== 'undefined' && personagem) ? personagem.position.x : 0;
  var pz = (typeof personagem !== 'undefined' && personagem) ? personagem.position.z : 0;
  for (var i = 0; i < window.animaisInstancias.length; i++) {
    var a = window.animaisInstancias[i];
    if (!a.mixer) continue;
    var dxP = a.grupo.position.x - px;
    var dzP = a.grupo.position.z - pz;
    var dist2 = dxP * dxP + dzP * dzP;
    // Se muito longe, pula update completo (sem skinning, sem IA, sem movimento)
    if (dist2 > DIST_ANIMAL_LOD2) continue;
    a.mixer.update(delta);

    if (a.estadoAnim === 'Idle') {
      a.tempoIdle += delta;
      if (a.tempoIdle > 3 + Math.random() * 3) {
        // Escolhe novo alvo proximo (3-5m em direcao aleatoria)
        var ang = Math.random() * Math.PI * 2;
        var dist = 3 + Math.random() * 4;
        a.alvoX = a.grupo.position.x + Math.cos(ang) * dist;
        a.alvoZ = a.grupo.position.z + Math.sin(ang) * dist;
        // Limite area: silhueta de MG (Fase A). Fallback +/- 180.
        if (typeof dentroDoEstado === 'function' && !dentroDoEstado(a.alvoX, a.alvoZ)) {
          // Tenta no centro pra "voltar" se foi pra fora
          a.alvoX = a.grupo.position.x;
          a.alvoZ = a.grupo.position.z;
        } else if (typeof MG_BOUNDS === 'undefined') {
          a.alvoX = Math.max(-180, Math.min(180, a.alvoX));
          a.alvoZ = Math.max(-180, Math.min(180, a.alvoZ));
        }
        a.tempoIdle = 0;
        a.tempoWalk = 0;
        trocarAnimAnimal(a, 'Walk');
        a.estadoAnim = 'Walk';
      }
    } else if (a.estadoAnim === 'Walk') {
      var dx = a.alvoX - a.grupo.position.x;
      var dz = a.alvoZ - a.grupo.position.z;
      var d = Math.sqrt(dx * dx + dz * dz);
      a.tempoWalk += delta;
      if (d < 0.3 || a.tempoWalk > 8) {
        trocarAnimAnimal(a, 'Idle');
        a.estadoAnim = 'Idle';
      } else {
        var velocidade = 1.3; // m/s
        var dirX = dx / d, dirZ = dz / d;
        a.grupo.position.x += dirX * velocidade * delta;
        a.grupo.position.z += dirZ * velocidade * delta;
        // Anda no relevo: Y do animal acompanha terreno (Fase B)
        if (typeof alturaEm === 'function') {
          a.grupo.position.y = alturaEm(a.grupo.position.x, a.grupo.position.z);
        }
        // Rotaciona suave pra direcao do movimento
        var anguloAlvo = Math.atan2(dirX, dirZ);
        var diff = anguloAlvo - a.grupo.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        a.grupo.rotation.y += diff * Math.min(delta * 4, 1);
      }
    }
  }
}

function trocarAnimAnimal(a, alvo) {
  if (!a.actions[alvo] || a.estadoAnim === alvo) return;
  var anterior = a.actions[a.estadoAnim];
  if (anterior) anterior.fadeOut(0.2);
  a.actions[alvo].reset().fadeIn(0.2).play();
}
