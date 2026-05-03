// Rio: spline curva atravessando o mapa de oeste pra leste, cruzando a
// trilha em ~(30, 20). Mesh de agua azul com leve animacao via vertex shader.
// distanciaAteRio() pra vegetacao evitar margens.

var rioSpline = null;
var pontosRio = null;
var rioMesh = null;
// Rio Sao Francisco — corre S->N pelo centro/oeste do estado.
// Largura ampliada (6.5 -> 14) pra se ler bem na escala MG (~2400x1800)
var LARGURA_RIO = 14;

function iniciarRio() {
  // Trajeto aproximado do Sao Francisco em MG: nasce na Serra da Canastra
  // (sudoeste, perto do Triangulo), corre N pelo centro-oeste, sai pra BA.
  pontosRio = [
    new THREE.Vector3(-450, 0, -550),  // nascente Canastra (sudoeste)
    new THREE.Vector3(-380, 0, -350),
    new THREE.Vector3(-280, 0, -150),
    new THREE.Vector3(-180, 0,  20),   // entronca trilha (ponte aqui)
    new THREE.Vector3(-100, 0,  200),
    new THREE.Vector3( -50, 0,  400),
    new THREE.Vector3(  20, 0,  600),
    new THREE.Vector3(  80, 0,  780)   // sai pra BA (norte)
  ];
  rioSpline = new THREE.CatmullRomCurve3(pontosRio, false, 'catmullrom', 0.4);

  // Subdivisao transversal pra que as ondas do shader (agua.js) tenham
  // resolucao suficiente pra deformar a malha visualmente. 8 vertices por
  // secao = 7 quads na largura. Comprimento mantem 360 segs (~2880 vertices).
  var segmentos = 360;
  var subdivLarg = 8;
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

    // Gera subdivLarg vertices ao longo da largura do rio (de -LARGURA a +LARGURA).
    // Cada um pega altura do terreno onde cai (Fase B) — VALES_MG cava o solo.
    for (var j = 0; j < subdivLarg; j++) {
      var u = j / (subdivLarg - 1);            // 0..1
      var lateral = (u - 0.5) * 2;             // -1..+1
      var x = ponto.x + perpX * LARGURA_RIO * lateral;
      var z = ponto.z + perpZ * LARGURA_RIO * lateral;
      var y = ((typeof alturaEm === 'function') ? alturaEm(x, z) : 0) + 0.05;
      vertices.push(x, y, z);
      uvs.push(u, t * 40);
    }

    if (i < segmentos) {
      // Triangula cada faixa entre seccoes consecutivas
      for (var k = 0; k < subdivLarg - 1; k++) {
        var a = i * subdivLarg + k;
        indices.push(a, a + subdivLarg, a + 1);
        indices.push(a + 1, a + subdivLarg, a + subdivLarg + 1);
      }
    }
  }

  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  // Agua estilizada — vertex shader com ondas + gradiente raso/fundo + foam
  // nas margens. agua.js define o material; aqui parametriza pro rio.
  var mat = (typeof criarMaterialAgua === 'function')
    ? criarMaterialAgua({
        eixoAltura: 'y',         // mesh nao rotacionado, altura = Y
        amplitude: 0.25,         // ondas modestas (rio calmo)
        frequencia: 0.08,        // ondas largas (~78u de periodo)
        velocidadeOnda: 1.0,
        corSuperficie: 0x6dc4d8, // turquesa claro
        corFundo: 0x2a5a88,      // azul medio (rio nao e tao profundo)
        corEspuma: 0xeaf3f7,
        espumaBordas: true,      // foam nas margens
        opacidade: 0.94
      })
    : new THREE.MeshStandardMaterial({
        color: 0x3a7ab8, transparent: true, opacity: 0.85,
        side: THREE.DoubleSide
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
