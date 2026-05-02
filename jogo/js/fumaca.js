// Fumaca subindo da chamine das cabanas — sistema de particulas via THREE.Points
// Cada cabana media/grande tem chamine. Pra cada uma, criamos um emissor.
// Particulas sobem, se dispersam lateralmente, ficam transparentes e morrem.
var emissoresFumaca = [];

// Posicao relativa da chamine no Group da cabana (mesma usada em montarChamine)
function obterOffsetChamine(grupoCabana) {
  var raio = grupoCabana.userData.raioColisao;
  var lado = (raio === 4.5) ? 6 : (raio === 6.0) ? 8 : 0; // pequena nao tem chamine
  if (lado === 0) return null;
  // montarChamine: position(-larguraChamine*0.5, altMin + altura/2, -profChamine*0.5)
  // larguraChamine = lado * 0.30 (media) ou 0.32 (grande); profChamine = mesmo
  var fator = (raio === 4.5) ? 0.3 : 0.32;
  var larguraChamine = lado * fator;
  var profChamine = lado * fator;
  var altParede = (raio === 4.5) ? 2.8 : 3.2;
  var altura = (raio === 4.5) ? 1.3 : 1.8;
  return {
    x: -larguraChamine * 0.5,
    y: altParede + altura,
    z: -profChamine * 0.5
  };
}

function criarEmissorFumaca(grupoCabana) {
  var offset = obterOffsetChamine(grupoCabana);
  if (!offset) return; // cabana sem chamine

  var nParticulas = 25;
  var posicoes = new Float32Array(nParticulas * 3);
  var vidas = new Float32Array(nParticulas);
  var velocidades = new Float32Array(nParticulas * 3);

  for (var i = 0; i < nParticulas; i++) {
    vidas[i] = Math.random() * 2.5; // vida inicial aleatoria pra dispersar spawn
    posicoes[i * 3] = 0;
    posicoes[i * 3 + 1] = 0;
    posicoes[i * 3 + 2] = 0;
    velocidades[i * 3] = (Math.random() - 0.5) * 0.4;
    velocidades[i * 3 + 1] = 0.6 + Math.random() * 0.4;
    velocidades[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
  }

  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(posicoes, 3));

  var mat = new THREE.PointsMaterial({
    color: 0xddccc0,
    size: 0.7,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    fog: true,
    sizeAttenuation: true
  });

  var pontos = new THREE.Points(geo, mat);
  // Posiciona origem do emissor na chamine (em coords do mundo)
  var posMundo = new THREE.Vector3(offset.x, offset.y, offset.z);
  posMundo.applyMatrix4(grupoCabana.matrixWorld);
  pontos.position.copy(posMundo);
  cena.add(pontos);

  emissoresFumaca.push({
    pontos: pontos,
    velocidades: velocidades,
    vidas: vidas,
    nParticulas: nParticulas,
    posicoesAttr: geo.attributes.position
  });
}

function inicializarFumaca() {
  // Cria emissores pras cabanas existentes ao iniciar
  if (typeof cabanasConstruidas === 'undefined') return;
  for (var i = 0; i < cabanasConstruidas.length; i++) {
    cabanasConstruidas[i].mesh.updateMatrixWorld();
    criarEmissorFumaca(cabanasConstruidas[i].mesh);
  }
}

// Hook chamado em construcao.js depois de uma cabana ser materializada
function adicionarFumacaPara(grupoCabana) {
  if (grupoCabana) {
    grupoCabana.updateMatrixWorld();
    criarEmissorFumaca(grupoCabana);
  }
}

function atualizarFumaca(delta) {
  for (var k = 0; k < emissoresFumaca.length; k++) {
    var e = emissoresFumaca[k];
    var arr = e.posicoesAttr.array;
    for (var i = 0; i < e.nParticulas; i++) {
      e.vidas[i] -= delta;
      if (e.vidas[i] <= 0) {
        // Resetar particula
        e.vidas[i] = 2.0 + Math.random() * 1.5;
        arr[i * 3] = (Math.random() - 0.5) * 0.15;
        arr[i * 3 + 1] = 0;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
        e.velocidades[i * 3] = (Math.random() - 0.5) * 0.4;
        e.velocidades[i * 3 + 1] = 0.6 + Math.random() * 0.4;
        e.velocidades[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
      } else {
        arr[i * 3] += e.velocidades[i * 3] * delta;
        arr[i * 3 + 1] += e.velocidades[i * 3 + 1] * delta;
        arr[i * 3 + 2] += e.velocidades[i * 3 + 2] * delta;
        // Dispersao lateral aumenta com altura
        e.velocidades[i * 3] += (Math.random() - 0.5) * delta * 0.3;
        e.velocidades[i * 3 + 2] += (Math.random() - 0.5) * delta * 0.3;
      }
    }
    e.posicoesAttr.needsUpdate = true;
  }
}
