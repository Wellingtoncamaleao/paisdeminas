// Audio sintetico via Web Audio API (sem precisar baixar mp3)
// Ambiente: ruido rosa filtrado (vento) + bips agudos esporadicos (passaros)
// Passos: pulso de ruido filtrado tocado a cada passo do personagem
var audioCtx;
var ultimoPasso = 0;
var faseAudioPasso = 0;

function iniciarAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  // Som ambiente: ruido rosa em loop, filtrado em low-pass (parece vento longe)
  var bufferAmb = audioCtx.createBuffer(1, audioCtx.sampleRate * 6, audioCtx.sampleRate);
  var dadosAmb = bufferAmb.getChannelData(0);
  // Algoritmo Paul Kellet pra ruido rosa
  var b0 = 0, b1 = 0, b2 = 0;
  for (var i = 0; i < dadosAmb.length; i++) {
    var w = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.0990460;
    b1 = 0.96300 * b1 + w * 0.2965164;
    b2 = 0.57000 * b2 + w * 1.0526913;
    dadosAmb[i] = (b0 + b1 + b2 + w * 0.1848) * 0.05;
  }

  var srcAmb = audioCtx.createBufferSource();
  srcAmb.buffer = bufferAmb;
  srcAmb.loop = true;

  var filtroAmb = audioCtx.createBiquadFilter();
  filtroAmb.type = 'lowpass';
  filtroAmb.frequency.value = 700;
  filtroAmb.Q.value = 0.5;

  var gainAmb = audioCtx.createGain();
  gainAmb.gain.value = 0.35;

  srcAmb.connect(filtroAmb);
  filtroAmb.connect(gainAmb);
  gainAmb.connect(audioCtx.destination);
  srcAmb.start();

  // Passaros: agenda primeiros bips
  agendarPassaro();
}

function agendarPassaro() {
  setTimeout(function() {
    tocarPassaro();
    agendarPassaro();
  }, 2500 + Math.random() * 5000);
}

function tocarPassaro() {
  if (!audioCtx) return;

  // Bip curto agudo com pequeno glissando — soa como pio de passaro
  var osc = audioCtx.createOscillator();
  var g = audioCtx.createGain();
  var t0 = audioCtx.currentTime;

  var freqInicio = 1800 + Math.random() * 2000;
  var freqFim = freqInicio + (Math.random() * 800 - 200);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freqInicio, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(freqFim, 200), t0 + 0.18);

  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(0.06, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);

  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.4);

  // 60% de chance de ter um segundo bip mais grave (efeito de "tilim-tilim")
  if (Math.random() < 0.6) {
    setTimeout(function() {
      var o2 = audioCtx.createOscillator();
      var g2 = audioCtx.createGain();
      var tt = audioCtx.currentTime;
      o2.frequency.setValueAtTime(freqInicio * 0.7, tt);
      o2.frequency.exponentialRampToValueAtTime(freqInicio * 0.9, tt + 0.12);
      g2.gain.setValueAtTime(0, tt);
      g2.gain.linearRampToValueAtTime(0.04, tt + 0.02);
      g2.gain.exponentialRampToValueAtTime(0.0001, tt + 0.25);
      o2.connect(g2);
      g2.connect(audioCtx.destination);
      o2.start(tt);
      o2.stop(tt + 0.3);
    }, 180);
  }
}

function tocarPasso() {
  if (!audioCtx) return;

  // Pulso curto de ruido filtrado low-pass — som de pe na terra
  var dur = 0.18;
  var buffer = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * dur), audioCtx.sampleRate);
  var dados = buffer.getChannelData(0);
  for (var i = 0; i < dados.length; i++) {
    var env = 1 - i / dados.length;
    dados[i] = (Math.random() * 2 - 1) * env * env * 0.6;
  }

  var src = audioCtx.createBufferSource();
  src.buffer = buffer;

  var filtro = audioCtx.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = 350 + Math.random() * 150;

  var g = audioCtx.createGain();
  g.gain.value = 0.35;

  src.connect(filtro);
  filtro.connect(g);
  g.connect(audioCtx.destination);
  src.start();
}

function atualizarAudio(delta) {
  // Toca passos quando andando, sincronizado com bobbing
  if (estaAndando) {
    var freqPasso = correndo ? 7 : 4.2; // Hz
    faseAudioPasso += delta * freqPasso * Math.PI * 2;
    var agora = performance.now();

    // Toca quando seno cruza zero ascendente
    if (Math.sin(faseAudioPasso) > 0.95 && (agora - ultimoPasso) > 200) {
      tocarPasso();
      ultimoPasso = agora;
    }
  } else {
    faseAudioPasso = 0;
  }
}
