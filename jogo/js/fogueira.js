// Fogueira: ilumina o entorno a noite, consome 1 madeira do inventario a cada 30s
// Quando inventario.madeira chega a 0, fogueiras se apagam (chama some, luz desliga)
var fogueirasConstruidas = [];
var ultimoConsumoFogueiraMs = 0;
var INTERVALO_CONSUMO_MS = 30000; // 30s — facilmente ajustavel
var CHAVE_FOGUEIRAS = 'paisdeminas-fogueiras';

function inicializarFogueiras() {
  ultimoConsumoFogueiraMs = performance.now();
  carregarFogueirasSalvas();
}

function carregarFogueirasSalvas() {
  try {
    var s = localStorage.getItem(CHAVE_FOGUEIRAS);
    if (!s) return;
    var lista = JSON.parse(s);
    if (!Array.isArray(lista)) return;
    for (var i = 0; i < lista.length; i++) {
      var item = lista[i];
      var grupo = criarFogueiraGrupo();
      grupo.position.set(item.x, 0, item.z);
      cena.add(grupo);

      var f = {
        x: item.x, z: item.z, mesh: grupo,
        ativa: item.ativa !== false,
        fase: Math.random() * 10
      };
      if (!f.ativa) apagarFogueiraVisual(f);

      fogueirasConstruidas.push(f);
      // Obstaculo redondo pequeno — personagem nao atravessa a fogueira
      arvoresPos.push({ x: item.x, z: item.z, raio: 0.7 });
    }
  } catch (e) {
    console.warn('Falha ao carregar fogueiras:', e);
  }
}

function salvarFogueiras() {
  var lista = fogueirasConstruidas.map(function(f) {
    return { x: f.x, z: f.z, ativa: f.ativa };
  });
  try { localStorage.setItem(CHAVE_FOGUEIRAS, JSON.stringify(lista)); } catch (e) {}
}

// Adiciona uma fogueira recem-construida ao tracking
function registrarFogueira(grupo, x, z) {
  fogueirasConstruidas.push({
    x: x, z: z, mesh: grupo, ativa: true, fase: Math.random() * 10
  });
  arvoresPos.push({ x: x, z: z, raio: 0.7 });
  salvarFogueiras();
}

function atualizarFogueiras(delta) {
  // Animacao da chama (todo frame)
  for (var i = 0; i < fogueirasConstruidas.length; i++) {
    var f = fogueirasConstruidas[i];
    if (!f.ativa) continue;
    f.fase += delta;
    var oscEsc = 0.85 + Math.sin(f.fase * 9) * 0.12 + Math.sin(f.fase * 14) * 0.05;
    var oscLuz = 1.2 + Math.sin(f.fase * 7) * 0.3 + Math.sin(f.fase * 11) * 0.15;
    if (f.mesh.userData.chama) {
      f.mesh.userData.chama.scale.set(oscEsc, oscEsc * 1.15, oscEsc);
    }
    if (f.mesh.userData.luz) {
      f.mesh.userData.luz.intensity = oscLuz;
    }
  }

  // Consumo de madeira a cada INTERVALO_CONSUMO_MS
  var agora = performance.now();
  if (agora - ultimoConsumoFogueiraMs > INTERVALO_CONSUMO_MS) {
    ultimoConsumoFogueiraMs = agora;
    var ativas = [];
    for (var j = 0; j < fogueirasConstruidas.length; j++) {
      if (fogueirasConstruidas[j].ativa) ativas.push(fogueirasConstruidas[j]);
    }
    if (ativas.length > 0) {
      var algumaApagou = false;
      for (var k = 0; k < ativas.length; k++) {
        if ((inventario.madeira || 0) >= 1) {
          inventario.madeira -= 1;
        } else {
          apagarFogueira(ativas[k]);
          algumaApagou = true;
        }
      }
      if (typeof atualizarHudInventario === 'function') atualizarHudInventario();
      if (typeof atualizarPilhas === 'function') atualizarPilhas();
      if (typeof salvarInventario === 'function') salvarInventario();
      if (algumaApagou) {
        salvarFogueiras();
        if (typeof mostrarDica === 'function') {
          mostrarDica('Acabou a madeira — fogueira apagou', 2500);
        }
      }
    }
  }
}

function apagarFogueira(f) {
  f.ativa = false;
  apagarFogueiraVisual(f);
}

function apagarFogueiraVisual(f) {
  if (f.mesh.userData.chama) f.mesh.userData.chama.visible = false;
  if (f.mesh.userData.luz) f.mesh.userData.luz.intensity = 0;
}

// Tenta acender uma fogueira apagada perto do ponto (px, pz). Custa 3 madeira.
// Retorna true se reacendeu (chamado por coleta.js — tecla E)
function tentarAcenderFogueiraProx(px, pz, raioInteracao) {
  var raio = raioInteracao || 2.8;
  var raio2 = raio * raio;
  var alvo = null;
  var menorDist = Infinity;

  for (var i = 0; i < fogueirasConstruidas.length; i++) {
    var f = fogueirasConstruidas[i];
    if (f.ativa) continue; // ja acesa
    var dx = px - f.x;
    var dz = pz - f.z;
    var d2 = dx * dx + dz * dz;
    if (d2 < menorDist && d2 < raio2) {
      menorDist = d2;
      alvo = f;
    }
  }
  if (!alvo) return false;

  // Tem madeira pra acender?
  if (!gastarRecursos({ madeira: 3 })) {
    if (typeof mostrarDica === 'function') mostrarDica('Precisa de 3 madeiras pra acender', 2000);
    return true; // intercepta a interacao mesmo sem ter madeira (nao tenta coletar arvore)
  }

  alvo.ativa = true;
  alvo.fase = Math.random() * 10;
  if (alvo.mesh.userData.chama) alvo.mesh.userData.chama.visible = true;
  // Reseta o cronometro de consumo pra essa fogueira nao ser cobrada imediatamente
  ultimoConsumoFogueiraMs = performance.now();
  salvarFogueiras();
  if (typeof mostrarDica === 'function') mostrarDica('Fogueira acesa', 1800);
  return true;
}
