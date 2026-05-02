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

// Cria nova instancia do colono — clona scene + skeleton, cria mixer/actions.
// corCamisa diferencia visualmente players: substitui MeshPhysicalMaterial PBR
// por MeshLambertMaterial mantendo a texture (mapa de cor) original mas
// aplicando color tint. MeshPhysicalMaterial.color tem efeito quase nulo com
// PBR completo; Lambert respeita color * map. Tint afeta o avatar inteiro
// (chapeu, camisa, calca) com mesma vibe colorida — bom pra distinguir players.
function criarColonoComAnimacao(corCamisa) {
  if (!window.modeloColonoGLB) throw new Error('Modelo nao carregado');
  var grupo = new THREE.Group();
  var skinned = window.cloneSkeleton(window.modeloColonoGLB.scene);
  skinned.position.y = 0;

  var corHex = (typeof corCamisa === 'number') ? corCamisa : 0x7a4a26;
  var corPlayer = new THREE.Color(corHex);

  skinned.traverse(function(o) {
    if (o.isMesh) {
      o.castShadow = true;
      o.frustumCulled = false; // evita sumir em poses extremas
      if (o.material) {
        var origs = Array.isArray(o.material) ? o.material : [o.material];
        var lamberts = origs.map(function(m) {
          var mat = new THREE.MeshLambertMaterial({
            map: m.map || null,
            color: corPlayer.clone(),
            skinning: true
          });
          return mat;
        });
        o.material = lamberts.length === 1 ? lamberts[0] : lamberts;
      }
    }
  });
  grupo.add(skinned);

  var mixer = new THREE.AnimationMixer(skinned);
  var actions = {};
  window.modeloColonoGLB.animations.forEach(function(clip) {
    actions[clip.name] = mixer.clipAction(clip);
  });
  // Idle inicia tocando — usa MAPA_ANIMS pra cobrir nomes Meshy/Three.js
  var nomeIdle = escolherClip(actions, 'idle') || Object.keys(actions)[0];
  if (nomeIdle) actions[nomeIdle].play();

  grupo.userData = {
    mixer: mixer,
    actions: actions,
    estadoAnim: nomeIdle
  };
  return grupo;
}

// Mapping de estados do jogo pra nomes de clip do GLB.
// Cobre nomes do Meshy (Walking/Running/Long_Breathe_and_Look_Around),
// Soldier de threejs.org (Walk/Run/Idle) e variacoes minusculas.
var MAPA_ANIMS = {
  idle: ['Idle', 'idle', 'Long_Breathe_and_Look_Around', 'Breathing', 'breathe', 'Idle_Loop'],
  walk: ['Walk', 'walk', 'Walking', 'walking', 'Walk_Loop'],
  run:  ['Run',  'run',  'Running', 'running', 'Run_Loop']
};

function escolherClip(actions, estado) {
  var nomes = MAPA_ANIMS[estado] || [];
  for (var i = 0; i < nomes.length; i++) {
    if (actions[nomes[i]]) return nomes[i];
  }
  return null;
}

// Cinematica: faz crossfade entre Idle/Walk/Run conforme estado
function animarColonoGLB(grupo, estado) {
  var u = grupo.userData;
  if (!u || !u.mixer) return;
  u.mixer.update(estado.delta || 0);

  var alvoLogico;
  if (estado.andando) alvoLogico = estado.correndo ? 'run' : 'walk';
  else alvoLogico = 'idle';

  var alvoNome = escolherClip(u.actions, alvoLogico);
  if (!alvoNome) return;
  if (u.estadoAnim === alvoNome) return;

  var anterior = u.estadoAnim ? u.actions[u.estadoAnim] : null;
  var proxima = u.actions[alvoNome];
  if (anterior) anterior.fadeOut(0.18);
  proxima.reset().fadeIn(0.18).play();
  u.estadoAnim = alvoNome;
}
