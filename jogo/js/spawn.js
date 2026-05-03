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

  // Spawn temporario: sorteia ponto dentro da silhueta de MG perto da trilha
  // (caminhada inicial proxima do Caminho do Sertao). Tenta por 80 vezes
  // pra cair no estado, perto da trilha mas nao em cima dela.
  var tentativa = 0;
  var rx = 0, rz = 0;
  while (tentativa < 80) {
    tentativa++;
    var pos = (typeof sortearPontoNoEstado === 'function')
      ? sortearPontoNoEstado(20)
      : { x: (Math.random() - 0.5) * 200, z: (Math.random() - 0.5) * 200 };
    if (!pos) continue;
    rx = pos.x;
    rz = pos.z;
    // Perto da trilha (<= 60u) mas fora dela (>= 8u)
    if (typeof distanciaAteTrilha === 'function') {
      var d = distanciaAteTrilha(rx, rz);
      if (d > 8 && d < 60) break;
    } else {
      break;
    }
  }
  personagem.position.set(rx, 0, rz);

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
