// Estrelas: 800 pontos brancos distribuidos no skydome, fade in/out na noite
var estrelasMesh;

function inicializarEstrelas() {
  if (typeof ceuGrupo === 'undefined' || !ceuGrupo) return;

  var n = 800;
  var pos = new Float32Array(n * 3);
  var raioEstrelas = 280;

  for (var i = 0; i < n; i++) {
    // Distribui na metade SUPERIOR de uma esfera (theta = 0..2pi, phi = 0..PI/2)
    var theta = Math.random() * Math.PI * 2;
    var phi = Math.acos(Math.random() * 0.95 + 0.05);
    pos[i * 3] = raioEstrelas * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = raioEstrelas * Math.cos(phi);
    pos[i * 3 + 2] = raioEstrelas * Math.sin(phi) * Math.sin(theta);
  }

  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  var mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.4,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false
  });

  estrelasMesh = new THREE.Points(geo, mat);
  estrelasMesh.renderOrder = -2;
  ceuGrupo.add(estrelasMesh);
}

function atualizarEstrelas(t) {
  if (!estrelasMesh) return;
  // Visiveis: t > 0.85 ou t < 0.18 (noite total + crepusculos)
  var op;
  if (t < 0.10 || t > 0.92) op = 1;
  else if (t < 0.20) op = (0.20 - t) / 0.10; // some na alvorada
  else if (t > 0.82) op = (t - 0.82) / 0.10; // aparece no entardecer
  else op = 0;
  estrelasMesh.material.opacity = Math.max(0, Math.min(1, op));
}

// Lua: helper que tempo.js chama, mas a logica esta em mundo.js (luaMesh)
// Esta funcao existe so pra dar simetria com atualizarEstrelas
function atualizarLua(t) {
  // Posicao + visibilidade ja sao tratados em aplicarTempoNoMundo
  // (placeholder, fica vazio)
}
