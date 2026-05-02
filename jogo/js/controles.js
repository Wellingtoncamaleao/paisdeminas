// Controles: teclado (WASD + Shift) e mouse
var teclas = {};
var mouseDX = 0, mouseDY = 0;
var estaAndando = false;
var correndo = false;
var sensibilidadeMouse = 0.0022;
var velAndar = 4.5;
var velCorrer = 9;

function iniciarControles() {
  document.addEventListener('keydown', function(e) {
    // Handlers "one-shot" — disparam UMA vez quando tecla pressionada (nao ao segurar)
    if (!teclas[e.code]) {
      if (e.code === 'KeyC' && typeof tentarClaim === 'function') tentarClaim();
      if (e.code === 'KeyE' && typeof tentarColeta === 'function') tentarColeta();
    }
    teclas[e.code] = true;
  });
  document.addEventListener('keyup', function(e) {
    teclas[e.code] = false;
  });

  // Pointer lock — clica no canvas e o mouse trava no jogo (so PC, mobile usa drag direto)
  renderer.domElement.addEventListener('click', function() {
    if (typeof ehMobile !== 'undefined' && ehMobile) return;
    if (document.pointerLockElement !== renderer.domElement) {
      renderer.domElement.requestPointerLock();
    }
  });

  document.addEventListener('mousemove', function(e) {
    if (document.pointerLockElement === renderer.domElement) {
      mouseDX += e.movementX;
      mouseDY += e.movementY;
    }
  });
}

function atualizarControles(delta) {
  // Vetores de direcao baseados na rotacao da camera (yaw)
  var frenteX = -Math.sin(cameraYaw);
  var frenteZ = -Math.cos(cameraYaw);
  var ladoX = -Math.cos(cameraYaw);
  var ladoZ = Math.sin(cameraYaw);

  var movX = 0, movZ = 0;
  if (teclas['KeyW']) { movX += frenteX; movZ += frenteZ; }
  if (teclas['KeyS']) { movX -= frenteX; movZ -= frenteZ; }
  if (teclas['KeyA']) { movX += ladoX;   movZ += ladoZ; }
  if (teclas['KeyD']) { movX -= ladoX;   movZ -= ladoZ; }

  // Joystick virtual (mobile) — soma ao movimento das teclas
  if (typeof movJoyX !== 'undefined' && (movJoyX !== 0 || movJoyZ !== 0)) {
    // Joystick Y negativo (dedo pra cima) = pra frente
    movX += frenteX * (-movJoyZ) + ladoX * (-movJoyX);
    movZ += frenteZ * (-movJoyZ) + ladoZ * (-movJoyX);
  }

  estaAndando = (movX !== 0 || movZ !== 0);
  correndo = teclas['ShiftLeft'] || teclas['ShiftRight'];

  if (estaAndando) {
    // Normaliza
    var len = Math.sqrt(movX * movX + movZ * movZ);
    movX /= len;
    movZ /= len;

    var vel = (correndo ? velCorrer : velAndar) * delta;
    movX *= vel;
    movZ *= vel;

    // Tenta mover em X e Z separadamente pra "deslizar" em paredes
    var novoX = personagem.position.x + movX;
    var novoZ = personagem.position.z + movZ;

    if (podeMover(novoX, personagem.position.z)) {
      personagem.position.x = novoX;
    }
    if (podeMover(personagem.position.x, novoZ)) {
      personagem.position.z = novoZ;
    }

    // Personagem rotaciona suavemente pra direcao do movimento
    var anguloAlvo = Math.atan2(movX, movZ);
    var diff = anguloAlvo - personagem.rotation.y;
    // Encurta diff pro intervalo [-PI, PI]
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    personagem.rotation.y += diff * Math.min(delta * 10, 1);
  }
}
