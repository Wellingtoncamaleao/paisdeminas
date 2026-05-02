// Personagem: humanoide composto de primitivas (cabeca, tronco, bracos, pernas)
// Visual de "colono 1500": camisa marrom, calca marrom escura, chapeu de palha, barba
// Animacao manual: rotacao alternada de membros sincronizada com bobbing
var personagem;
var corpoGrupo; // contem todas as partes — recebe bobbing vertical
var bracoEsq, bracoDir, pernaEsq, pernaDir; // grupos pivot pra rotacao
var fasePasso = 0;

// Paleta global do colono (usada por iniciarPersonagem e criarMembro)
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
  personagem = new THREE.Group();

  // Grupo do corpo todo (recebe bobbing vertical)
  corpoGrupo = new THREE.Group();
  personagem.add(corpoGrupo);

  var corPele = CORES_COLONO.pele;
  var corCamisa = CORES_COLONO.camisa;
  var corCalca = CORES_COLONO.calca;
  var corChapeu = CORES_COLONO.chapeu;
  var corBarba = CORES_COLONO.barba;
  var corCabelo = CORES_COLONO.cabelo;
  var corCinto = CORES_COLONO.cinto;

  // === Tronco — capsule marrom (camisa) ===
  var troncoGeo = new THREE.CapsuleGeometry(0.28, 0.55, 4, 8);
  var troncoMat = new THREE.MeshLambertMaterial({ color: corCamisa });
  var tronco = new THREE.Mesh(troncoGeo, troncoMat);
  tronco.position.y = 1.05;
  tronco.castShadow = true;
  corpoGrupo.add(tronco);

  // === Cabeca — esfera com baixos segments (low-poly) ===
  var cabecaGeo = new THREE.SphereGeometry(0.22, 12, 10);
  var cabecaMat = new THREE.MeshLambertMaterial({ color: corPele });
  var cabeca = new THREE.Mesh(cabecaGeo, cabecaMat);
  cabeca.position.y = 1.62;
  cabeca.castShadow = true;
  corpoGrupo.add(cabeca);

  // Cabelo — hemisferio achatado embaixo do chapeu, aparece nas laterais e atras
  var cabeloGeo = new THREE.SphereGeometry(0.235, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  var cabeloMat = new THREE.MeshLambertMaterial({ color: corCabelo });
  var cabelo = new THREE.Mesh(cabeloGeo, cabeloMat);
  cabelo.position.y = 1.66;
  cabelo.scale.y = 0.7;
  cabelo.castShadow = true;
  corpoGrupo.add(cabelo);

  // Barba — cone curto cinza-escuro pendurado da cabeca
  var barbaGeo = new THREE.ConeGeometry(0.14, 0.18, 8);
  var barbaMat = new THREE.MeshLambertMaterial({ color: corBarba });
  var barba = new THREE.Mesh(barbaGeo, barbaMat);
  barba.position.set(0, 1.48, 0.05);
  barba.rotation.x = Math.PI;
  corpoGrupo.add(barba);

  // Chapeu de palha — cone largo + cilindro fino (aba)
  var chapeuTopoGeo = new THREE.ConeGeometry(0.18, 0.18, 12);
  var chapeuMat = new THREE.MeshLambertMaterial({ color: corChapeu });
  var chapeuTopo = new THREE.Mesh(chapeuTopoGeo, chapeuMat);
  chapeuTopo.position.y = 1.85;
  chapeuTopo.castShadow = true;
  corpoGrupo.add(chapeuTopo);

  var abaGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.04, 16);
  var aba = new THREE.Mesh(abaGeo, chapeuMat);
  aba.position.y = 1.78;
  aba.castShadow = true;
  corpoGrupo.add(aba);

  // Cinturao — cilindro fino marrom escuro na cintura
  var cintoGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.1, 16);
  var cintoMat = new THREE.MeshLambertMaterial({ color: corCinto });
  var cinto = new THREE.Mesh(cintoGeo, cintoMat);
  cinto.position.y = 0.88;
  cinto.castShadow = true;
  corpoGrupo.add(cinto);

  // Fivela do cinto — pequeno cubo dourado claro no centro frontal
  var fivelaGeo = new THREE.BoxGeometry(0.08, 0.08, 0.04);
  var fivelaMat = new THREE.MeshLambertMaterial({ color: 0xa68040 });
  var fivela = new THREE.Mesh(fivelaGeo, fivelaMat);
  fivela.position.set(0, 0.88, 0.32);
  corpoGrupo.add(fivela);

  // === Bracos: groups com pivot no ombro, cilindro pendurado ===
  bracoEsq = criarMembro(0.06, 0.55, corCamisa, corPele, true);
  bracoEsq.position.set(0.32, 1.32, 0);
  corpoGrupo.add(bracoEsq);

  bracoDir = criarMembro(0.06, 0.55, corCamisa, corPele, true);
  bracoDir.position.set(-0.32, 1.32, 0);
  corpoGrupo.add(bracoDir);

  // === Pernas: groups com pivot no quadril ===
  pernaEsq = criarMembro(0.09, 0.65, corCalca, CORES_COLONO.bota, false);
  pernaEsq.position.set(0.13, 0.7, 0);
  corpoGrupo.add(pernaEsq);

  pernaDir = criarMembro(0.09, 0.65, corCalca, CORES_COLONO.bota, false);
  pernaDir.position.set(-0.13, 0.7, 0);
  corpoGrupo.add(pernaDir);

  // Posicao inicial — comeco da trilha (sudoeste)
  personagem.position.set(-160, 0, -160);
  personagem.rotation.y = Math.PI / 4;

  cena.add(personagem);
}

