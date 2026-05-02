// Inventario: contagem de recursos coletados, persiste no servidor (debounced)
var inventario = { madeira: 0, pedra: 0 };
var debounceInvTimer = null;

function inicializarInventario() {
  if (window.estadoServidor && window.estadoServidor.inventario) {
    inventario.madeira = window.estadoServidor.inventario.madeira || 0;
    inventario.pedra = window.estadoServidor.inventario.pedra || 0;
  }
}

function adicionarRecurso(tipo, qtd) {
  inventario[tipo] = (inventario[tipo] || 0) + qtd;
  agendarSalvarInventario();
  if (typeof atualizarHudInventario === 'function') atualizarHudInventario();
  if (typeof atualizarPilhas === 'function') atualizarPilhas();
}

function gastarRecursos(custos) {
  for (var tipo in custos) {
    if ((inventario[tipo] || 0) < custos[tipo]) return false;
  }
  for (var tipo2 in custos) {
    inventario[tipo2] -= custos[tipo2];
  }
  agendarSalvarInventario();
  if (typeof atualizarHudInventario === 'function') atualizarHudInventario();
  if (typeof atualizarPilhas === 'function') atualizarPilhas();
  return true;
}

// Salvar com debounce — evita 1 request por coleta. Manda valor final consolidado.
function agendarSalvarInventario() {
  if (debounceInvTimer) clearTimeout(debounceInvTimer);
  debounceInvTimer = setTimeout(function() {
    salvarInventario();
    debounceInvTimer = null;
  }, 1500);
}

function salvarInventario() {
  if (typeof apiSalvarInventario !== 'function') return;
  apiSalvarInventario(inventario.madeira, inventario.pedra).catch(function(e) {
    console.warn('Falha ao salvar inventário:', e);
  });
}
