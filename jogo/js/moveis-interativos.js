// Móveis interativos: tecla E perto deles dispara ação (dormir na cama, etc.)
// Por enquanto: cama (dorme até amanhecer). Baú e outros vêm em iterações futuras.

var dormindo = false;

function tentarInteragirMovel(px, pz, raioInteracao) {
  if (typeof cabanasConstruidas === 'undefined') return false;
  var raio2 = (raioInteracao || 1.8) * (raioInteracao || 1.8);

  for (var i = 0; i < cabanasConstruidas.length; i++) {
    var c = cabanasConstruidas[i];
    if (!c.mesh || !c.mesh.userData.moveis) continue;
    var moveis = c.mesh.userData.moveis;
    var cosR = Math.cos(c.rotY || 0);
    var sinR = Math.sin(c.rotY || 0);

    for (var nome in moveis) {
      var m = moveis[nome];
      // Posicao absoluta do movel = cabana.position + (movel local rotacionado)
      var absX = c.x + m.x * cosR - m.z * sinR;
      var absZ = c.z + m.x * sinR + m.z * cosR;
      var dx = px - absX;
      var dz = pz - absZ;
      if (dx * dx + dz * dz < raio2) {
        if (nome === 'cama') {
          dormirNaCama();
          return true;
        }
        // Outros móveis em futuras iterações (baú, mesa, etc)
      }
    }
  }
  return false;
}

function dormirNaCama() {
  if (dormindo) return;
  dormindo = true;

  // Bloqueia inputs durante o sono pra evitar spam
  var overlay = document.getElementById('overlay-fade');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'overlay-fade';
    document.body.appendChild(overlay);
  }
  overlay.classList.add('escuro');

  // Espera o fade preto cobrir tudo, então avança o tempo
  setTimeout(function() {
    if (typeof tempoAtual !== 'undefined') {
      // Pula pra 06:30 — manhã segura
      tempoAtual = 0.27;
      if (typeof aplicarTempoNoMundo === 'function') aplicarTempoNoMundo(tempoAtual);
      if (typeof atualizarEstrelas === 'function') atualizarEstrelas(tempoAtual);
      if (typeof atualizarRelogioHud === 'function') atualizarRelogioHud();
      // Salva
      try { localStorage.setItem('paisdeminas-tempo', String(tempoAtual)); } catch (e) {}
    }

    // Aguarda mais um pouco com a tela preta pra ter sensação de "passou tempo"
    setTimeout(function() {
      overlay.classList.remove('escuro');
      if (typeof mostrarMensagem === 'function') {
        mostrarMensagem('Você dormiu até o amanhecer.', 4000);
      }
      dormindo = false;
    }, 700);
  }, 1400);
}
