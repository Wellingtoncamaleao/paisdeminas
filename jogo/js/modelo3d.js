// Carregamento do modelo .glb humanoide com animacoes embutidas (Idle/Walk/Run)
// Cache global em window.modeloColonoGLB. Carregado uma vez no boot, clonado
// pra cada personagem via SkeletonUtils.clone (preserva skeleton/skinning).
//
// Cada instancia tem seu proprio AnimationMixer + actions. animarColonoGLB
// faz crossfade suave entre Idle/Walk/Run baseado em estado.andando/correndo.

window.modeloColonoGLB = null;

function carregarModeloColono() {
  if (window.modeloColonoGLB) return Promise.resolve(window.modeloColonoGLB);
  if (!window.GLTFLoader) {
    return new Promise(function(resolve, reject) {
      window.addEventListener('threeReady', function() {
        carregarModeloColono().then(resolve).catch(reject);
      }, { once: true });
    });
  }
  return new Promise(function(resolve, reject) {
    new window.GLTFLoader().load(
      'assets/modelos/colono.glb',
      function(gltf) {
        window.modeloColonoGLB = gltf;
        resolve(gltf);
      },
      undefined,
      function(err) { reject(err); }
    );
  });
}

// Cria nova instancia do colono — clona scene + skeleton, cria mixer/actions
function criarColonoComAnimacao(corCamisa) {
  if (!window.modeloColonoGLB) throw new Error('Modelo nao carregado');
  var grupo = new THREE.Group();
  var skinned = window.cloneSkeleton(window.modeloColonoGLB.scene);
  // Soldier.glb tem altura ~1.7m, escala default ja boa pro jogo
  skinned.position.y = 0;
  skinned.traverse(function(o) {
    if (o.isMesh) {
      o.castShadow = true;
      o.frustumCulled = false; // evita sumir em poses extremas
    }
  });
  grupo.add(skinned);

  var mixer = new THREE.AnimationMixer(skinned);
  var actions = {};
  window.modeloColonoGLB.animations.forEach(function(clip) {
    actions[clip.name] = mixer.clipAction(clip);
  });
  // Idle inicia tocando
  var idle = actions['Idle'] || actions['idle'] || Object.values(actions)[0];
  if (idle) idle.play();

  grupo.userData = {
    mixer: mixer,
    actions: actions,
    estadoAnim: idle ? Object.keys(actions).find(function(k){return actions[k]===idle;}) : null
  };
  return grupo;
}

// Cinematica: faz crossfade entre Idle/Walk/Run conforme estado
function animarColonoGLB(grupo, estado) {
  var u = grupo.userData;
  if (!u || !u.mixer) return;
  u.mixer.update(estado.delta || 0);

  var alvo;
  if (estado.andando) alvo = estado.correndo ? 'Run' : 'Walk';
  else alvo = 'Idle';

  // Fallback se modelo tiver nomes diferentes
  if (!u.actions[alvo]) {
    var alts = { Run: 'run', Walk: 'walk', Idle: 'idle' };
    alvo = alts[alvo] || Object.keys(u.actions)[0];
  }
  if (u.estadoAnim === alvo || !u.actions[alvo]) return;

  var anterior = u.estadoAnim ? u.actions[u.estadoAnim] : null;
  var proxima = u.actions[alvo];
  if (anterior) anterior.fadeOut(0.18);
  proxima.reset().fadeIn(0.18).play();
  u.estadoAnim = alvo;
}
