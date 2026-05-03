// Mapa de Minas Gerais — silhueta real do estado.
// Define o contorno em coords lat/lng (aproximado, ~30 pontos seguindo divisas
// reais do estado), reprojeta pra coords de mundo e gera uma mask em canvas
// pra responder dentroDoEstado(x, z) em O(1) durante colisao/spawn/floresta.
//
// Convencao do mundo:
//   +X = leste (Atlantico),  -X = oeste (Triangulo Mineiro)
//   +Z = norte (Caatinga),   -Z = sul (Mantiqueira)
//   Origem (0,0) ~ centro geografico do estado (~lat -18.5, lng -45.4)
//   1 unidade ~= 460m

// Contorno aproximado de MG, sentido HORARIO (importante pra fill do canvas
// dar dentro/fora correto). Pontos seguem o perfil real: norte alongado,
// nordeste alargado pra divisa BA, leste descendo pra ES, bico do Caparao no
// sudeste, Mantiqueira no sul, "pescoco" pro Triangulo Mineiro a oeste,
// noroeste subindo pela divisa GO/BA. Wellington pode refinar pontos depois.
var MG_CONTORNO_LATLNG = [
  // Extremo norte (regiao de Espinosa, divisa BA)
  [-43.0, -14.5],
  [-42.4, -14.7],
  [-42.0, -15.0],
  [-41.5, -15.3],
  // Nordeste — divisa norte com BA, alongada
  [-40.8, -15.5],
  [-40.3, -16.0],
  [-39.9, -16.8],
  // Leste — divisa BA/ES descendo pro Atlantico
  [-39.8, -17.5],
  [-40.0, -18.3],
  [-40.5, -19.0],
  [-40.9, -19.7],
  // Sudeste — bico do Caparao (Pico da Bandeira, divisa ES)
  [-41.5, -20.4],
  [-42.0, -20.9],
  // Sul — descendo pra divisa RJ/SP, Mantiqueira
  [-42.6, -21.5],
  [-43.5, -22.1],
  [-44.5, -22.6],
  [-45.5, -22.9],
  [-46.5, -22.8],
  // Sudoeste — Triangulo Mineiro descendo pelo lado SP
  [-47.5, -22.6],
  [-48.5, -22.0],
  [-49.5, -21.0],
  // Extremo oeste — Triangulo (divisa GO/MS)
  [-50.5, -19.9],
  [-50.8, -19.3],
  [-50.5, -18.7],
  // Noroeste — divisa GO subindo
  [-49.7, -18.0],
  [-48.8, -17.3],
  [-47.8, -16.8],
  [-47.0, -16.4],
  [-46.3, -16.0],
  [-45.5, -15.5],
  [-44.7, -15.0],
  [-43.8, -14.6]
  // (fecha de volta no primeiro ponto)
];

// Reprojeção lat/lng → coords de mundo (X leste-oeste, Z norte-sul)
// Centroide aproximado do estado (lat=-18.5, lng=-45.4)
var MG_CENTRO_LAT = -18.5;
var MG_CENTRO_LNG = -45.4;

// Escala — calibrada pra deixar o estado dentro de ~2400x1800 unidades
// MG real: ~5.6° lng L-O e ~4.4° lat N-S
// Usar mesmo fator nos dois eixos preserva proporcao real visualmente
var MG_ESCALA_LNG = 215; // unid/grau (5.6 graus * 215 ~= 1200)
var MG_ESCALA_LAT = 200; // unid/grau (4.4 graus * 200 ~= 880)

var MG_CONTORNO = []; // Array de {x, z} em coords de mundo
var MG_BOUNDS = { xMin: 0, xMax: 0, zMin: 0, zMax: 0 };

// Mask CPU: Uint8Array indexavel. Resolucao 1024x768 (4:3) cobrindo MG_BOUNDS.
var MG_MASK_W = 1024;
var MG_MASK_H = 768;
var maskCanvas = null;
var maskData = null;

// Texturas pro shader (lazy — so cria se alguem pedir)
var maskTextureCache = null;

