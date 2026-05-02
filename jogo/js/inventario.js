// Inventario: contagem de recursos coletados, persiste em localStorage
var inventario = { madeira: 0, pedra: 0 };
var CHAVE_INV = 'paisdeminas-inv';

function inicializarInventario() {
  try {
    var salvo = localStorage.getItem(CHAVE_INV);
    if (salvo) {
      var dados = JSON.parse(salvo);
      inventario.madeira = dados.madeira || 0;
      inventario.pedra = dados.pedra || 0;
    }
  } catch (e) {
    console.warn('Falha ao ler inventario do localStorage:', e);
  }
}

function adicionarRecurso(tipo, qtd) {
  inventario[tipo] = (inventario[tipo] || 0) + qtd;
  salvarInventario();
  if (typeof atualizarHudInventario === 'function') atualizarHudInventario();
  if (typeof atualizarPilhas === 'function') atualizarPilhas();
}

// Tenta gastar recursos. Retorna true se conseguiu, false se nao tem o suficiente.
// custos: { madeira: N, pedra: M }
function gastarRecursos(custos) {
  // Verifica primeiro
  for (var tipo in custos) {
    if ((inventario[tipo] || 0) < custos[tipo]) return false;
  }
  // Desconta
  for (var tipo2 in custos) {
    inventario[tipo2] -= custos[tipo2];
  }
  salvarInventario();
  if (typeof atualizarHudInventario === 'function') atualizarHudInventario();
  if (typeof atualizarPilhas === 'function') atualizarPilhas();
  return true;
}

function salvarInventario() {
  try {
    localStorage.setItem(CHAVE_INV, JSON.stringify(inventario));
  } catch (e) {
    console.warn('Falha ao salvar inventario:', e);
  }
}
