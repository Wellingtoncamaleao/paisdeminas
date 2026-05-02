// Outros jogadores: polling do servidor a cada ~3s pra mostrar
// avatares, claims, cabanas e fogueiras dos OUTROS players visualmente.
// Avatares fazem smooth interpolation entre updates (movimento fluido).

var INTERVALO_POLL_OUTROS_MS = 3000;
var ultimoPollOutros = 0;
var pollEmAndamento = false;

// Estado renderizado (refs pra reuso/cleanup)
var avataresOutros = {};   // player_id -> { mesh, alvoPos:Vector3, alvoRotY }
var claimsOutros = {};     // claim_id -> { mesh: Group }
var cabanasOutros = {};    // cabana_id -> { mesh: Group }
var fogueirasOutros = {};  // fogueira_id -> { mesh: Group, ativa: bool }

function inicializarOutrosJogadores() {
  // Primeiro poll imediato
  setTimeout(pollOutros, 800);
}

function atualizarOutrosJogadores(delta) {
  if (!window.session) return;
  var agora = performance.now();
  if (agora - ultimoPollOutros > INTERVALO_POLL_OUTROS_MS && !pollEmAndamento) {
    pollOutros();
  }

  // Smooth interpolation + bobbing dos avatares
  var k = Math.min(delta * 6, 1);
  for (var id in avataresOutros) {
    var av = avataresOutros[id];

    // Distancia ao alvo XZ — pra saber se ta movendo (decide bobbing)
    var dxA = av.alvoPos.x - av.mesh.position.x;
    var dzA = av.alvoPos.z - av.mesh.position.z;
    var distQuad = dxA * dxA + dzA * dzA;
    var movendo = distQuad > 0.04; // > 0.2m de diferenca

    // Lerp X e Z separadamente (Y eh controlado pelo bobbing)
    av.mesh.position.x += dxA * k;
    av.mesh.position.z += dzA * k;

    // Rotacao suave em Y
    var diff = av.alvoRotY - av.mesh.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    av.mesh.rotation.y += diff * Math.min(delta * 6, 1);

    // Bobbing: oscilacao vertical leve quando andando
    if (movendo) {
      av.fasePasso = (av.fasePasso || 0) + delta * 9;
      av.mesh.position.y = Math.abs(Math.sin(av.fasePasso)) * 0.07;
    } else {
      av.mesh.position.y *= 0.85;
      if (av.mesh.position.y < 0.001) av.mesh.position.y = 0;
      av.fasePasso = 0;
    }
  }
}

function pollOutros() {
  pollEmAndamento = true;
  ultimoPollOutros = performance.now();
  apiOutrosPlayers().then(function(dados) {
    sincronizarOutros(dados);
  }).catch(function(e) {
    // Silencioso — sem internet nao quebra jogo
  }).finally(function() {
    pollEmAndamento = false;
  });
}

function sincronizarOutros(dados) {
  sincronizarAvatares(dados.jogadores || []);
  sincronizarClaims(dados.claims || []);
  sincronizarCabanas(dados.cabanas || []);
  sincronizarFogueiras(dados.fogueiras || []);
}

// === AVATARES (player movendo) ===
function sincronizarAvatares(lista) {
  var idsAtuais = {};
  for (var i = 0; i < lista.length; i++) {
    var j = lista[i];
    idsAtuais[j.id] = true;
    if (avataresOutros[j.id]) {
      avataresOutros[j.id].alvoPos.set(j.x, 0, j.z);
      avataresOutros[j.id].alvoRotY = j.rotY;
    } else {
      var mesh = criarAvatarOutroJogador(j.cor_camisa, j.nome);
      mesh.position.set(j.x, 0, j.z);
      mesh.rotation.y = j.rotY;
      cena.add(mesh);
      avataresOutros[j.id] = {
        mesh: mesh,
        alvoPos: new THREE.Vector3(j.x, 0, j.z),
        alvoRotY: j.rotY
      };
    }
  }
  // Remove avatares de quem saiu (offline > 60s)
  for (var id in avataresOutros) {
    if (!idsAtuais[id]) {
      cena.remove(avataresOutros[id].mesh);
      delete avataresOutros[id];
    }
  }
}

// === CLAIMS DOS OUTROS ===
function sincronizarClaims(lista) {
  var idsAtuais = {};
  for (var i = 0; i < lista.length; i++) {
    var c = lista[i];
    idsAtuais[c.id] = true;
    if (!claimsOutros[c.id]) {
      var mesh = criarCercaSimplesParaOutro(c.x, c.z, c.larg, c.prof, c.rotY);
      cena.add(mesh);
      claimsOutros[c.id] = { mesh: mesh };

      // Limpa vegetacao dentro do claim de outros (na primeira vez que vemos)
      if (typeof limparVegetacaoRetanguloRotacionado === 'function') {
        limparVegetacaoRetanguloRotacionado(c.x, c.z, c.larg - 1, c.prof - 1, c.rotY);
      }
    }
  }
  for (var idC in claimsOutros) {
    if (!idsAtuais[idC]) {
      cena.remove(claimsOutros[idC].mesh);
      delete claimsOutros[idC];
    }
  }
}

