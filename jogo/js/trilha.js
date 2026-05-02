// Trilha: spline serpenteando o mundo, gerada como faixa de terra
var trilhaSpline;
var pontosTrilha;

function iniciarTrilha() {
  // Pontos da trilha — comeca canto sudoeste, termina nordeste
  pontosTrilha = [
    new THREE.Vector3(-160, 0, -160),
    new THREE.Vector3(-100, 0, -110),
    new THREE.Vector3(-50, 0, -70),
    new THREE.Vector3(-20, 0, -30),
    new THREE.Vector3(15, 0, 5),
    new THREE.Vector3(45, 0, 35),
    new THREE.Vector3(75, 0, 75),
    new THREE.Vector3(120, 0, 120),
    new THREE.Vector3(160, 0, 160),
  ];

  trilhaSpline = new THREE.CatmullRomCurve3(pontosTrilha, false, 'catmullrom', 0.4);

  // Gera fita de trilha amostrando a spline em N segmentos
  var segmentos = 240;
  var largura = 3.2;
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

    // Borda esquerda
    vertices.push(ponto.x + perpX * largura, 0.12, ponto.z + perpZ * largura);
    // Borda direita
    vertices.push(ponto.x - perpX * largura, 0.12, ponto.z - perpZ * largura);

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
