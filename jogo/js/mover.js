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

  // Pilha de madeira
  if (typeof pilhaMadeiraGrupo !== 'undefined' && pilhaMadeiraGrupo) {
    var dxPm = px - pilhaMadeiraGrupo.position.x, dzPm = pz - pilhaMadeiraGrupo.position.z;
    var d2Pm = dxPm * dxPm + dzPm * dzPm;
    if (d2Pm < menorDist2 && d2Pm < 9) {
      menorDist2 = d2Pm;
      melhor = { mesh: pilhaMadeiraGrupo, x: pilhaMadeiraGrupo.position.x, z: pilhaMadeiraGrupo.position.z, raioColisao: 1.2 };
      tipo = 'pilha-madeira';
    }
  }

  // Pilha de pedra
  if (typeof pilhaPedraGrupo !== 'undefined' && pilhaPedraGrupo) {
    var dxPp = px - pilhaPedraGrupo.position.x, dzPp = pz - pilhaPedraGrupo.position.z;
    var d2Pp = dxPp * dxPp + dzPp * dzPp;
    if (d2Pp < menorDist2 && d2Pp < 9) {
      menorDist2 = d2Pp;
      melhor = { mesh: pilhaPedraGrupo, x: pilhaPedraGrupo.position.x, z: pilhaPedraGrupo.position.z, raioColisao: 1.2 };
      tipo = 'pilha-pedra';
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
  // Acompanha relevo (Fase B): Y vem do terreno na pos atual
  if (typeof alturaEm === 'function') {
    objMovendo.ref.mesh.position.y = alturaEm(x, z);
  }
}

function rotacionarObjMovendo() {
  if (!objMovendo) return;
  objMovendo.ref.mesh.rotation.y += Math.PI / 4; // 45° por aperto (8 posições)
}

async function soltarObjeto() {
  if (!objMovendo) return;
  var ref = objMovendo.ref;
  var x = ref.mesh.position.x;
  var z = ref.mesh.position.z;
  var rotY = ref.mesh.rotation.y;

  // Validação: dentro do claim
  // Usa lado/2 (mais permissivo) em vez de raioColisao (diagonal — restritivo demais)
  if (typeof dentroDoClaim === 'function') {
    var meioLado = ref.mesh.userData.lado
      ? ref.mesh.userData.lado / 2
      : (ref.raioColisao || 1);
    if (!dentroDoClaim(x, z, meioLado + 0.3)) {
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
      if (typeof adicionarParedesCabana === 'function') {
        adicionarParedesCabana(ref.id, ref.tipo, x, z, rotY);
      }
    } else if (objMovendo.tipo === 'fogueira') {
      await apiMoverFogueira(ref.id, x, z);
      ref.x = x; ref.z = z;
    } else if (objMovendo.tipo === 'pilha-madeira' || objMovendo.tipo === 'pilha-pedra') {
      var tipoPilha = objMovendo.tipo === 'pilha-madeira' ? 'madeira' : 'pedra';
      var offX = x - claimAtual.x;
      var offZ = z - claimAtual.z;
      var rotPilha = ref.mesh.rotation.y;
      await apiSalvarOffsetPilha(tipoPilha, offX, offZ, rotPilha);
      // Atualiza claimAtual local pra refletir (proxima atualizarPilhas usa esses valores)
      if (tipoPilha === 'madeira') {
        claimAtual.pilhaMadOffX = offX; claimAtual.pilhaMadOffZ = offZ;
        claimAtual.pilhaMadRot = rotPilha;
      } else {
        claimAtual.pilhaPedOffX = offX; claimAtual.pilhaPedOffZ = offZ;
        claimAtual.pilhaPedRot = rotPilha;
      }
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
