// Construcao de cabanas (Fase 3.0): receita pronta com fantasma de posicionamento
// Estados: 'fechado' | 'menu' | 'posicionando'
var modoConstrucao = 'fechado';
var cabanaFantasma = null;
var cabanaTipoAtual = null;
var cabanasConstruidas = [];
var CHAVE_CABANAS = 'paisdeminas-cabanas';

function inicializarConstrucao() {
  carregarCabanasSalvas();
  conectarUiConstrucao();
}

function carregarCabanasSalvas() {
  try {
    var salvo = localStorage.getItem(CHAVE_CABANAS);
    if (!salvo) return;
    var lista = JSON.parse(salvo);
    if (!Array.isArray(lista)) return;
    for (var i = 0; i < lista.length; i++) {
      var item = lista[i];
      var fab = FABRICAS_CABANA[item.tipo];
      if (!fab) continue;
      var grupo = fab();
      grupo.position.set(item.x, 0, item.z);
      grupo.rotation.y = item.rotY || 0;
      cena.add(grupo);
      cabanasConstruidas.push({
        tipo: item.tipo, x: item.x, z: item.z, rotY: item.rotY, mesh: grupo,
        raioColisao: grupo.userData.raioColisao
      });
      // Adiciona paredes como obstaculos (com abertura na porta)
      var paredes = obterColisaoCabana(item.tipo, item.x, item.z, item.rotY || 0);
      for (var pj = 0; pj < paredes.length; pj++) paredesCabana.push(paredes[pj]);
    }
  } catch (e) {
    console.warn('Falha ao carregar cabanas:', e);
  }
}

function salvarCabanas() {
  var lista = cabanasConstruidas.map(function(c) {
    return { tipo: c.tipo, x: c.x, z: c.z, rotY: c.rotY };
  });
  try { localStorage.setItem(CHAVE_CABANAS, JSON.stringify(lista)); } catch (e) {}
}

function conectarUiConstrucao() {
  // Botao X de fechar painel
  var btnFechar = document.getElementById('fechar-construcao');
  if (btnFechar) btnFechar.addEventListener('click', cancelarConstrucao);

  // Cards de cabana
  var cards = document.querySelectorAll('.card-cabana');
  for (var i = 0; i < cards.length; i++) {
    (function(card) {
      var tipo = card.getAttribute('data-tipo');
      var btn = card.querySelector('.btn-card');
      if (btn) {
        btn.addEventListener('click', function() { selecionarCabana(tipo); });
      }
    })(cards[i]);
  }

  // Barra de acoes do posicionamento
  var btnRot = document.getElementById('rotacionar-cabana');
  var btnConf = document.getElementById('confirmar-cabana');
  var btnCanc = document.getElementById('cancelar-cabana');
  if (btnRot) btnRot.addEventListener('click', rotacionarFantasma);
  if (btnConf) btnConf.addEventListener('click', confirmarConstrucao);
  if (btnCanc) btnCanc.addEventListener('click', cancelarConstrucao);
}

function entrarModoConstrucao() {
  if (modoConstrucao !== 'fechado') return;
  if (!claimAtual) {
    mostrarDica('Clame um terreno antes de construir', 2500);
    return;
  }
  modoConstrucao = 'menu';
  document.getElementById('painel-construcao').classList.remove('oculto');
  // Atualiza estado de "disponivel" dos cards (custo vs inventario)
  atualizarDisponibilidadeCards();
}

function atualizarDisponibilidadeCards() {
  var cards = document.querySelectorAll('.card-cabana');
  for (var i = 0; i < cards.length; i++) {
    var tipo = cards[i].getAttribute('data-tipo');
    var custo = CUSTOS_CABANA[tipo];
    var podeComprar = true;
    for (var t in custo) {
      if ((inventario[t] || 0) < custo[t]) { podeComprar = false; break; }
    }
    if (podeComprar) cards[i].classList.remove('indisponivel');
    else cards[i].classList.add('indisponivel');
  }
}

function selecionarCabana(tipo) {
  var custo = CUSTOS_CABANA[tipo];
  if (!custo) return;
  // Verifica se tem recursos (sem descontar ainda)
  for (var t in custo) {
    if ((inventario[t] || 0) < custo[t]) {
      mostrarDica('Recursos insuficientes', 2000);
      return;
    }
  }

  // Esconde painel
  document.getElementById('painel-construcao').classList.add('oculto');

  // Cria fantasma (semitransparente)
  cabanaTipoAtual = tipo;
  cabanaFantasma = FABRICAS_CABANA[tipo]();
  // Aplica transparencia em todos os meshes
  cabanaFantasma.traverse(function(obj) {
    if (obj.material) {
      obj.material = obj.material.clone();
      obj.material.transparent = true;
      obj.material.opacity = 0.55;
      obj.castShadow = false;
    }
  });
  cena.add(cabanaFantasma);

  // Mostra barra de acoes
  document.getElementById('barra-construcao').classList.remove('oculto');

  modoConstrucao = 'posicionando';
}