function iniciarMapaMG() {
  // 1) Reprojeta contorno
  MG_CONTORNO.length = 0;
  for (var i = 0; i < MG_CONTORNO_LATLNG.length; i++) {
    var lng = MG_CONTORNO_LATLNG[i][0];
    var lat = MG_CONTORNO_LATLNG[i][1];
    var x = (lng - MG_CENTRO_LNG) * MG_ESCALA_LNG;
    // Latitude: norte = z+, sul = z-.
    // lat=-14 (norte) - centro=-18.5 = +4.5 → z=+900 (norte). OK.
    // lat=-22.9 (sul)  - centro=-18.5 = -4.4 → z=-880 (sul).  OK.
    var z = (lat - MG_CENTRO_LAT) * MG_ESCALA_LAT;
    MG_CONTORNO.push({ x: x, z: z });
  }

  // 2) Calcula bounds com pequena folga
  var xMin = Infinity, xMax = -Infinity, zMin = Infinity, zMax = -Infinity;
  for (var j = 0; j < MG_CONTORNO.length; j++) {
    if (MG_CONTORNO[j].x < xMin) xMin = MG_CONTORNO[j].x;
    if (MG_CONTORNO[j].x > xMax) xMax = MG_CONTORNO[j].x;
    if (MG_CONTORNO[j].z < zMin) zMin = MG_CONTORNO[j].z;
    if (MG_CONTORNO[j].z > zMax) zMax = MG_CONTORNO[j].z;
  }
  // Margem 100u pra fora do estado (fim do mundo / fronteira visual)
  MG_BOUNDS.xMin = Math.floor(xMin) - 100;
  MG_BOUNDS.xMax = Math.ceil(xMax) + 100;
  MG_BOUNDS.zMin = Math.floor(zMin) - 100;
  MG_BOUNDS.zMax = Math.ceil(zMax) + 100;

  // 3) Gera mask em canvas
  maskCanvas = document.createElement('canvas');
  maskCanvas.width = MG_MASK_W;
  maskCanvas.height = MG_MASK_H;
  var ctx = maskCanvas.getContext('2d');

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, MG_MASK_W, MG_MASK_H);

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  for (var k = 0; k < MG_CONTORNO.length; k++) {
    var p = mundoParaMaskPx(MG_CONTORNO[k].x, MG_CONTORNO[k].z);
    if (k === 0) ctx.moveTo(p.px, p.py);
    else ctx.lineTo(p.px, p.py);
  }
  ctx.closePath();
  ctx.fill();

  // Cache do array de pixels (canal R basta — tudo branco/preto)
  var img = ctx.getImageData(0, 0, MG_MASK_W, MG_MASK_H);
  // Reduzir 4 bytes por pixel pra 1 (vermelho) economiza 4x memoria
  maskData = new Uint8Array(MG_MASK_W * MG_MASK_H);
  for (var pi = 0; pi < maskData.length; pi++) {
    maskData[pi] = img.data[pi * 4]; // canal R
  }

  console.log('[mapa-mg] bounds X[' + MG_BOUNDS.xMin + '..' + MG_BOUNDS.xMax +
              '] Z[' + MG_BOUNDS.zMin + '..' + MG_BOUNDS.zMax + ']');
}

// Converte coord de mundo (x,z) pra pixel da mask (px,py em [0..MG_MASK_W/H])
// px = leste cresce, py = sul cresce (canvas Y=0 no topo, queremos topo=norte)
// Logo px ~ X normalizado, py ~ -Z normalizado
function mundoParaMaskPx(x, z) {
  var nx = (x - MG_BOUNDS.xMin) / (MG_BOUNDS.xMax - MG_BOUNDS.xMin);
  // Z+ = norte; pixel y=0 deve ser z=zMax, y=H deve ser z=zMin → inverte
  var nz = (MG_BOUNDS.zMax - z) / (MG_BOUNDS.zMax - MG_BOUNDS.zMin);
  return {
    px: nx * MG_MASK_W,
    py: nz * MG_MASK_H
  };
}

// Resposta principal: ponto (x,z) ta dentro da silhueta de MG?
function dentroDoEstado(x, z) {
  if (!maskData) return true; // antes de iniciar, nao restringe
  if (x < MG_BOUNDS.xMin || x > MG_BOUNDS.xMax || z < MG_BOUNDS.zMin || z > MG_BOUNDS.zMax) {
    return false;
  }
  var p = mundoParaMaskPx(x, z);
  var ix = Math.floor(p.px);
  var iy = Math.floor(p.py);
  if (ix < 0 || ix >= MG_MASK_W || iy < 0 || iy >= MG_MASK_H) return false;
  return maskData[iy * MG_MASK_W + ix] > 127;
}

// Sorteia ponto aleatorio dentro do estado (rejeicao). Util pra spawn/floresta.
// maxTentativas ~ 50 e bem mais que o suficiente (estado ocupa ~60-70% do bbox).
function sortearPontoNoEstado(maxTentativas) {
  var max = maxTentativas || 50;
  for (var i = 0; i < max; i++) {
    var x = MG_BOUNDS.xMin + Math.random() * (MG_BOUNDS.xMax - MG_BOUNDS.xMin);
    var z = MG_BOUNDS.zMin + Math.random() * (MG_BOUNDS.zMax - MG_BOUNDS.zMin);
    if (dentroDoEstado(x, z)) return { x: x, z: z };
  }
  return null;
}

// Para uso em shaders que queiram amostrar a mask como textura
function getMaskTextura() {
  if (!maskCanvas) return null;
  if (!maskTextureCache) {
    maskTextureCache = new THREE.CanvasTexture(maskCanvas);
    maskTextureCache.minFilter = THREE.LinearFilter;
    maskTextureCache.magFilter = THREE.LinearFilter;
  }
  return maskTextureCache;
}
