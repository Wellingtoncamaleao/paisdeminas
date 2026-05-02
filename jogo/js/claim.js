// Claim de terreno: tecla C cria cerca de madeira ao redor do jogador, salva em localStorage
var claimAtual = null;
var cercaGrupo = null;
var CHAVE_CLAIM = 'paisdeminas-claim';

function inicializarClaim() {
  try {
    var salvo = localStorage.getItem(CHAVE_CLAIM);
    if (salvo) {
      claimAtual = JSON.parse(salvo);
      construirCercaVisual(claimAtual.x, claimAtual.z, claimAtual.raio);
      // Limpa vegetacao residual do claim ao recarregar (caso fix seja novo)
      if (typeof limparVegetacaoCirculo === 'function') {
        limparVegetacaoCirculo(claimAtual.x, claimAtual.z, claimAtual.raio - 0.5);
      }
    }
  } catch (e) {
    console.warn('Falha ao ler claim:', e);
  }
}

function tentarClaim() {
  if (claimAtual) {
    mostrarDica('Voce ja tem um terreno', 2500);
    return;
  }

  var px = personagem.position.x;
  var pz = personagem.position.z;

  // Nao deixa clamar em cima da trilha
  if (distanciaAteTrilha(px, pz) < 5) {
    mostrarDica('Saia da trilha para clamar terreno', 2500);
    return;
  }

  var raio = 12;
  claimAtual = { x: px, z: pz, raio: raio, t: Date.now() };

  try {
    localStorage.setItem(CHAVE_CLAIM, JSON.stringify(claimAtual));
  } catch (e) {
    console.warn('Falha ao salvar claim:', e);
  }

  construirCercaVisual(px, pz, raio);
  // Limpa arvores e pedras dentro do claim (terra agora pertence ao jogador)
  if (typeof limparVegetacaoCirculo === 'function') {
    limparVegetacaoCirculo(px, pz, raio - 0.5);
  }
  // Cria pilhas vazias agora — se ja tem inventario, materializa
  if (typeof atualizarPilhas === 'function') atualizarPilhas();
  mostrarMensagem('Esta terra é sua. Colete madeira e pedra para construir.', 5500);
}

function construirCercaVisual(x, z, raio) {
  if (cercaGrupo) cena.remove(cercaGrupo);
  cercaGrupo = new THREE.Group();

  var nEstacas = 16;
  var matMadeira = new THREE.MeshLambertMaterial({ color: 0x6b4423 });
  var estacaGeo = new THREE.CylinderGeometry(0.09, 0.11, 1.4, 6);

  for (var i = 0; i < nEstacas; i++) {
    var ang = (i / nEstacas) * Math.PI * 2;
    var ex = x + Math.cos(ang) * raio;
    var ez = z + Math.sin(ang) * raio;

    // Estaca vertical
    var estaca = new THREE.Mesh(estacaGeo, matMadeira);
    estaca.position.set(ex, 0.7, ez);
    estaca.castShadow = true;
    cercaGrupo.add(estaca);

    // Trava horizontal entre essa estaca e a proxima
    var nextAng = ((i + 1) / nEstacas) * Math.PI * 2;
    var nx = x + Math.cos(nextAng) * raio;
    var nz = z + Math.sin(nextAng) * raio;
    var dx = nx - ex;
    var dz = nz - ez;
    var len = Math.sqrt(dx * dx + dz * dz);

    var travaGeo = new THREE.BoxGeometry(len, 0.08, 0.08);
    var trava = new THREE.Mesh(travaGeo, matMadeira);
    trava.position.set((ex + nx) / 2, 0.95, (ez + nz) / 2);
    trava.rotation.y = -Math.atan2(dz, dx);
    trava.castShadow = true;
    cercaGrupo.add(trava);
  }

  cena.add(cercaGrupo);
}