// Helper: cria um membro (braco ou perna) como Group com pivot no topo,
// cilindro pendurado pra baixo + esfera/sandalia na ponta
function criarMembro(raio, comprimento, corCorpo, corPonta, ehBraco) {
  var grupo = new THREE.Group();

  // Cilindro do membro
  var geo = new THREE.CylinderGeometry(raio, raio * 0.85, comprimento, 6);
  var mat = new THREE.MeshLambertMaterial({ color: corCorpo });
  var membro = new THREE.Mesh(geo, mat);
  membro.position.y = -comprimento / 2;
  membro.castShadow = true;
  grupo.add(membro);

  // Manga / detalhe (so braco) — anel mais escuro perto do ombro
  if (ehBraco) {
    var mangaGeo = new THREE.CylinderGeometry(raio * 1.1, raio * 1.1, raio * 0.6, 8);
    var mangaMat = new THREE.MeshLambertMaterial({ color: CORES_COLONO.manga });
    var manga = new THREE.Mesh(mangaGeo, mangaMat);
    manga.position.y = -raio * 0.4;
    manga.castShadow = true;
    grupo.add(manga);
  }

  if (ehBraco) {
    // Mao — esfera pequena
    var maoGeo = new THREE.SphereGeometry(raio * 1.1, 8, 6);
    var maoMat = new THREE.MeshLambertMaterial({ color: corPonta });
    var mao = new THREE.Mesh(maoGeo, maoMat);
    mao.position.y = -comprimento - raio * 0.5;
    mao.castShadow = true;
    grupo.add(mao);
  } else {
    // Sandalia — solinho achatado + faixa de couro por cima
    var sandaliaSolGeo = new THREE.BoxGeometry(raio * 2.2, raio * 0.5, raio * 3.0);
    var sandaliaSolMat = new THREE.MeshLambertMaterial({ color: CORES_COLONO.sandalia });
    var sandaliaSol = new THREE.Mesh(sandaliaSolGeo, sandaliaSolMat);
    sandaliaSol.position.set(0, -comprimento - raio * 0.25, raio * 0.6);
    sandaliaSol.castShadow = true;
    grupo.add(sandaliaSol);
    // Faixa de couro
    var faixaGeo = new THREE.BoxGeometry(raio * 2.0, raio * 0.7, raio * 0.6);
    var faixaMat = new THREE.MeshLambertMaterial({ color: CORES_COLONO.bota });
    var faixa = new THREE.Mesh(faixaGeo, faixaMat);
    faixa.position.set(0, -comprimento + raio * 0.2, raio * 0.4);
    faixa.castShadow = true;
    grupo.add(faixa);
  }

  return grupo;
}

function atualizarPersonagem(delta) {
  // Bobbing vertical do corpo todo
  if (estaAndando) {
    fasePasso += delta * (correndo ? 13 : 8.5);
    var altura = Math.abs(Math.sin(fasePasso)) * (correndo ? 0.09 : 0.06);
    corpoGrupo.position.y = altura;

    // Animacao alternada dos membros (bracos e pernas opostos)
    var amplitude = correndo ? 0.85 : 0.55;
    var swing = Math.sin(fasePasso) * amplitude;
    bracoEsq.rotation.x = swing;
    bracoDir.rotation.x = -swing;
    pernaEsq.rotation.x = -swing;
    pernaDir.rotation.x = swing;
  } else {
    // Suaviza tudo pra zero quando parado
    corpoGrupo.position.y *= 0.85;
    if (corpoGrupo.position.y < 0.001) corpoGrupo.position.y = 0;

    bracoEsq.rotation.x *= 0.82;
    bracoDir.rotation.x *= 0.82;
    pernaEsq.rotation.x *= 0.82;
    pernaDir.rotation.x *= 0.82;

    fasePasso = 0;
  }
}
