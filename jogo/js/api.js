// Cliente da API REST: gerencia token, faz fetch com header X-Token
// Estado global: window.session = { token, player } quando logado

var API_BASE = 'api'; // relativo (servido pelo mesmo Apache)
var CHAVE_TOKEN = 'paisdeminas-token';
var CHAVE_PLAYER = 'paisdeminas-player';

window.session = null;

function carregarSessaoSalva() {
  try {
    var t = localStorage.getItem(CHAVE_TOKEN);
    var p = localStorage.getItem(CHAVE_PLAYER);
    if (t && p) {
      window.session = { token: t, player: JSON.parse(p) };
    }
  } catch (e) {}
}

function salvarSessao(token, player) {
  window.session = { token: token, player: player };
  try {
    localStorage.setItem(CHAVE_TOKEN, token);
    localStorage.setItem(CHAVE_PLAYER, JSON.stringify(player));
  } catch (e) {}
}

function limparSessao() {
  window.session = null;
  try {
    localStorage.removeItem(CHAVE_TOKEN);
    localStorage.removeItem(CHAVE_PLAYER);
  } catch (e) {}
}

// Wrapper de fetch que injeta X-Token e parseia JSON
async function apiFetch(rota, opts) {
  opts = opts || {};
  var headers = opts.headers || {};
  headers['Content-Type'] = 'application/json';
  if (window.session && window.session.token) headers['X-Token'] = window.session.token;

  var resp = await fetch(API_BASE + '/' + rota, {
    method: opts.method || 'GET',
    headers: headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });

  var dados;
  try { dados = await resp.json(); } catch (e) { dados = {}; }

  if (!resp.ok) {
    var msg = (dados && dados.erro) || ('Erro ' + resp.status);
    if (resp.status === 401) limparSessao();
    throw new Error(msg);
  }
  return dados;
}

// === Endpoints ===

function apiRegistrar(nome, senha) {
  return apiFetch('auth.php?action=registrar', { method: 'POST', body: { nome: nome, senha: senha } });
}
function apiLogin(nome, senha) {
  return apiFetch('auth.php?action=login', { method: 'POST', body: { nome: nome, senha: senha } });
}
function apiCarregarEstado() {
  return apiFetch('state.php');
}
function apiSalvarClaim(claim) {
  return apiFetch('state.php?action=salvar_claim', { method: 'POST', body: claim });
}
function apiSalvarCabana(cabana) {
  return apiFetch('state.php?action=salvar_cabana', { method: 'POST', body: cabana });
}
function apiSalvarFogueira(fogueira) {
  return apiFetch('state.php?action=salvar_fogueira', { method: 'POST', body: fogueira });
}
function apiSetFogueiraAtiva(id, ativa) {
  return apiFetch('state.php?action=set_fogueira_ativa', { method: 'POST', body: { id: id, ativa: ativa } });
}
function apiSalvarInventario(madeira, pedra) {
  return apiFetch('state.php?action=salvar_inventario', {
    method: 'POST', body: { madeira: madeira, pedra: pedra }
  });
}
function apiPingPosicao(x, z, rotY) {
  return apiFetch('state.php?action=ping_posicao', { method: 'POST', body: { x: x, z: z, rotY: rotY } });
}
function apiOutrosPlayers() {
  return apiFetch('players.php');
}
function apiSalvarSpawn(x, z) {
  return apiFetch('state.php?action=salvar_spawn', { method: 'POST', body: { x: x, z: z } });
}
function apiMoverCabana(id, x, z, rotY) {
  return apiFetch('state.php?action=mover_cabana', {
    method: 'POST', body: { id: id, x: x, z: z, rotY: rotY }
  });
}
function apiMoverFogueira(id, x, z) {
  return apiFetch('state.php?action=mover_fogueira', {
    method: 'POST', body: { id: id, x: x, z: z }
  });
}
function apiSalvarOffsetPilha(tipo, offX, offZ, rotY) {
  return apiFetch('state.php?action=salvar_offset_pilha', {
    method: 'POST', body: { tipo: tipo, offX: offX, offZ: offZ, rotY: rotY || 0 }
  });
}
function apiRealinharTudo() {
  return apiFetch('state.php?action=realinhar_tudo', { method: 'POST' });
}

// Helper de console: chame `realinharTudo()` no DevTools pra forcar
// realinhamento de todos os terrenos a rotacao do mais antigo. Recarrega a pagina.
window.realinharTudo = async function() {
  try {
    var r = await apiRealinharTudo();
    console.log('Realinhados:', r.realinhados);
    location.reload();
  } catch (e) {
    console.error('Erro ao realinhar:', e.message);
  }
};
