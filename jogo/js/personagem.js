// Personagem: humanoide composto de primitivas (cabeca, tronco, bracos, pernas)
// Visual de "colono 1500": camisa marrom, calca marrom escura, chapeu de palha, barba
// Animacao rica: cotovelos e joelhos articulados, swing natural de membros,
// inclinacao do tronco ao correr, respiracao leve no idle.
var personagem;

// Paleta global do colono
var CORES_COLONO = {
  pele: 0xd49060,
  camisa: 0x7a4a26,
  calca: 0x3d2812,
  chapeu: 0xc8a060,
  barba: 0x3a2010,
  bota: 0x2a1808,
  cabelo: 0x2a1810,
  cinto: 0x4a2812,
  sandalia: 0x6a3818,
  manga: 0x5a3818
};

function iniciarPersonagem() {
  personagem = criarCorpoColono(CORES_COLONO.camisa);
  personagem.position.set(-160, 0, -160);
  personagem.rotation.y = Math.PI / 4;
  cena.add(personagem);
}

// Factory reutilizavel: cria humanoide colono com membros articulados.
// Recebe cor da camisa (usada pra diferenciar players via hash do nome).
// Retorna grupo com userData expondo refs pras animacoes.
function criarCorpoColono(corCamisa) {
  var grupo = new THREE.Group();
  var corpoGrupo = new THREE.Group(); // bobbing/inclinacao/respiracao
  grupo.add(corpoGrupo);

  var corPele = CORES_COLONO.pele;
  var corCalca = CORES_COLONO.calca;
  var corChapeu = CORES_COLONO.chapeu;
  var corBarba = CORES_COLONO.barba;
  var corCabelo = CORES_COLONO.cabelo;
  var corCinto = CORES_COLONO.cinto;

  // Tronco — capsule
  var tronco = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.28, 0.55, 4, 8),
    new THREE.MeshLambertMaterial({ color: corCamisa })
  );
  tronco.position.y = 1.05;
  tronco.castShadow = true;
  corpoGrupo.add(tronco);

  // Cabeca
  var cabeca = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 10),
    new THREE.MeshLambertMaterial({ color: corPele })
  );
  cabeca.position.y = 1.62;
  cabeca.castShadow = true;
  corpoGrupo.add(cabeca);

  // Cabelo (hemisferio escuro embaixo do chapeu)
  var cabelo = new THREE.Mesh(
    new THREE.SphereGeometry(0.235, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: corCabelo })
  );
  cabelo.position.y = 1.66;
  cabelo.scale.y = 0.7;
  cabelo.castShadow = true;
  corpoGrupo.add(cabelo);

  // Barba farta — esfera achatada cobrindo queixo e bochechas (estilo Pixar)
  var matBarba = new THREE.MeshLambertMaterial({ color: corBarba });
  var barba = new THREE.Mesh(new THREE.SphereGeometry(0.20, 14, 10), matBarba);
  barba.position.set(0, 1.51, 0.07);
  barba.scale.set(1.05, 0.95, 0.65);
  corpoGrupo.add(barba);

  // Bigode — box maior pretinho acima da barba
  var bigode = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.035, 0.05),
    matBarba
  );
  bigode.position.set(0, 1.595, 0.218);
  corpoGrupo.add(bigode);

  // Olhos — esferinhas pretas projetadas (z fora da esfera)
  var matOlho = new THREE.MeshLambertMaterial({ color: 0x1a0d05 });
  var olhoGeo = new THREE.SphereGeometry(0.032, 8, 6);
  var olhoEsq = new THREE.Mesh(olhoGeo, matOlho);
  olhoEsq.position.set(0.075, 1.66, 0.215);
  corpoGrupo.add(olhoEsq);
  var olhoDir = new THREE.Mesh(olhoGeo, matOlho);
  olhoDir.position.set(-0.075, 1.66, 0.215);
  corpoGrupo.add(olhoDir);

  // Sobrancelhas grossas
  var sobrGeo = new THREE.BoxGeometry(0.085, 0.022, 0.04);
  var sobrEsq = new THREE.Mesh(sobrGeo, matBarba);
  sobrEsq.position.set(0.078, 1.71, 0.21);
  sobrEsq.rotation.z = -0.18;
  corpoGrupo.add(sobrEsq);
  var sobrDir = new THREE.Mesh(sobrGeo, matBarba);
  sobrDir.position.set(-0.078, 1.71, 0.21);
  sobrDir.rotation.z = 0.18;
  corpoGrupo.add(sobrDir);

  // Nariz — esfera arredondada projetada (estilo Pixar)
  var nariz = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xc07850 })
  );
  nariz.position.set(0, 1.628, 0.248);
  nariz.scale.set(0.85, 0.95, 1.1);
  corpoGrupo.add(nariz);

  // Chapeu (cone + aba)
  var chapeuMat = new THREE.MeshLambertMaterial({ color: corChapeu });
  var chapeuTopo = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.18, 12), chapeuMat);
  chapeuTopo.position.y = 1.85;
  chapeuTopo.castShadow = true;
  corpoGrupo.add(chapeuTopo);
  var aba = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 16), chapeuMat);
  aba.position.y = 1.78;
  aba.castShadow = true;
  corpoGrupo.add(aba);

  // Cinto + fivela
  var cinto = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 0.1, 16),
    new THREE.MeshLambertMaterial({ color: corCinto })
  );
  cinto.position.y = 0.88;
  cinto.castShadow = true;
  corpoGrupo.add(cinto);
  var fivela = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, 0.04),
    new THREE.MeshLambertMaterial({ color: 0xa68040 })
  );
  fivela.position.set(0, 0.88, 0.32);
  corpoGrupo.add(fivela);

  // Bracos articulados (ombro -> cotovelo -> mao)
  var bracoEsq = criarBracoArticulado(corCamisa);
  bracoEsq.position.set(0.32, 1.32, 0);
  corpoGrupo.add(bracoEsq);
  var bracoDir = criarBracoArticulado(corCamisa);
  bracoDir.position.set(-0.32, 1.32, 0);
  corpoGrupo.add(bracoDir);

  // Pernas articuladas (quadril -> joelho -> sandalia)
  var pernaEsq = criarPernaArticulada();
  pernaEsq.position.set(0.13, 0.7, 0);
  corpoGrupo.add(pernaEsq);
  var pernaDir = criarPernaArticulada();
  pernaDir.position.set(-0.13, 0.7, 0);
  corpoGrupo.add(pernaDir);

  // Pose idle inicial (cotovelos levemente dobrados — postura humana relaxada)
  bracoEsq.userData.cotovelo.rotation.x = -0.15;
  bracoDir.userData.cotovelo.rotation.x = -0.15;

  grupo.userData = {
    corpoGrupo: corpoGrupo,
    bracoEsq: bracoEsq, bracoDir: bracoDir,
    pernaEsq: pernaEsq, pernaDir: pernaDir,
    cotoveloEsq: bracoEsq.userData.cotovelo,
    cotoveloDir: bracoDir.userData.cotovelo,
    joelhoEsq: pernaEsq.userData.joelho,
    joelhoDir: pernaDir.userData.joelho,
    fasePasso: 0,
    faseRespiracao: Math.random() * Math.PI * 2
  };

  return grupo;
}

