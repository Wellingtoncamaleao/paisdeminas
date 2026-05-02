// Modo "Mover objetos": tecla M (PC) ou botão MOVER (mobile)
// Aproxima de cabana/fogueira sua → aperta M → vira fantasma seguindo o personagem
// Tecla R rotaciona 90° (cabana). Aperta M de novo solta + salva no servidor.

var modoMover = false;
var objMovendo = null; // { tipo: 'cabana'|'fogueira', ref, materiaisOrig: [...] }

function toggleMover() {
  if (objMovendo) {
    soltarObjeto();
  } else {
    selecionarObjetoMaisProx();
  }
}

function selecionarObjetoMaisProx() {
  if (!personagem) return;
  var px = personagem.position.x;
  var pz = personagem.position.z;
  var menorDist2 = Infinity;
  var melhor = null;
  var tipo = null;

  // Cabanas próprias (não dos outros)
  if (typeof cabanasConstruidas !== 'undefined') {
    for (var i = 0; i < cabanasConstruidas.length; i++) {
      var c = cabanasConstruidas[i];
      var dx = px - c.x, dz = pz - c.z;
      var d2 = dx * dx + dz * dz;
      var raioBusca = (c.raioColisao || 4) + 2;
      if (d2 < menorDist2 && d2 < raioBusca * raioBusca) {
        menorDist2 = d2; melhor = c; tipo = 'cabana';
      }
    }
  }

  // Fogueiras próprias (não dos outros)
  if (typeof fogueirasConstruidas !== 'undefined') {
    for (var j = 0; j < fogueirasConstruidas.length; j++) {
      var f = fogueirasConstruidas[j];
      if (f.deOutroJogador) continue;
      if (!f.id || typeof f.id === 'string') continue; // sem id real ainda
      var dx2 = px - f.x, dz2 = pz - f.z;
      var d22 = dx2 * dx2 + dz2 * dz2;
      if (d22 < menorDist2 && d22 < 9) { // raio 3
        menorDist2 = d22; melhor = f; tipo = 'fogueira';
      }
    }
  }

  if (!melhor) {
    if (typeof mostrarDica === 'function') {
      mostrarDica('Aproxime-se de uma cabana ou fogueira sua', 2500);
    }
    return;
  }

  // Aplica transparencia ao mesh (vira fantasma)
  var matsOrig = [];
  melhor.mesh.traverse(function(o) {
    if (o.material) {
      matsOrig.push({ obj: o, mat: o.material });
      o.material = o.material.clone();
      o.material.transparent = true;
      o.material.opacity = 0.55;
    }
  });

  // Pra cabana: remove paredes de colisão antigas (cabana fantasma não bloqueia jogador)
  if (tipo === 'cabana' && typeof removerParedesCabana === 'function') {
    removerParedesCabana(melhor.id);
  }

  objMovendo = { tipo: tipo, ref: melhor, materiaisOrig: matsOrig };
  modoMover = true;
  if (typeof mostrarDica === 'function') {
    mostrarDica('Movendo. R = rotacionar · M = soltar', 3500);
  }
}

function atualizarMover(delta) {
  if (!objMovendo) return;
  // Posiciona objeto a 4m à frente do personagem (na direção da câmera)
  var dist = (objMovendo.ref.raioColisao || 1.5) + 1.5;
  var dirX = -Math.sin(cameraYaw);
  var dirZ = -Math.cos(cameraYaw);
  var x = personagem.position.x + dirX * dist;
  var z = personagem.position.z + dirZ * dist;
  objMovendo.ref.mesh.position.x = x;
  objMovendo.ref.mesh.position.z = z;
}

function rotacionarObjMovendo() {
  if (!objMovendo) return;
  objMovendo.ref.mesh.rotation.y += Math.PI / 2;
}

async function soltarObjeto() {
  if (!objMovendo) return;
  var ref = objMovendo.ref;
  var x = ref.mesh.position.x;
  var z = ref.mesh.position.z;
  var rotY = ref.mesh.rotation.y;

  // Validação: dentro do claim
  if (typeof dentroDoClaim === 'function') {
    var raio = ref.raioColisao || 1;
    if (!dentroDoClaim(x, z, raio + 0.5)) {
      if (typeof mostrarDica === 'function') {
        mostrarDica('Não pode ficar fora do seu terreno', 2500);
      }
      return; // mantém modo mover ativo
    }
  }

  // Salva no servidor
  try {
    if (objMovendo.tipo === 'cabana') {
      await apiMoverCabana(ref.id, x, z, rotY);
      ref.x = x; ref.z = z; ref.rotY = rotY;
      // Re-adiciona paredes de colisão na nova posição
      if (typeof adicionarParedesCabana === 'function') {
        adicionarParedesCabana(ref.id, ref.tipo, x, z, rotY);
      }
    } else if (objMovendo.tipo === 'fogueira') {
      await apiMoverFogueira(ref.id, x, z);
      ref.x = x; ref.z = z;
      // Atualiza obstáculo redondo da fogueira em arvoresPos
      // (mais simples: deixa o obstáculo antigo, o jogador pode atravessar área antiga
      //  até reload — aceito tradeoff)
    }
  } catch (e) {
    if (typeof mostrarDica === 'function') {
      mostrarDica('Erro: ' + e.message, 3000);
    }
    return;
  }

  // Restaura materiais originais (sai do estado fantasma)
  for (var i = 0; i < objMovendo.materiaisOrig.length; i++) {
    var m = objMovendo.materiaisOrig[i];
    m.obj.material = m.mat;
  }

  if (typeof mostrarDica === 'function') mostrarDica('Solto', 1200);
  objMovendo = null;
  modoMover = false;
}

function cancelarMover() {
  if (!objMovendo) return;
  // Restaura posição/rotação originais
  var ref = objMovendo.ref;
  ref.mesh.position.set(ref.x, 0, ref.z);
  ref.mesh.rotation.y = ref.rotY || 0;
  // Restaura materiais
  for (var i = 0; i < objMovendo.materiaisOrig.length; i++) {
    var m = objMovendo.materiaisOrig[i];
    m.obj.material = m.mat;
  }
  // Re-adiciona paredes da cabana se foram removidas
  if (objMovendo.tipo === 'cabana' && typeof adicionarParedesCabana === 'function') {
    adicionarParedesCabana(ref.id, ref.tipo, ref.x, ref.z, ref.rotY || 0);
  }
  objMovendo = null;
  modoMover = false;
  if (typeof mostrarDica === 'function') mostrarDica('Cancelado', 1200);
}
