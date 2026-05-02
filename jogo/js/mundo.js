// Mundo: terreno plano, ceu de amanhecer, neblina, iluminacao
var terrenoMesh;
var ceuGrupo;       // dome + sol + lua + estrelas — segue a camera
var skyMaterial;    // material do shader do dome (uniforms manipulados pelo tempo)
var luzAmbienteGlobal;
var solGlobal;      // DirectionalLight
var solVisualMesh;  // esfera amarela representando o sol
var luaMesh;        // esfera branca-azulada

function iniciarMundo() {
  // Ceu de amanhecer com gradiente (rosa no horizonte, azul-claro no zenite)
  criarCeuGradiente();
  // Neblina mais branda — so esconde os limites longes
  cena.fog = new THREE.Fog(0xe8a872, 70, 260);

  // Terreno — plano grande com textura de grama proceduralmente gerada
  var terrenoGeo = new THREE.PlaneGeometry(420, 420, 1, 1);
  var terrenoMat = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    map: texturaGrama()
  });
  terrenoMesh = new THREE.Mesh(terrenoGeo, terrenoMat);
  terrenoMesh.rotation.x = -Math.PI / 2;
  terrenoMesh.position.y = 0;
  terrenoMesh.receiveShadow = true;
  cena.add(terrenoMesh);

  // Luz ambiente — azul-acinzentada do amanhecer (vinda de cima e do chao verde)
  var luzAmbiente = new THREE.HemisphereLight(0xfff0d4, 0x3d5e2e, 0.5);
  luzAmbienteGlobal = luzAmbiente;
  cena.add(luzAmbiente);

  // Sol — direcional baixo no horizonte, dourado, projetando sombras
  var sol = new THREE.DirectionalLight(0xffd4a3, 1.85);
  solGlobal = sol;
  sol.position.set(80, 60, 50);
  sol.castShadow = true;
  // Frustum da camera de sombra — cobre area razoavel ao redor do jogador
  sol.shadow.camera.left = -45;
  sol.shadow.camera.right = 45;
  sol.shadow.camera.top = 45;
  sol.shadow.camera.bottom = -45;
  sol.shadow.camera.near = 1;
  sol.shadow.camera.far = 180;
  // Sombras maiores pra mais nitidez (1024 → 2048; 4096 e pesado em mobile)
  sol.shadow.mapSize.width = 2048;
  sol.shadow.mapSize.height = 2048;
  sol.shadow.bias = -0.0005;
  cena.add(sol);
  cena.add(sol.target); // necessario pra mover o foco da sombra com o jogador

  // Salvar sol global pra atualizar target no loop
  window.__sol = sol;

  // Esfera visivel representando o sol no ceu — anexada ao grupo do ceu (segue camera)
  var solGeo = new THREE.SphereGeometry(15, 24, 16);
  var solMat = new THREE.MeshBasicMaterial({ color: 0xfff2cc, fog: false });
  var solVisual = new THREE.Mesh(solGeo, solMat);
  solVisualMesh = solVisual;
  solVisual.position.set(220, 90, 140);
  ceuGrupo.add(solVisual);

  // Lua — esfera branca-azulada oposta ao sol, visivel a noite
  var luaGeo = new THREE.SphereGeometry(11, 20, 14);
  var luaMat = new THREE.MeshBasicMaterial({ color: 0xe8e8ff, fog: false });
  luaMesh = new THREE.Mesh(luaGeo, luaMat);
  luaMesh.visible = false;
  ceuGrupo.add(luaMesh);

  // Luz de preenchimento sutil pro outro lado nao ficar preto
  var fill = new THREE.DirectionalLight(0xb8c9d9, 0.3);
  fill.position.set(-50, 25, -30);
  cena.add(fill);
}