// Braco em 2 segmentos: upper (camisa) + lower (pele) com cotovelo articulado.
// Pivot no ombro (raiz do grupo). Cotovelo eh subgrupo no fim do upper.
function criarBracoArticulado(corCamisa) {
  var L1 = 0.30, L2 = 0.25; // upper, lower
  var raio = 0.06;
  var grupo = new THREE.Group();

  var matCamisa = new THREE.MeshLambertMaterial({ color: corCamisa });
  var matPele = new THREE.MeshLambertMaterial({ color: CORES_COLONO.pele });
  var matManga = new THREE.MeshLambertMaterial({ color: CORES_COLONO.manga });

  // Upper arm (camisa)
  var upper = new THREE.Mesh(
    new THREE.CylinderGeometry(raio, raio * 0.92, L1, 6),
    matCamisa
  );
  upper.position.y = -L1 / 2;
  upper.castShadow = true;
  grupo.add(upper);

  // Manga (anel mais escuro perto do ombro)
  var manga = new THREE.Mesh(
    new THREE.CylinderGeometry(raio * 1.1, raio * 1.1, raio * 0.6, 8),
    matManga
  );
  manga.position.y = -raio * 0.4;
  manga.castShadow = true;
  grupo.add(manga);

  // Cotovelo (group pivot no fim do upper arm)
  var cotovelo = new THREE.Group();
  cotovelo.position.y = -L1;
  grupo.add(cotovelo);

  // Lower arm (pele — antebraco descoberto)
  var lower = new THREE.Mesh(
    new THREE.CylinderGeometry(raio * 0.9, raio * 0.75, L2, 6),
    matPele
  );
  lower.position.y = -L2 / 2;
  lower.castShadow = true;
  cotovelo.add(lower);

  // Mao (esfera)
  var mao = new THREE.Mesh(
    new THREE.SphereGeometry(raio * 1.1, 8, 6),
    matPele
  );
  mao.position.y = -L2;
  mao.castShadow = true;
  cotovelo.add(mao);

  grupo.userData = { cotovelo: cotovelo };
  return grupo;
}