// === CABANAS DOS OUTROS ===
function sincronizarCabanas(lista) {
  var idsAtuais = {};
  for (var i = 0; i < lista.length; i++) {
    var cb = lista[i];
    idsAtuais[cb.id] = true;
    if (!cabanasOutros[cb.id]) {
      var fab = FABRICAS_CABANA[cb.tipo];
      if (!fab) continue;
      var grupo = fab();
      grupo.position.set(cb.x, 0, cb.z);
      grupo.rotation.y = cb.rotY;
      cena.add(grupo);
      cabanasOutros[cb.id] = { mesh: grupo, x: cb.x, z: cb.z, rotY: cb.rotY, tipo: cb.tipo };

      // Adiciona paredes como obstaculos (jogador nao atravessa cabana de outro)
      if (typeof obterColisaoCabana === 'function' && typeof paredesCabana !== 'undefined') {
        var paredes = obterColisaoCabana(cb.tipo, cb.x, cb.z, cb.rotY);
        for (var pj = 0; pj < paredes.length; pj++) paredesCabana.push(paredes[pj]);
      }
    }
  }
  for (var idCb in cabanasOutros) {
    if (!idsAtuais[idCb]) {
      cena.remove(cabanasOutros[idCb].mesh);
      delete cabanasOutros[idCb];
      // (Não removemos paredes da colisão — ficaria mais complexo. Cabanas raramente somem.)
    }
  }
}

// === FOGUEIRAS DOS OUTROS ===
function sincronizarFogueiras(lista) {
  var idsAtuais = {};
  for (var i = 0; i < lista.length; i++) {
    var f = lista[i];
    idsAtuais[f.id] = true;
    if (!fogueirasOutros[f.id]) {
      var grupo = criarFogueiraGrupo();
      grupo.position.set(f.x, 0, f.z);
      cena.add(grupo);
      fogueirasOutros[f.id] = { mesh: grupo, ativa: f.ativa };
      // Anima — joga no array global pra atualizarFogueiras animar a chama
      if (typeof fogueirasConstruidas !== 'undefined') {
        fogueirasConstruidas.push({
          id: 'outro-' + f.id,  // prefixo pra nao confundir com proprio
          x: f.x, z: f.z, mesh: grupo, ativa: f.ativa, fase: Math.random() * 10,
          deOutroJogador: true
        });
      }
      if (!f.ativa) {
        if (grupo.userData.chama) grupo.userData.chama.visible = false;
        if (grupo.userData.luz) grupo.userData.luz.intensity = 0;
      }
    } else {
      // Atualiza estado de ativa/apagada se mudou
      var ref = fogueirasOutros[f.id];
      if (ref.ativa !== f.ativa) {
        ref.ativa = f.ativa;
        // Atualiza tambem no array animado
        if (typeof fogueirasConstruidas !== 'undefined') {
          for (var j = 0; j < fogueirasConstruidas.length; j++) {
            if (fogueirasConstruidas[j].id === 'outro-' + f.id) {
              fogueirasConstruidas[j].ativa = f.ativa;
              if (!f.ativa) {
                if (ref.mesh.userData.chama) ref.mesh.userData.chama.visible = false;
                if (ref.mesh.userData.luz) ref.mesh.userData.luz.intensity = 0;
              } else {
                if (ref.mesh.userData.chama) ref.mesh.userData.chama.visible = true;
              }
              break;
            }
          }
        }
      }
    }
  }
  for (var idF in fogueirasOutros) {
    if (!idsAtuais[idF]) {
      cena.remove(fogueirasOutros[idF].mesh);
      delete fogueirasOutros[idF];
      if (typeof fogueirasConstruidas !== 'undefined') {
        for (var k = fogueirasConstruidas.length - 1; k >= 0; k--) {
          if (fogueirasConstruidas[k].id === 'outro-' + idF) fogueirasConstruidas.splice(k, 1);
        }
      }
    }
  }
}

