// Camera de terceira pessoa: orbita atras do personagem, mouse rotaciona
var cameraYaw = Math.PI + Math.PI / 4; // comeca olhando pra direcao da trilha (nordeste)
var cameraPitch = 0.25;
var distanciaCamera = 6.5;
var alturaAlvo = 1.4;

function iniciarCamera() {
  // Posicao inicial calculada uma vez antes do primeiro frame
  atualizarCamera(0);
}

function atualizarCamera(delta) {
  // Aplica delta acumulado do mouse
  cameraYaw -= mouseDX * sensibilidadeMouse;
  cameraPitch -= mouseDY * sensibilidadeMouse;
  // Limita pitch pra nao virar de cabeca pra baixo
  cameraPitch = Math.max(-0.4, Math.min(1.1, cameraPitch));
  mouseDX = 0;
  mouseDY = 0;

  // Posicao da camera: esfera ao redor do personagem
  var px = personagem.position.x;
  var py = personagem.position.y;
  var pz = personagem.position.z;

  var distHoriz = distanciaCamera * Math.cos(cameraPitch);
  var cx = px + Math.sin(cameraYaw) * distHoriz;
  var cz = pz + Math.cos(cameraYaw) * distHoriz;
  var cy = py + alturaAlvo + distanciaCamera * Math.sin(cameraPitch);

  // Nao deixar camera ir abaixo do chao
  if (cy < 0.5) cy = 0.5;

  camera.position.set(cx, cy, cz);
  camera.lookAt(px, py + alturaAlvo, pz);
}
