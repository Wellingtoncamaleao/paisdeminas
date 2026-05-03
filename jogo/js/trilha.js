// Trilha: spline serpenteando o mundo, gerada como faixa de terra
var trilhaSpline;
var pontosTrilha;

function iniciarTrilha() {
  // Pontos da trilha — Caminho do Sertao mineiro: sai do sul (Mantiqueira,
  // simbolizando o Caminho Velho do Ouro vindo do RJ), passa pelo centro,
  // segue norte ate o Sertao. Cobre o estado em diagonal SO->NE serpenteando.
  pontosTrilha = [
    new THREE.Vector3(-100, 0, -800),  // sul: entrada Mantiqueira (Caminho Velho)
    new THREE.Vector3(-50, 0, -650),
    new THREE.Vector3(20, 0, -500),
    new THREE.Vector3(80, 0, -350),
    new THREE.Vector3(50, 0, -200),
    new THREE.Vector3(-20, 0, -50),
    new THREE.Vector3(-80, 0, 100),
    new THREE.Vector3(-30, 0, 280),
    new THREE.Vector3(80, 0, 450),
    new THREE.Vector3(180, 0, 600),
    new THREE.Vector3(150, 0, 750),    // norte: Sertao
  ];

  trilhaSpline = new THREE.CatmullRomCurve3(pontosTrilha, false, 'catmullrom', 0.4);

  // Gera fita de trilha amostrando a spline em N segmentos
  // Largura aumentada (3.2 -> 5) pra ser visivel na escala maior do mundo
  var segmentos = 360;
  var largura = 5;
  var vertices = [];
  var indices = [];

  for (var i = 0; i <= segmentos; i++) {
    var t = i / segmentos;
    var ponto = trilhaSpline.getPoint(t);
    var tangente = trilhaSpline.getTangent(t);
    // Vetor perpendicular no plano XZ (rotaciona 90 graus)
    var perpX = -tangente.z;
    var perpZ = tangente.x;
    var len = Math.sqrt(perpX * perpX + perpZ * perpZ);
    perpX /= len;
    perpZ /= len;

    // Trilha acompanha relevo: cada borda pega altura do terreno + 0.12 offset
    // pra evitar Z-fighting com o chao
    var xL = ponto.x + perpX * largura;
    var zL = ponto.z + perpZ * largura;
    var xR = ponto.x - perpX * largura;
    var zR = ponto.z - perpZ * largura;
    var yL = ((typeof alturaEm === 'function') ? alturaEm(xL, zL) : 0) + 0.12;
    var yR = ((typeof alturaEm === 'function') ? alturaEm(xR, zR) : 0) + 0.12;

    // Borda esquerda
    vertices.push(xL, yL, zL);
    // Borda direita
    vertices.push(xR, yR, zR);

    if (i < segmentos) {
      var a = i * 2;
      // Winding ajustado pra normal apontar pra cima (Y+)
      indices.push(a, a + 2, a + 1);
      indices.push(a + 1, a + 2, a + 3);
    }
  }

  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  var mat = new THREE.MeshLambertMaterial({
    color: 0x5c3a1c,
    side: THREE.DoubleSide
  });
  var trilhaMesh = new THREE.Mesh(geo, mat);
  cena.add(trilhaMesh);
}

// Distancia aproximada de um ponto (x,z) ate a trilha — pra evitar arvore na trilha
function distanciaAteTrilha(x, z) {
  var menorDist = Infinity;
  for (var i = 0; i <= 60; i++) {
    var t = i / 60;
    var p = trilhaSpline.getPoint(t);
    var dx = x - p.x;
    var dz = z - p.z;
    var dist = dx * dx + dz * dz;
    if (dist < menorDist) menorDist = dist;
  }
  return Math.sqrt(menorDist);
}
