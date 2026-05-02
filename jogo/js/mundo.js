// Mundo: terreno plano, ceu de amanhecer, neblina, iluminacao
var terrenoMesh;
var ceuGrupo; // dome + sol — segue a camera

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
  cena.add(luzAmbiente);

  // Sol — direcional baixo no horizonte, dourado, projetando sombras
  var sol = new THREE.DirectionalLight(0xffd4a3, 1.85);
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
  solVisual.position.set(220, 90, 140);
  ceuGrupo.add(solVisual);

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
  var skyMat = new THREE.ShaderMaterial({
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
  var sky = new THREE.Mesh(skyGeo, skyMat);
  ceuGrupo.add(sky);
}

// Chamada no loop principal — faz o skybox seguir a camera
function atualizarCeu() {
  if (ceuGrupo) ceuGrupo.position.copy(camera.position);
}

// Faz a sombra do sol seguir o personagem (mantendo direcao do sol fixa)
// Sem isso, a area com sombra so cobre regiao perto da origem do mundo
function atualizarSombra() {
  if (!window.__sol || !personagem) return;
  var px = personagem.position.x;
  var pz = personagem.position.z;
  // Mantem offset fixo do sol relativo ao alvo (sol "vem do nordeste")
  window.__sol.position.set(px + 80, 60, pz + 50);
  window.__sol.target.position.set(px, 0, pz);
  window.__sol.target.updateMatrixWorld();
}