function atualizarConstrucao(delta) {
  if (modoConstrucao !== 'posicionando' || !cabanaFantasma) return;

  // Posiciona fantasma a frente do personagem (proporcional ao tamanho da cabana)
  var distAFrente = (cabanaFantasma.userData.raioColisao || 3) + 1.5;
  var dirX = -Math.sin(cameraYaw);
  var dirZ = -Math.cos(cameraYaw);
  var x = personagem.position.x + dirX * distAFrente;
  var z = personagem.position.z + dirZ * distAFrente;

  cabanaFantasma.position.set(x, 0, z);

  // Avalia validade da posicao
  var valido = posicaoValida(x, z, cabanaFantasma.userData.raioColisao);
  setCorFantasma(valido);
  cabanaFantasma.userData.posicaoValida = valido;
}

function posicaoValida(x, z, raio) {
  // Tem que estar dentro do claim
  if (!claimAtual) return false;
  var dx = x - claimAtual.x;
  var dz = z - claimAtual.z;
  var distClaim = Math.sqrt(dx * dx + dz * dz);
  if (distClaim + raio > claimAtual.raio - 0.5) return false;

  // Nao pode sobrepor outra cabana
  for (var i = 0; i < cabanasConstruidas.length; i++) {
    var c = cabanasConstruidas[i];
    var ddx = x - c.x;
    var ddz = z - c.z;
    var dd = Math.sqrt(ddx * ddx + ddz * ddz);
    if (dd < (raio + c.raioColisao + 1)) return false;
  }

  return true;
}

function setCorFantasma(valido) {
  cabanaFantasma.traverse(function(obj) {
    if (obj.material && obj.material.transparent) {
      var cor = valido ? 0xffffff : 0xff6655;
      if (obj.material.color) obj.material.color.setHex(cor);
    }
  });
}

function rotacionarFantasma() {
  if (modoConstrucao !== 'posicionando' || !cabanaFantasma) return;
  cabanaFantasma.rotation.y += Math.PI / 2;
  cabanaFantasma.userData.rotY = cabanaFantasma.rotation.y;
}

function confirmarConstrucao() {
  if (modoConstrucao !== 'posicionando' || !cabanaFantasma) return;
  if (!cabanaFantasma.userData.posicaoValida) {
    mostrarDica('Posição inválida — fora do terreno ou sobre outra cabana', 2500);
    return;
  }

  var custo = CUSTOS_CABANA[cabanaTipoAtual];
  if (!gastarRecursos(custo)) {
    mostrarDica('Recursos insuficientes', 2000);
    cancelarConstrucao();
    return;
  }

  // Materializa cabana definitiva (recria sem transparencia)
  var x = cabanaFantasma.position.x;
  var z = cabanaFantasma.position.z;
  var rotY = cabanaFantasma.rotation.y;
  var tipo = cabanaTipoAtual;

  cena.remove(cabanaFantasma);
  cabanaFantasma = null;

  var grupo = FABRICAS_CABANA[tipo]();
  grupo.position.set(x, 0, z);
  grupo.rotation.y = rotY;
  cena.add(grupo);

  cabanasConstruidas.push({
    tipo: tipo, x: x, z: z, rotY: rotY, mesh: grupo,
    raioColisao: grupo.userData.raioColisao
  });

  // Adiciona paredes da cabana como obstaculos (com abertura na porta)
  var paredes = obterColisaoCabana(tipo, x, z, rotY);
  for (var pi = 0; pi < paredes.length; pi++) paredesCabana.push(paredes[pi]);

  // Fumaca subindo da chamine (so cabana media e grande tem chamine)
  if (typeof adicionarFumacaPara === 'function') adicionarFumacaPara(grupo);

  salvarCabanas();
  fecharBarraConstrucao();
  modoConstrucao = 'fechado';
  cabanaTipoAtual = null;
  mostrarMensagem('Cabana ' + tipo + ' construída.', 3000);
}

function cancelarConstrucao() {
  if (cabanaFantasma) {
    cena.remove(cabanaFantasma);
    cabanaFantasma = null;
  }
  document.getElementById('painel-construcao').classList.add('oculto');
  fecharBarraConstrucao();
  modoConstrucao = 'fechado';
  cabanaTipoAtual = null;
}

function fecharBarraConstrucao() {
  var b = document.getElementById('barra-construcao');
  if (b) b.classList.add('oculto');
}
