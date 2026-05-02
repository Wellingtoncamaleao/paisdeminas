// HUD: painel de inventario (canto inferior direito) + dicas temporarias (centro inferior)
var dicaTimer = null;

function inicializarHud() {
  // Painel de inventario
  var painel = document.createElement('div');
  painel.id = 'hud-inventario';
  painel.innerHTML =
    '<div class="hud-titulo">Inventário</div>' +
    '<div class="hud-item">Madeira: <span id="hud-madeira">0</span></div>' +
    '<div class="hud-item">Pedra: <span id="hud-pedra">0</span></div>';
  document.body.appendChild(painel);

  // Dica temporaria
  var dica = document.createElement('div');
  dica.id = 'hud-dica';
  document.body.appendChild(dica);

  atualizarHudInventario();
}

function atualizarHudInventario() {
  var m = document.getElementById('hud-madeira');
  var p = document.getElementById('hud-pedra');
  if (m) m.textContent = inventario.madeira;
  if (p) p.textContent = inventario.pedra;
}

function mostrarDica(texto, duracaoMs) {
  var d = document.getElementById('hud-dica');
  if (!d) return;
  d.textContent = texto;
  d.classList.add('visivel');
  if (dicaTimer) clearTimeout(dicaTimer);
  dicaTimer = setTimeout(function() {
    d.classList.remove('visivel');
  }, duracaoMs || 2200);
}
