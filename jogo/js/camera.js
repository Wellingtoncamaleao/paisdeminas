// Camera de terceira pessoa: orbita atras do personagem, mouse rotaciona
// 4 presets estilo FC Mobile (Próxima, Padrão, Distante, Tática)
var cameraYaw = Math.PI + Math.PI / 4;  // comeca olhando pra direcao da trilha
var cameraPitch = 0.55;                 // (sobrescrito pelo preset abaixo)
var distanciaCamera = 8.5;              // (sobrescrito pelo preset abaixo)
var alturaAlvo = 1.4;                   // (sobrescrito pelo preset abaixo)

var presetsCamera = [
  { nome: 'PRÓXIMA',  dist: 5.0,  pitch: 0.40, alturaAlvo: 1.3 },
  { nome: 'PADRÃO',   dist: 8.5,  pitch: 0.55, alturaAlvo: 1.4 },
  { nome: 'DISTANTE', dist: 13,   pitch: 0.75, alturaAlvo: 1.5 },
  { nome: 'TÁTICA',   dist: 20,   pitch: 1.30, alturaAlvo: 1.5 }
];
var presetCameraAtual = 1; // PADRAO por default
var CHAVE_CAMERA = 'paisdeminas-camera-preset';

function iniciarCamera() {
  // Carrega preset salvo se houver
  try {
    var salvo = localStorage.getItem(CHAVE_CAMERA);
    if (salvo !== null) {
      var idx = parseInt(salvo, 10);
      if (idx >= 0 && idx < presetsCamera.length) presetCameraAtual = idx;
    }
  } catch (e) {}
  aplicarPresetCamera(presetCameraAtual, false);
  atualizarCamera(0);
}

function aplicarPresetCamera(idx, mostrarDicaUi) {
  presetCameraAtual = idx;
  var p = presetsCamera[idx];
  distanciaCamera = p.dist;
  cameraPitch = p.pitch;
  alturaAlvo = p.alturaAlvo;
  try { localStorage.setItem(CHAVE_CAMERA, String(idx)); } catch (e) {}
  if (mostrarDicaUi && typeof mostrarDica === 'function') {
    mostrarDica('Câmera: ' + p.nome, 1800);
  }
}

function proximoPresetCamera() {
  var prox = (presetCameraAtual + 1) % presetsCamera.length;
  aplicarPresetCamera(prox, true);
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
