// Relevo de Minas Gerais — heightmap procedural.
// Soma de gaussianas representando as serras reais do estado:
//   - Mantiqueira (sul): macico ao longo da divisa SP/RJ
//   - Espinhaco (norte-sul, centro-leste): cordilheira mais marcante
//   - Caparao (sudeste): pico isolado, ponto mais alto do estado real
//   - Canastra (sudoeste): cabeceira do Sao Francisco
//   - Vespasiano (centro): macico de transicao
// Mais "valles" subtrativos pra criar depressoes nos vales dos rios principais.
//
// Cache: pre-calcula mapaAltura 256x192 sobre o bbox do estado pra lookups O(1)
// em colisao/spawn/floresta. Recalcular gaussianas a cada chamada seria ~30
// floats por consulta — caro com milhares de arvores e checks por frame.

// Gaussianas aditivas (positivas → elevacao). Cada item:
//   { x, z, raioX, raioZ, altura, expoente }
// expoente: 1 = circular suave (gaussiana classica), 2 = mais agudo
var SERRAS_MG = [
  // Mantiqueira — sul, faixa larga oeste-leste
  { x: -150, z: -780, raioX: 250, raioZ: 70, altura: 22, expoente: 1 },
  { x:  100, z: -740, raioX: 200, raioZ: 80, altura: 26, expoente: 1 },
  { x:  350, z: -680, raioX: 180, raioZ: 90, altura: 24, expoente: 1 },

  // Caparao — pico isolado SE (ponto mais alto: Pico da Bandeira ~2890m)
  // Coords reais: lat -20.4, lng -41.8 → (~774, -380)
  { x:  774, z: -380, raioX: 80, raioZ: 100, altura: 32, expoente: 1.5 },
  { x:  680, z: -300, raioX: 90, raioZ: 80, altura: 22, expoente: 1 },

  // Espinhaco — cordilheira N-S na metade leste do estado
  // Quadrilatero Ferrifero (Ouro Preto/Mariana)
  { x:  280, z: -380, raioX: 90, raioZ: 110, altura: 20, expoente: 1 },
  // Cipo/Diamantina (centro-leste)
  { x:  380, z:  -80, raioX: 80, raioZ: 130, altura: 24, expoente: 1 },
  // Continuando ao norte (Itambé/Grão Mogol)
  { x:  450, z:  220, raioX: 90, raioZ: 140, altura: 22, expoente: 1 },
  { x:  500, z:  500, raioX: 100, raioZ: 140, altura: 18, expoente: 1 },

  // Canastra — sudoeste, cabeceira do Sao Francisco
  { x: -550, z: -550, raioX: 110, raioZ: 130, altura: 19, expoente: 1 },
  { x: -380, z: -480, raioX: 90, raioZ: 90, altura: 15, expoente: 1 },

  // Macicos centrais — Pirineus/Sao Jose
  { x:  -50, z: -200, raioX: 130, raioZ: 100, altura: 12, expoente: 1 },

  // Norte de Minas — Serra Geral / Espinosa (suaves, mais como "tabuleiro")
  { x:  300, z:  680, raioX: 200, raioZ: 120, altura: 10, expoente: 1 },

  // Triangulo Mineiro — chapada suave (planalto)
  { x: -800, z: -200, raioX: 250, raioZ: 200, altura: 6, expoente: 1 }
];

// Vales subtrativos (cria depressoes onde os rios correm).
// Profundidade limitada a 1m pra nao inundar terreno (oceano em Y=-0.3) — em
// vez de cavar o vale fundo, deixa as gaussianas das serras nao crescerem ali
// (raioX/raioZ dos vales > raioX/raioZ das serras nas mesmas faixas).
var VALES_MG = [
  // Sao Francisco (corre N-S no centro/oeste)
  { x: -100, z: -250, raioX: 60, raioZ: 250, altura: 1.0, expoente: 1 },
  { x:  -50, z:  300, raioX: 70, raioZ: 300, altura: 1.0, expoente: 1 },
  // Vale do Doce (corre L-O no leste)
  { x:  700, z: -250, raioX: 350, raioZ: 50, altura: 0.8, expoente: 1 },
  // Vale do Paranaiba (separa Triangulo do resto)
  { x: -700, z: -550, raioX: 350, raioZ: 50, altura: 0.8, expoente: 1 }
];

// Profundidade que vertices FORA da silhueta vao (afunda → vira "agua")
// Tem que ser bem abaixo do bordaMesh (Y=-0.3) pra criar fronteira visual nitida
var PROFUNDIDADE_FORA = -45;

// Mapa de altura pre-calculado (grid sobre o bbox)
var MAPA_ALTURA_W = 256;
var MAPA_ALTURA_H = 192;
var mapaAltura = null; // Float32Array(W*H)