// Skybox com gradiente — usa um shader simples num cubo grande
function criarCeuGradiente() {
  ceuGrupo = new THREE.Group();
  cena.add(ceuGrupo);

  var skyGeo = new THREE.SphereGeometry(300, 32, 16);
  skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    fog: false,
    uniforms: {
      corZenite: { value: new THREE.Color(0x9bb5d4) },
      corHorizonte: { value: new THREE.Color(0xf2a86a) },
      corBaixo: { value: new THREE.Color(0xc88858) }
    },
    vertexShader: [
      'varying vec3 vWorldPos;',
      'void main() {',
      '  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
      '}'
    ].join('\n'),
    fragmentShader: [
      'varying vec3 vWorldPos;',
      'uniform vec3 corZenite;',
      'uniform vec3 corHorizonte;',
      'uniform vec3 corBaixo;',
      'void main() {',
      '  float h = normalize(vWorldPos).y;',
      '  vec3 cor;',
      '  if (h > 0.0) {',
      '    cor = mix(corHorizonte, corZenite, smoothstep(0.0, 0.6, h));',
      '  } else {',
      '    cor = mix(corHorizonte, corBaixo, smoothstep(0.0, -0.3, h));',
      '  }',
      '  gl_FragColor = vec4(cor, 1.0);',
      '}'
    ].join('\n')
  });
  var sky = new THREE.Mesh(skyGeo, skyMaterial);
  ceuGrupo.add(sky);
}

// Chamada no loop principal — faz o skybox seguir a camera
function atualizarCeu() {
  if (ceuGrupo) ceuGrupo.position.copy(camera.position);
}

// Aplicado a cada frame por tempo.js — atualiza ceu, sol, fog, ilum ambiente
function aplicarTempoNoMundo(t) {
  if (!skyMaterial || !solGlobal) return;

  // Cores do ceu
  var cores = calcularCoresCeu(t);
  skyMaterial.uniforms.corZenite.value.copy(cores.zenite);
  skyMaterial.uniforms.corHorizonte.value.copy(cores.horizonte);
  skyMaterial.uniforms.corBaixo.value.copy(cores.baixo);

  // Fog acompanha cor do horizonte
  if (cena.fog) cena.fog.color.copy(cores.horizonte);

  // Intensidade do sol — direcao e posicao sao tratadas por atualizarSombra (segue jogador)
  solGlobal.intensity = calcularIntensidadeSol(t);

  // Sol visual no ceu (no ceuGrupo, posicao local — segue camera)
  var solPos = calcularPosicaoSol(t);
  if (solVisualMesh) {
    solVisualMesh.position.copy(solPos.clone().multiplyScalar(2.2));
    solVisualMesh.visible = solGlobal.intensity > 0.05;
  }

  // Lua: oposta ao sol, visivel quando sol fraco
  if (luaMesh) {
    luaMesh.position.copy(solPos.clone().multiplyScalar(-2.2));
    luaMesh.visible = solGlobal.intensity < 0.4;
  }

  // Luz ambiente: maior de dia, menor a noite
  if (luzAmbienteGlobal) {
    var fator = solGlobal.intensity / 1.85; // 0..1
    luzAmbienteGlobal.intensity = 0.18 + fator * 0.45;
  }
}

// Sombra do sol: segue o jogador, e direcao acompanha posicao calculada por tempo.js
// Sem isso, a area com sombra so cobre regiao perto da origem do mundo
function atualizarSombra() {
  if (!solGlobal || !personagem) return;
  var px = personagem.position.x;
  var pz = personagem.position.z;
  // Direcao do sol vem do tempo (se tempo.js carregado), senao usa offset fixo
  var posSol;
  if (typeof calcularPosicaoSol === 'function' && typeof tempoAtual !== 'undefined') {
    posSol = calcularPosicaoSol(tempoAtual);
  } else {
    posSol = new THREE.Vector3(80, 60, 50);
  }
  solGlobal.position.set(px + posSol.x, Math.max(20, posSol.y), pz + posSol.z);
  solGlobal.target.position.set(px, 0, pz);
  solGlobal.target.updateMatrixWorld();
}
