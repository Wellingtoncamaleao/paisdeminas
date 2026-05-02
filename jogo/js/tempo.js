// Tempo do MUNDO (compartilhado entre todos os jogadores)
// 0 = meia-noite, 0.25 = 6h, 0.5 = meio-dia, 0.75 = 18h
// Calculado deterministicamente a partir do timestamp UTC — todos os
// browsers veem o mesmo horario (relogios sincronizados via NTP).
var tempoAtual = 0;
var DURACAO_DIA_S = 480; // 8 minutos reais = 1 dia no jogo
var pausaTempo = false;
var tempoCongeladoCliente = 0; // se pausa, congela a visualizacao DESTE cliente

function calcularTempoMundo() {
  var agoraSec = Date.now() / 1000;
  return (agoraSec / DURACAO_DIA_S) % 1;
}

function inicializarTempo() {
  tempoAtual = calcularTempoMundo();
}

function atualizarTempo(delta) {
  if (pausaTempo) {
    tempoAtual = tempoCongeladoCliente;
  } else {
    tempoAtual = calcularTempoMundo();
  }

  if (typeof aplicarTempoNoMundo === 'function') aplicarTempoNoMundo(tempoAtual);
  if (typeof atualizarEstrelas === 'function') atualizarEstrelas(tempoAtual);
  if (typeof atualizarLua === 'function') atualizarLua(tempoAtual);
  if (typeof atualizarRelogioHud === 'function') atualizarRelogioHud();
}

function togglePausaTempo() {
  pausaTempo = !pausaTempo;
  if (pausaTempo) {
    tempoCongeladoCliente = calcularTempoMundo();
  }
  if (typeof mostrarDica === 'function') {
    mostrarDica(
      pausaTempo
        ? 'Tempo congelado (só pra você — mundo continua)'
        : 'Tempo voltou ao do mundo',
      2200
    );
  }
}

function tempoParaTextoHora(t) {
  var totalMin = t * 24 * 60;
  var horas = Math.floor(totalMin / 60) % 24;
  var minutos = Math.floor(totalMin % 60);
  return (horas < 10 ? '0' : '') + horas + ':' + (minutos < 10 ? '0' : '') + minutos;
}

// === Cores do ceu por fase do dia (interpolacao linear entre keyframes) ===
// Cada keyframe tem: t (0..1), zenite, horizonte, baixo
var FASES_CEU = [
  { t: 0.00, zen: 0x050a25, hor: 0x1a1535, bai: 0x050310 }, // meia-noite
  { t: 0.18, zen: 0x2a3050, hor: 0x6a4538, bai: 0x402030 }, // pre-amanhecer
  { t: 0.28, zen: 0x6090b0, hor: 0xf2a86a, bai: 0xc88858 }, // amanhecer (cor original)
  { t: 0.50, zen: 0x6699cc, hor: 0xb8d8e8, bai: 0x88a0b0 }, // meio-dia
  { t: 0.70, zen: 0x4a78a8, hor: 0xc89070, bai: 0x885a3a }, // tarde-final
  { t: 0.78, zen: 0x483060, hor: 0xc84830, bai: 0x80201a }, // entardecer (por do sol)
  { t: 0.88, zen: 0x1a1840, hor: 0x301838, bai: 0x100815 }, // noite cedo
  { t: 1.00, zen: 0x050a25, hor: 0x1a1535, bai: 0x050310 }  // volta meia-noite
];

function calcularCoresCeu(t) {
  // Encontra par de keyframes que contém t
  for (var i = 0; i < FASES_CEU.length - 1; i++) {
    var f1 = FASES_CEU[i];
    var f2 = FASES_CEU[i + 1];
    if (t >= f1.t && t < f2.t) {
      var alfa = (t - f1.t) / (f2.t - f1.t);
      return {
        zenite: lerpCorHex(f1.zen, f2.zen, alfa),
        horizonte: lerpCorHex(f1.hor, f2.hor, alfa),
        baixo: lerpCorHex(f1.bai, f2.bai, alfa)
      };
    }
  }
  // Fallback
  return {
    zenite: new THREE.Color(FASES_CEU[0].zen),
    horizonte: new THREE.Color(FASES_CEU[0].hor),
    baixo: new THREE.Color(FASES_CEU[0].bai)
  };
}

function lerpCorHex(hex1, hex2, alfa) {
  var c = new THREE.Color(hex1);
  var c2 = new THREE.Color(hex2);
  return c.lerp(c2, alfa);
}

// Posicao do sol numa esfera ao redor da camera
// Nascente em t=0.25 (leste), pôr em t=0.75 (oeste)
function calcularPosicaoSol(t) {
  var ang = (t - 0.25) * Math.PI * 2;
  return new THREE.Vector3(
    Math.cos(ang) * 100,
    Math.sin(ang) * 100,
    50
  );
}

// Intensidade do sol: máxima ao meio-dia, zero entre 0.85 e 0.18 (noite)
function calcularIntensidadeSol(t) {
  var INTENSIDADE_DIA = 1.85;
  if (t < 0.18 || t > 0.85) return 0;
  if (t < 0.28) return ((t - 0.18) / 0.10) * INTENSIDADE_DIA; // amanhecer
  if (t > 0.78) return ((0.85 - t) / 0.07) * INTENSIDADE_DIA; // entardecer
  return INTENSIDADE_DIA;
}