function iniciarRelevo() {
  if (typeof MG_BOUNDS === 'undefined') {
    console.warn('[relevo] MG_BOUNDS nao disponivel — relevo desabilitado');
    return;
  }
  mapaAltura = new Float32Array(MAPA_ALTURA_W * MAPA_ALTURA_H);
  var dx = (MG_BOUNDS.xMax - MG_BOUNDS.xMin) / (MAPA_ALTURA_W - 1);
  var dz = (MG_BOUNDS.zMax - MG_BOUNDS.zMin) / (MAPA_ALTURA_H - 1);

  for (var iy = 0; iy < MAPA_ALTURA_H; iy++) {
    var z = MG_BOUNDS.zMax - iy * dz; // iy=0 = norte (zMax), iy=H-1 = sul
    for (var ix = 0; ix < MAPA_ALTURA_W; ix++) {
      var x = MG_BOUNDS.xMin + ix * dx;
      mapaAltura[iy * MAPA_ALTURA_W + ix] = calcularAlturaProcedural(x, z);
    }
  }
  console.log('[relevo] mapa altura ' + MAPA_ALTURA_W + 'x' + MAPA_ALTURA_H + ' calculado');
}

// Calculo procedural via soma de gaussianas. Pesado pra chamar muitas vezes
// por frame — usar alturaEm() (que faz lookup no cache) sempre que possivel.
function calcularAlturaProcedural(x, z) {
  var h = 0;
  for (var i = 0; i < SERRAS_MG.length; i++) {
    var s = SERRAS_MG[i];
    var dx = (x - s.x) / s.raioX;
    var dz = (z - s.z) / s.raioZ;
    var d2 = dx * dx + dz * dz;
    if (d2 > 9) continue; // alem de 3 raios, contribuicao desprezivel
    var fator = Math.exp(-Math.pow(d2, s.expoente));
    h += s.altura * fator;
  }
  for (var j = 0; j < VALES_MG.length; j++) {
    var v = VALES_MG[j];
    var dxv = (x - v.x) / v.raioX;
    var dzv = (z - v.z) / v.raioZ;
    var d2v = dxv * dxv + dzv * dzv;
    if (d2v > 9) continue;
    h -= v.altura * Math.exp(-Math.pow(d2v, v.expoente));
  }
  return h;
}

// Lookup rapido pelo cache (com interpolacao bilinear).
// Fora do bbox retorna PROFUNDIDADE_FORA (afunda).
// Fora da silhueta tambem afunda — usado pelo terreno pra criar borda visual.
function alturaEm(x, z) {
  if (typeof MG_BOUNDS === 'undefined' || !mapaAltura) return 0;

  // Fora da silhueta — afunda (cria efeito de "fim do mundo")
  if (typeof dentroDoEstado === 'function' && !dentroDoEstado(x, z)) {
    return PROFUNDIDADE_FORA;
  }

  // Coords normalizadas no bbox [0..1]
  var nx = (x - MG_BOUNDS.xMin) / (MG_BOUNDS.xMax - MG_BOUNDS.xMin);
  var nz = (MG_BOUNDS.zMax - z) / (MG_BOUNDS.zMax - MG_BOUNDS.zMin);
  if (nx < 0 || nx > 1 || nz < 0 || nz > 1) return PROFUNDIDADE_FORA;

  // Interpolacao bilinear
  var fx = nx * (MAPA_ALTURA_W - 1);
  var fy = nz * (MAPA_ALTURA_H - 1);
  var ix = Math.floor(fx);
  var iy = Math.floor(fy);
  var tx = fx - ix;
  var ty = fy - iy;
  var ix1 = Math.min(ix + 1, MAPA_ALTURA_W - 1);
  var iy1 = Math.min(iy + 1, MAPA_ALTURA_H - 1);

  var h00 = mapaAltura[iy * MAPA_ALTURA_W + ix];
  var h10 = mapaAltura[iy * MAPA_ALTURA_W + ix1];
  var h01 = mapaAltura[iy1 * MAPA_ALTURA_W + ix];
  var h11 = mapaAltura[iy1 * MAPA_ALTURA_W + ix1];

  var h0 = h00 * (1 - tx) + h10 * tx;
  var h1 = h01 * (1 - tx) + h11 * tx;
  return h0 * (1 - ty) + h1 * ty;
}

// Inclinacao em (x, z): magnitude do gradiente (m/m).
// Usado pra impedir spawn em encostas e pra colisao bloquear paredes.
function inclinacaoEm(x, z) {
  var passo = 4; // unidades — sample a 4m de distancia
  var hC = alturaEm(x, z);
  var hL = alturaEm(x + passo, z);
  var hR = alturaEm(x - passo, z);
  var hN = alturaEm(x, z + passo);
  var hS = alturaEm(x, z - passo);
  var dx = (hL - hR) / (2 * passo);
  var dz = (hN - hS) / (2 * passo);
  return Math.sqrt(dx * dx + dz * dz);
}
