// Controles touch pra mobile: joystick virtual (esquerda), drag camera (direita), botoes (canto inf dir)
// Auto-detect: se device tem touch, mostra os controles e desativa pointer lock
var ehMobile = false;
var movJoyX = 0;          // -1 a 1
var movJoyZ = 0;          // -1 a 1 (Z negativo = pra frente)
var joyAtivo = false;
var joyTouchId = null;
var joyCentroX = 0, joyCentroY = 0;
var joyRaioPx = 50;       // raio max do thumb
var camTouchId = null;
var camTouchUltimoX = 0, camTouchUltimoY = 0;

function detectarMobile() {
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) ||
         (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
}

function inicializarTouch() {
  ehMobile = detectarMobile();
  if (!ehMobile) return;

  // Marca body pra CSS aplicar layout mobile
  document.body.classList.add('mobile');

  criarUiTouch();
  conectarEventosTouch();
}

function criarUiTouch() {
  // Joystick virtual canto inferior esquerdo
  var joyBase = document.createElement('div');
  joyBase.id = 'joy-base';
  var joyThumb = document.createElement('div');
  joyThumb.id = 'joy-thumb';
  joyBase.appendChild(joyThumb);
  document.body.appendChild(joyBase);

  // Botoes canto inferior direito
  var botoes = document.createElement('div');
  botoes.id = 'botoes-touch';
  botoes.innerHTML =
    '<button id="btn-correr" class="btn-touch">CORRER</button>' +
    '<button id="btn-coletar" class="btn-touch">COLETAR</button>' +
    '<button id="btn-clamar" class="btn-touch">CLAMAR</button>' +
    '<button id="btn-construir" class="btn-touch">CONSTRUIR</button>';
  document.body.appendChild(botoes);

  // Botao de camera (separado, canto superior esquerdo)
  var btnCam = document.createElement('button');
  btnCam.id = 'btn-camera';
  btnCam.className = 'btn-touch btn-camera';
  btnCam.textContent = 'CÂMERA';
  document.body.appendChild(btnCam);

  // Bind dos botoes
  bindBotaoToggle('btn-correr', 'ShiftLeft');
  bindBotaoTap('btn-coletar', function() { if (typeof tentarColeta === 'function') tentarColeta(); });
  bindBotaoTap('btn-clamar', function() { if (typeof tentarClaim === 'function') tentarClaim(); });
  bindBotaoTap('btn-construir', function() {
    mostrarDica('Construção em breve (Fase 3)', 2000);
  });
  bindBotaoTap('btn-camera', function() {
    if (typeof proximoPresetCamera === 'function') proximoPresetCamera();
  });
}

// Botao "tap": dispara funcao no touchstart
function bindBotaoTap(id, fn) {
  var b = document.getElementById(id);
  if (!b) return;
  b.addEventListener('touchstart', function(e) {
    e.preventDefault();
    e.stopPropagation();
    fn();
  }, { passive: false });
  b.addEventListener('click', function(e) { e.preventDefault(); fn(); });
}

// Botao "toggle": liga tecla enquanto segura
function bindBotaoToggle(id, codigo) {
  var b = document.getElementById(id);
  if (!b) return;
  b.addEventListener('touchstart', function(e) {
    e.preventDefault(); e.stopPropagation();
    teclas[codigo] = true;
    b.classList.add('ativo');
  }, { passive: false });
  b.addEventListener('touchend', function(e) {
    e.preventDefault();
    teclas[codigo] = false;
    b.classList.remove('ativo');
  });
  b.addEventListener('touchcancel', function(e) {
    teclas[codigo] = false;
    b.classList.remove('ativo');
  });
}

function conectarEventosTouch() {
  var joyBase = document.getElementById('joy-base');

  // === Joystick ===
  joyBase.addEventListener('touchstart', function(e) {
    e.preventDefault();
    var t = e.changedTouches[0];
    joyTouchId = t.identifier;
    var rect = joyBase.getBoundingClientRect();
    joyCentroX = rect.left + rect.width / 2;
    joyCentroY = rect.top + rect.height / 2;
    joyAtivo = true;
    atualizarJoystick(t.clientX, t.clientY);
  }, { passive: false });

  // === Camera (drag em qualquer outro lugar da tela) ===
  document.addEventListener('touchstart', function(e) {
    if (!ehMobile) return;
    // Procura primeiro touch que NAO seja do joystick nem em botoes
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.identifier === joyTouchId) continue;
      var alvo = document.elementFromPoint(t.clientX, t.clientY);
      if (!alvo) continue;
      if (alvo.closest && (alvo.closest('#joy-base') || alvo.closest('#botoes-touch') || alvo.closest('#tela-inicial'))) continue;
      // Esse touch eh da camera
      camTouchId = t.identifier;
      camTouchUltimoX = t.clientX;
      camTouchUltimoY = t.clientY;
      break;
    }
  }, { passive: true });

  // === Movimento (joystick + camera) ===
  document.addEventListener('touchmove', function(e) {
    if (!ehMobile) return;
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.identifier === joyTouchId) {
        e.preventDefault();
        atualizarJoystick(t.clientX, t.clientY);
      } else if (t.identifier === camTouchId) {
        // Drag pra olhar — alimenta os mesmos delta que o mouse usaria
        var dx = t.clientX - camTouchUltimoX;
        var dy = t.clientY - camTouchUltimoY;
        camTouchUltimoX = t.clientX;
        camTouchUltimoY = t.clientY;
        // Sensibilidade touch eh mais alta (movimento de dedo eh menor que de mouse em pixels)
        mouseDX += dx * 1.6;
        mouseDY += dy * 1.6;
      }
    }
  }, { passive: false });

  // === Soltar ===
  document.addEventListener('touchend', function(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.identifier === joyTouchId) {
        joyTouchId = null;
        joyAtivo = false;
        movJoyX = 0; movJoyZ = 0;
        var thumb = document.getElementById('joy-thumb');
        if (thumb) thumb.style.transform = 'translate(0,0)';
      } else if (t.identifier === camTouchId) {
        camTouchId = null;
      }
    }
  }, { passive: true });

  document.addEventListener('touchcancel', function(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.identifier === joyTouchId) {
        joyTouchId = null;
        joyAtivo = false;
        movJoyX = 0; movJoyZ = 0;
      } else if (t.identifier === camTouchId) {
        camTouchId = null;
      }
    }
  });
}

function atualizarJoystick(touchX, touchY) {
  var dx = touchX - joyCentroX;
  var dy = touchY - joyCentroY;
  var dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > joyRaioPx) {
    dx = (dx / dist) * joyRaioPx;
    dy = (dy / dist) * joyRaioPx;
    dist = joyRaioPx;
  }
  // Normaliza pra -1..1
  movJoyX = dx / joyRaioPx;
  movJoyZ = dy / joyRaioPx;
  var thumb = document.getElementById('joy-thumb');
  if (thumb) thumb.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
}
