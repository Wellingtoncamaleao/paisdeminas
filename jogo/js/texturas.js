// Texturas procedurais geradas via Canvas 2D
// Vantagem: zero dependencia externa, zero download, gerada na hora
// Desvantagem: nao chega na qualidade de fotos reais — mas elimina o "plastico" das cores chapadas
// Cada funcao retorna THREE.CanvasTexture pronto pra usar como map

var texCache = {}; // cacheia texturas pra reuso

function criarCanvas(tamanho) {
  var c = document.createElement('canvas');
  c.width = tamanho; c.height = tamanho;
  return c;
}

function texturaParaThree(canvas, repetir) {
  var tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  if (typeof repetir === 'number') tex.repeat.set(repetir, repetir);
  if (tex.colorSpace !== undefined) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Helper: ruido pseudo-aleatorio com seed pra consistencia
function ruido(x, y, seed) {
  var n = Math.sin(x * 12.9898 + y * 78.233 + (seed || 0)) * 43758.5453;
  return n - Math.floor(n);
}

// === GRAMA — verde com variacao + manchas escuras (folhas) ===
function texturaGrama() {
  if (texCache.grama) return texCache.grama;
  var size = 256;
  var c = criarCanvas(size);
  var ctx = c.getContext('2d');
  var img = ctx.createImageData(size, size);
  for (var y = 0; y < size; y++) {
    for (var x = 0; x < size; x++) {
      var i = (y * size + x) * 4;
      // Mistura 3 tons de verde baseado em ruido
      var r1 = ruido(x * 0.1, y * 0.1, 1);
      var r2 = ruido(x * 0.5, y * 0.5, 2);
      var verdeBase = 80 + r1 * 40;
      var vermBase = 50 + r2 * 30;
      var azulBase = 35 + r1 * 20;
      // Manchas escuras (folhas caidas)
      if (r2 < 0.08) {
        verdeBase *= 0.4; vermBase *= 0.7; azulBase *= 0.4;
      }
      // Manchas claras (terra)
      if (r2 > 0.95) {
        vermBase = 90; verdeBase = 70; azulBase = 50;
      }
      img.data[i + 0] = vermBase;
      img.data[i + 1] = verdeBase;
      img.data[i + 2] = azulBase;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  texCache.grama = texturaParaThree(c, 50);
  return texCache.grama;
}

// === MADEIRA — tabuas verticais com vetas ===
function texturaMadeira() {
  if (texCache.madeira) return texCache.madeira;
  var size = 256;
  var c = criarCanvas(size);
  var ctx = c.getContext('2d');
  // Base
  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(0, 0, size, size);
  // Tabuas verticais
  var nTabuas = 6;
  var larguraTabua = size / nTabuas;
  for (var t = 0; t < nTabuas; t++) {
    var tom = 100 + ruido(t, 0, 5) * 60;
    ctx.fillStyle = 'rgb(' + Math.floor(tom * 1.4) + ',' + Math.floor(tom * 0.85) + ',' + Math.floor(tom * 0.5) + ')';
    ctx.fillRect(t * larguraTabua, 0, larguraTabua - 1, size);
    // Linha entre tabuas
    ctx.fillStyle = 'rgba(40, 20, 10, 0.7)';
    ctx.fillRect(t * larguraTabua + larguraTabua - 2, 0, 2, size);
  }
  // Vetas e nós
  var img = ctx.getImageData(0, 0, size, size);
  for (var y = 0; y < size; y++) {
    for (var x = 0; x < size; x++) {
      var i = (y * size + x) * 4;
      var v = ruido(x * 0.05, y * 0.4, 7);
      if (v < 0.35) {
        img.data[i] *= 0.85; img.data[i + 1] *= 0.85; img.data[i + 2] *= 0.85;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  texCache.madeira = texturaParaThree(c, 1);
  return texCache.madeira;
}

// === PEDRA — cinza rugoso, padrao craquelado ===
function texturaPedra() {
  if (texCache.pedra) return texCache.pedra;
  var size = 256;
  var c = criarCanvas(size);
  var ctx = c.getContext('2d');
  var img = ctx.createImageData(size, size);
  for (var y = 0; y < size; y++) {
    for (var x = 0; x < size; x++) {
      var i = (y * size + x) * 4;
      var n1 = ruido(x * 0.08, y * 0.08, 11);
      var n2 = ruido(x * 0.4, y * 0.4, 12);
      var v = 80 + n1 * 60 + n2 * 30;
      img.data[i] = v;
      img.data[i + 1] = v * 0.97;
      img.data[i + 2] = v * 0.93;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  texCache.pedra = texturaParaThree(c, 1);
  return texCache.pedra;
}

// === PALHA / TELHADO — amarelado com fios horizontais ===
function texturaPalha() {
  if (texCache.palha) return texCache.palha;
  var size = 256;
  var c = criarCanvas(size);
  var ctx = c.getContext('2d');
  // Base
  ctx.fillStyle = '#a8763e';
  ctx.fillRect(0, 0, size, size);
  var img = ctx.getImageData(0, 0, size, size);
  for (var y = 0; y < size; y++) {
    for (var x = 0; x < size; x++) {
      var i = (y * size + x) * 4;
      // Fios horizontais alongados — ruido principalmente em Y
      var v = ruido(x * 0.3, y * 0.05, 17);
      var fator = 0.6 + v * 0.7;
      img.data[i] = Math.min(255, 168 * fator);
      img.data[i + 1] = Math.min(255, 118 * fator);
      img.data[i + 2] = Math.min(255, 62 * fator);
    }
  }
  ctx.putImageData(img, 0, 0);
  texCache.palha = texturaParaThree(c, 3);
  return texCache.palha;
}

// === CASCA DE ARVORE — marrom-escuro com sulcos verticais ===
function texturaCasca() {
  if (texCache.casca) return texCache.casca;
  var size = 256;
  var c = criarCanvas(size);
  var ctx = c.getContext('2d');
  var img = ctx.createImageData(size, size);
  for (var y = 0; y < size; y++) {
    for (var x = 0; x < size; x++) {
      var i = (y * size + x) * 4;
      // Sulcos verticais — ruido em X, suave em Y
      var v1 = ruido(x * 0.4, y * 0.04, 23);
      var v2 = ruido(x * 0.05, y * 0.4, 24);
      var brilho = 0.55 + v1 * 0.35 + v2 * 0.1;
      img.data[i] = 80 * brilho;
      img.data[i + 1] = 50 * brilho;
      img.data[i + 2] = 30 * brilho;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  texCache.casca = texturaParaThree(c, 2);
  return texCache.casca;
}

// === FOLHAGEM — verde com pequenas folhas ===
function texturaFolhagem() {
  if (texCache.folhagem) return texCache.folhagem;
  var size = 256;
  var c = criarCanvas(size);
  var ctx = c.getContext('2d');
  var img = ctx.createImageData(size, size);
  for (var y = 0; y < size; y++) {
    for (var x = 0; x < size; x++) {
      var i = (y * size + x) * 4;
      var n1 = ruido(x * 0.3, y * 0.3, 31);
      var n2 = ruido(x * 0.08, y * 0.08, 32);
      var verde = 50 + n1 * 60 + n2 * 30;
      var verm = 35 + n1 * 30;
      var azul = 25 + n1 * 20;
      img.data[i] = verm;
      img.data[i + 1] = verde;
      img.data[i + 2] = azul;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  texCache.folhagem = texturaParaThree(c, 2);
  return texCache.folhagem;
}
