// Carrega animais animados (Quaternius Ultimate Animated Animals, CC0).
// Cada animal tem ~13 anims embutidas. Usamos: Idle, Walk.
// Distribui ~12 animais pelo mapa com IA simples (vagueia em pequenos circulos).

window.modelosAnimais = {};
window.animaisInstancias = []; // [{ grupo, mixer, actions, estado, alvoX, alvoZ, fase }]

var LISTA_ANIMAIS = ['Cow', 'Horse', 'Deer', 'Fox'];

var ALTURA_ANIMAL = {
  Cow: 1.4, Horse: 1.7, Deer: 1.5, Fox: 0.6
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
  var modelos = LISTA_ANIMAIS;
  var tentativas = 0;
  while (window.animaisInstancias.length < 12 && tentativas < 200) {
    tentativas++;
    var x = (Math.random() - 0.5) * 320;
    var z = (Math.random() - 0.5) * 320;
    if (typeof distanciaAteTrilha === 'function' && distanciaAteTrilha(x, z) < 6) continue;
    if (typeof distanciaAteRio === 'function' && distanciaAteRio(x, z) < 8) continue;

    var modId = modelos[Math.floor(Math.random() * modelos.length)];
    var inst = criarInstanciaAnimal(modId);
    if (!inst) continue;
    inst.grupo.position.set(x, 0, z);
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
function atualizarAnimais(delta) {
  for (var i = 0; i < window.animaisInstancias.length; i++) {
    var a = window.animaisInstancias[i];
    if (!a.mixer) continue;
    a.mixer.update(delta);

    if (a.estadoAnim === 'Idle') {
      a.tempoIdle += delta;
      if (a.tempoIdle > 3 + Math.random() * 3) {
        // Escolhe novo alvo proximo (3-5m em direcao aleatoria)
        var ang = Math.random() * Math.PI * 2;
        var dist = 3 + Math.random() * 4;
        a.alvoX = a.grupo.position.x + Math.cos(ang) * dist;
        a.alvoZ = a.grupo.position.z + Math.sin(ang) * dist;
        // Limite area
        a.alvoX = Math.max(-180, Math.min(180, a.alvoX));
        a.alvoZ = Math.max(-180, Math.min(180, a.alvoZ));
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