// Avatar humanoide completo pra outros jogadores — mesma estrutura do
// personagem proprio, mas sem animacao de membros (bobbing apenas).
// Cor de camisa unica por player (hash do nome).
function criarAvatarOutroJogador(corCamisa, nome) {
  var grupo = new THREE.Group();
  var corCamisaHex = corHslParaHex(corCamisa) || 0x7a4a26;

  // Tronco (camisa)
  var tronco = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.28, 0.55, 4, 8),
    new THREE.MeshLambertMaterial({ color: corCamisaHex })
  );
  tronco.position.y = 1.05;
  tronco.castShadow = true;
  grupo.add(tronco);

  // Cabeca
  var cabeca = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0xd49060 })
  );
  cabeca.position.y = 1.62;
  cabeca.castShadow = true;
  grupo.add(cabeca);

  // Cabelo (hemisferio escuro embaixo do chapeu)
  var cabeloGeo = new THREE.SphereGeometry(0.235, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  var cabelo = new THREE.Mesh(cabeloGeo, new THREE.MeshLambertMaterial({ color: 0x2a1810 }));
  cabelo.position.y = 1.66;
  cabelo.scale.y = 0.7;
  cabelo.castShadow = true;
  grupo.add(cabelo);

  // Chapeu (cone + aba)
  var chap = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.18, 12),
    new THREE.MeshLambertMaterial({ color: 0xc8a060 })
  );
  chap.position.y = 1.85;
  chap.castShadow = true;
  grupo.add(chap);
  var aba = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 0.04, 16),
    new THREE.MeshLambertMaterial({ color: 0xc8a060 })
  );
  aba.position.y = 1.78;
  aba.castShadow = true;
  grupo.add(aba);

  // Cinto + fivela
  var cinto = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 0.1, 16),
    new THREE.MeshLambertMaterial({ color: 0x4a2812 })
  );
  cinto.position.y = 0.88;
  grupo.add(cinto);
  var fivela = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, 0.04),
    new THREE.MeshLambertMaterial({ color: 0xa68040 })
  );
  fivela.position.set(0, 0.88, 0.32);
  grupo.add(fivela);

  // Duas pernas (cilindros separados)
  var calcaMat = new THREE.MeshLambertMaterial({ color: 0x3d2812 });
  var pernaGeo = new THREE.CylinderGeometry(0.09, 0.07, 0.65, 6);
  var pernaE = new THREE.Mesh(pernaGeo, calcaMat);
  pernaE.position.set(0.13, 0.35, 0);
  pernaE.castShadow = true;
  grupo.add(pernaE);
  var pernaD = new THREE.Mesh(pernaGeo, calcaMat);
  pernaD.position.set(-0.13, 0.35, 0);
  pernaD.castShadow = true;
  grupo.add(pernaD);

  // Sandalias (boxes achatadas)
  var sandMat = new THREE.MeshLambertMaterial({ color: 0x6a3818 });
  var sandGeo = new THREE.BoxGeometry(0.2, 0.05, 0.27);
  var sandE = new THREE.Mesh(sandGeo, sandMat);
  sandE.position.set(0.13, 0.025, 0.05);
  sandE.castShadow = true;
  grupo.add(sandE);
  var sandD = new THREE.Mesh(sandGeo, sandMat);
  sandD.position.set(-0.13, 0.025, 0.05);
  sandD.castShadow = true;
  grupo.add(sandD);

  return grupo;
}

// Converte 'hsl(120, 50%, 35%)' (string) pra hex (0xRRGGBB)
function corHslParaHex(hsl) {
  if (!hsl) return null;
  var m = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!m) return null;
  var h = +m[1] / 360;
  var s = +m[2] / 100;
  var l = +m[3] / 100;
  var c = (1 - Math.abs(2 * l - 1)) * s;
  var x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  var mm = l - c / 2;
  var r = 0, g = 0, b = 0;
  if (h < 1 / 6)      { r = c; g = x; }
  else if (h < 2 / 6) { r = x; g = c; }
  else if (h < 3 / 6) { g = c; b = x; }
  else if (h < 4 / 6) { g = x; b = c; }
  else if (h < 5 / 6) { r = x; b = c; }
  else                { r = c; b = x; }
  return ((Math.round((r + mm) * 255) << 16) | (Math.round((g + mm) * 255) << 8) | Math.round((b + mm) * 255));
}

// === Cerca simplificada (4 estacas, sem cordinha) pra claim de OUTRO jogador ===
function criarCercaSimplesParaOutro(x, z, larg, prof, rotY) {
  var grupo = new THREE.Group();
  var matEstaca = new THREE.MeshLambertMaterial({ color: 0x4a2812 });
  var alturaEstaca = 1.8;
  var raioEstaca = 0.10;
  var halfL = larg / 2, halfP = prof / 2;
  var cantos = [
    { x:  halfL, z:  halfP }, { x: -halfL, z:  halfP },
    { x: -halfL, z: -halfP }, { x:  halfL, z: -halfP }
  ];
  var cosR = Math.cos(rotY || 0);
  var sinR = Math.sin(rotY || 0);
  var estacaGeo = new THREE.CylinderGeometry(raioEstaca, raioEstaca * 1.2, alturaEstaca, 8);
  for (var i = 0; i < cantos.length; i++) {
    var c = cantos[i];
    var ex = x + c.x * cosR - c.z * sinR;
    var ez = z + c.x * sinR + c.z * cosR;
    var e = new THREE.Mesh(estacaGeo, matEstaca);
    e.position.set(ex, alturaEstaca / 2, ez);
    e.castShadow = true;
    grupo.add(e);
  }
  return grupo;
}
