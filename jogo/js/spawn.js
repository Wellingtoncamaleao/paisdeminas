// Modo "Escolher onde nascer" — usado no PRIMEIRO login do player
// Camera fica top-down, jogador anda livre, aperta "Nascer aqui" pra confirmar

var modoEscolhendoSpawn = false;
var btnNascer = null;

function entrarModoEscolherSpawn() {
  modoEscolhendoSpawn = true;
  // Camera tatica pra ver o entorno
  if (typeof aplicarPresetCamera === 'function') {
    aplicarPresetCamera(3, false); // tatica (top-down)
  }

  // Spawn temporario aleatorio fora da trilha
  var tentativa = 0;
  do {
    var rx = (Math.random() - 0.5) * 200;
    var rz = (Math.random() - 0.5) * 200;
    tentativa++;
    if (typeof distanciaAteTrilha !== 'function' || distanciaAteTrilha(rx, rz) > 8) {
      personagem.position.set(rx, 0, rz);
      break;
    }
  } while (tentativa < 50);

  // Cria overlay com instrucao + botao
  if (!document.getElementById('overlay-spawn')) {
    var overlay = document.createElement('div');
    overlay.id = 'overlay-spawn';
    overlay.innerHTML =
      '<div class="spawn-instrucao">Caminhe e escolha onde quer começar sua jornada</div>' +
      '<button id="btn-nascer">Nascer aqui</button>';
    document.body.appendChild(overlay);

    btnNascer = document.getElementById('btn-nascer');
    btnNascer.addEventListener('click', confirmarSpawn);
  } else {
    document.getElementById('overlay-spawn').classList.remove('oculto');
  }
}

async function confirmarSpawn() {
  if (!modoEscolhendoSpawn || !personagem) return;
  var px = personagem.position.x;
  var pz = personagem.position.z;
  // Não deixa "nascer" em cima da trilha
  if (typeof distanciaAteTrilha === 'function' && distanciaAteTrilha(px, pz) < 4) {
    if (typeof mostrarDica === 'function') mostrarDica('Saia da trilha pra nascer aqui', 2500);
    return;
  }

  if (btnNascer) btnNascer.disabled = true;
  try {
    await apiSalvarSpawn(px, pz);
  } catch (e) {
    if (btnNascer) btnNascer.disabled = false;
    if (typeof mostrarDica === 'function') mostrarDica('Erro: ' + e.message, 3000);
    return;
  }

  modoEscolhendoSpawn = false;
  var overlay = document.getElementById('overlay-spawn');
  if (overlay) overlay.classList.add('oculto');

  // Volta camera pro padrao
  if (typeof aplicarPresetCamera === 'function') {
    aplicarPresetCamera(1, false); // padrao
  }

  if (typeof mostrarMensagem === 'function') {
    mostrarMensagem('Bem-vindo a Minas Gerais! Sua jornada começa aqui.', 5000);
  }
}