// Perna em 2 segmentos: coxa + canela com joelho articulado. Sandalia pendurada
// do joelho pra simplificar (pivot no quadril).
function criarPernaArticulada() {
  var L1 = 0.35, L2 = 0.30; // coxa, canela
  var raio = 0.09;
  var grupo = new THREE.Group();

  var matCalca = new THREE.MeshLambertMaterial({ color: CORES_COLONO.calca });
  var matBota = new THREE.MeshLambertMaterial({ color: CORES_COLONO.bota });
  var matSandalia = new THREE.MeshLambertMaterial({ color: CORES_COLONO.sandalia });

  // Coxa
  var coxa = new THREE.Mesh(
    new THREE.CylinderGeometry(raio, raio * 0.9, L1, 6),
    matCalca
  );
  coxa.position.y = -L1 / 2;
  coxa.castShadow = true;
  grupo.add(coxa);

  // Joelho (group pivot)
  var joelho = new THREE.Group();
  joelho.position.y = -L1;
  grupo.add(joelho);

  // Canela
  var canela = new THREE.Mesh(
    new THREE.CylinderGeometry(raio * 0.9, raio * 0.85, L2, 6),
    matCalca
  );
  canela.position.y = -L2 / 2;
  canela.castShadow = true;
  joelho.add(canela);

  // Sandalia — solinho achatado + faixa de couro por cima
  var sandaliaSol = new THREE.Mesh(
    new THREE.BoxGeometry(raio * 2.2, raio * 0.5, raio * 3.0),
    matSandalia
  );
  sandaliaSol.position.set(0, -L2 - raio * 0.25, raio * 0.6);
  sandaliaSol.castShadow = true;
  joelho.add(sandaliaSol);
  var faixa = new THREE.Mesh(
    new THREE.BoxGeometry(raio * 2.0, raio * 0.7, raio * 0.6),
    matBota
  );
  faixa.position.set(0, -L2 + raio * 0.2, raio * 0.4);
  faixa.castShadow = true;
  joelho.add(faixa);

  grupo.userData = { joelho: joelho };
  return grupo;
}

// Cinematica reutilizavel pra colonos (player + outros). Aplica swing
// natural com cotovelos/joelhos dobrando, bobbing, inclinacao e respiracao.
// estado: { andando, correndo, delta }
function animarColono(grupo, estado) {
  var u = grupo.userData;
  if (!u || !u.corpoGrupo) return;
  var delta = estado.delta;

  if (estado.andando) {
    var velFase = estado.correndo ? 13 : 8.5;
    u.fasePasso += delta * velFase;

    var ampQuadril = estado.correndo ? 0.85 : 0.55;
    var ampOmbro = estado.correndo ? 0.70 : 0.45;
    var ampJoelho = estado.correndo ? 1.4 : 0.9;
    var ampCotovelo = estado.correndo ? 1.1 : 0.7;

    var swing = Math.sin(u.fasePasso);

    // Bobbing vertical
    u.corpoGrupo.position.y = Math.abs(swing) * (estado.correndo ? 0.09 : 0.06);

    // Inclinacao do tronco pra frente (mais inclinado correndo)
    var inclinacaoAlvo = estado.correndo ? 0.22 : 0.07;
    u.corpoGrupo.rotation.x += (inclinacaoAlvo - u.corpoGrupo.rotation.x) * 0.15;

    // Pernas (lados em contra-fase)
    u.pernaEsq.rotation.x = -swing * ampQuadril;
    u.pernaDir.rotation.x =  swing * ampQuadril;

    // Joelhos dobram quando perna vai pra tras (saindo do chao -> swing aereo)
    // pernaEsq vai pra tras quando -swing<0 -> swing>0
    u.joelhoEsq.rotation.x = Math.max(0, swing) * ampJoelho;
    u.joelhoDir.rotation.x = Math.max(0, -swing) * ampJoelho;

    // Bracos (contra-fase entre si, mesma fase da perna oposta)
    u.bracoEsq.rotation.x =  swing * ampOmbro;
    u.bracoDir.rotation.x = -swing * ampOmbro;

    // Cotovelos dobram mais quando braco vai pra frente
    var dobraIdle = -0.15;
    var dobraExtraEsq = -Math.max(0, swing) * ampCotovelo;
    var dobraExtraDir = -Math.max(0, -swing) * ampCotovelo;
    u.cotoveloEsq.rotation.x = dobraIdle + dobraExtraEsq;
    u.cotoveloDir.rotation.x = dobraIdle + dobraExtraDir;

    // Reseta scale (sai da respiracao)
    u.corpoGrupo.scale.y += (1 - u.corpoGrupo.scale.y) * 0.2;
  } else {
    // Volta suave pra idle
    u.corpoGrupo.position.y *= 0.85;
    u.corpoGrupo.rotation.x *= 0.85;
    if (u.corpoGrupo.position.y < 0.001) u.corpoGrupo.position.y = 0;

    u.bracoEsq.rotation.x *= 0.82;
    u.bracoDir.rotation.x *= 0.82;
    u.pernaEsq.rotation.x *= 0.82;
    u.pernaDir.rotation.x *= 0.82;

    var cotIdle = -0.15;
    u.cotoveloEsq.rotation.x += (cotIdle - u.cotoveloEsq.rotation.x) * 0.12;
    u.cotoveloDir.rotation.x += (cotIdle - u.cotoveloDir.rotation.x) * 0.12;
    u.joelhoEsq.rotation.x *= 0.85;
    u.joelhoDir.rotation.x *= 0.85;

    // Respiracao leve
    u.faseRespiracao += delta * 1.5;
    u.corpoGrupo.scale.y = 1.0 + Math.sin(u.faseRespiracao) * 0.012;

    u.fasePasso = 0;
  }
}

function atualizarPersonagem(delta) {
  animarColono(personagem, {
    andando: estaAndando, correndo: correndo, delta: delta
  });
}
