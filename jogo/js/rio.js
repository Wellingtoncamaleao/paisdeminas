// Rio: spline curva atravessando o mapa de oeste pra leste, cruzando a
// trilha em ~(30, 20). Mesh de agua azul com leve animacao via vertex shader.
// distanciaAteRio() pra vegetacao evitar margens.

var rioSpline = null;
var pontosRio = null;
var rioMesh = null;
var LARGURA_RIO = 6.5;

function iniciarRio() {
  pontosRio = [
    new THREE.Vector3(-200, 0,  60),
    new THREE.Vector3(-130, 0,  35),
    new THREE.Vector3( -60, 0,  10),
    new THREE.Vector3(  30, 0,  20),  // cruza trilha aqui (ponte ficara aqui)
    new THREE.Vector3( 110, 0,  35),
    new THREE.Vector3( 200, 0,  85)
  ];
  rioSpline = new THREE.CatmullRomCurve3(pontosRio, false, 'catmullrom', 0.4);

  var segmentos = 240;
  var vertices = [];
  var uvs = [];
  var indices = [];

  for (var i = 0; i <= segmentos; i++) {
    var t = i / segmentos;
    var ponto = rioSpline.getPoint(t);
    var tan = rioSpline.getTangent(t);
    var perpX = -tan.z, perpZ = tan.x;
    var len = Math.sqrt(perpX * perpX + perpZ * perpZ);
    perpX /= len; perpZ /= len;

    vertices.push(ponto.x + perpX * LARGURA_RIO, 0.05, ponto.z + perpZ * LARGURA_RIO);
    uvs.push(0, t * 40);
    vertices.push(ponto.x - perpX * LARGURA_RIO, 0.05, ponto.z - perpZ * LARGURA_RIO);
    uvs.push(1, t * 40);

    if (i < segmentos) {
      var a = i * 2;
      indices.push(a, a + 2, a + 1);
      indices.push(a + 1, a + 2, a + 3);
    }
  }

  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  // Material agua: azul com leve transparencia + emissive sutil pra reflexo
  var mat = new THREE.MeshStandardMaterial({
    color: 0x3a7ab8,
    emissive: 0x1a4068,
    emissiveIntensity: 0.4,
    roughness: 0.25,
    metalness: 0.1,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85
  });

  rioMesh = new THREE.Mesh(geo, mat);
  rioMesh.receiveShadow = true;
  cena.add(rioMesh);
}

function distanciaAteRio(x, z) {
  if (!rioSpline) return Infinity;
  var menorDist2 = Infinity;
  for (var i = 0; i <= 60; i++) {
    var t = i / 60;
    var p = rioSpline.getPoint(t);
    var dx = x - p.x;
    var dz = z - p.z;
    var d2 = dx * dx + dz * dz;
    if (d2 < menorDist2) menorDist2 = d2;
  }
  return Math.sqrt(menorDist2);
}

// Retorna ponto na spline mais proximo de (x,z) — usado pra posicionar ponte
function pontoRioMaisProx(x, z) {
  if (!rioSpline) return null;
  var menorDist2 = Infinity;
  var melhorT = 0;
  var melhorP = null;
  for (var i = 0; i <= 200; i++) {
    var t = i / 200;
    var p = rioSpline.getPoint(t);
    var dx = x - p.x, dz = z - p.z;
    var d2 = dx * dx + dz * dz;
    if (d2 < menorDist2) {
      menorDist2 = d2;
      melhorT = t;
      melhorP = p;
    }
  }
  return { ponto: melhorP, t: melhorT };
}
