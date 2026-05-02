// Geometrias das 3 cabanas (Pequena, Média, Grande)
// Cada funcao retorna um THREE.Group ja montado e centrado em (0,0,0)
// Materiais sao reutilizados entre cabanas pra reduzir alocacoes

var matMadeiraClara = new THREE.MeshLambertMaterial({ color: 0x9c6a3a });
var matMadeiraEscura = new THREE.MeshLambertMaterial({ color: 0x5a3820 });
var matTelhadoPalha = new THREE.MeshLambertMaterial({ color: 0xa67e3c, flatShading: true });
var matPedra = new THREE.MeshLambertMaterial({ color: 0x6e6a64, flatShading: true });
var matJanela = new THREE.MeshLambertMaterial({ color: 0xc8d8e8, emissive: 0x443322, emissiveIntensity: 0.15 });
var matPorta = new THREE.MeshLambertMaterial({ color: 0x3d2010 });

function criarCabanaPequena() {
  var grupo = new THREE.Group();
  grupo.userData.tipo = 'pequena';
  grupo.userData.raioColisao = 3.0;

  // Base 4x4
  var lado = 4;
  var altParede = 2.5;

  montarBase(grupo, lado, lado, matMadeiraEscura);
  montarParedesQuadradas(grupo, lado, altParede, matMadeiraClara, /*comPorta*/ true, /*comJanela*/ false);
  montarTelhadoPiramide(grupo, lado, altParede, 1.6, matTelhadoPalha);

  return grupo;
}

function criarCabanaMedia() {
  var grupo = new THREE.Group();
  grupo.userData.tipo = 'media';
  grupo.userData.raioColisao = 4.5;

  var lado = 6;
  var altParede = 2.8;

  montarBase(grupo, lado, lado, matMadeiraEscura);
  montarParedesQuadradas(grupo, lado, altParede, matMadeiraClara, true, true);
  montarTelhadoPiramide(grupo, lado, altParede, 2.0, matTelhadoPalha);
  montarChamine(grupo, lado * 0.3, altParede + 1.0, lado * 0.3, matPedra, 1.3);

  return grupo;
}

function criarCabanaGrande() {
  var grupo = new THREE.Group();
  grupo.userData.tipo = 'grande';
  grupo.userData.raioColisao = 6.0;

  var lado = 8;
  var altParede = 3.2;

  montarBase(grupo, lado, lado, matMadeiraEscura);
  montarParedesQuadradas(grupo, lado, altParede, matMadeiraClara, true, true);
  montarTelhadoPiramide(grupo, lado, altParede, 2.6, matTelhadoPalha);
  montarChamine(grupo, lado * 0.32, altParede + 1.4, lado * 0.32, matPedra, 1.8);

  // Janelas extras nas laterais (frente e tras ja vem em montarParedes)
  var janelaGeo = new THREE.BoxGeometry(0.9, 0.9, 0.12);
  var jE = new THREE.Mesh(janelaGeo, matJanela);
  jE.position.set(lado / 2 - 0.1, 1.6, 0);
  jE.rotation.y = Math.PI / 2;
  jE.castShadow = true;
  grupo.add(jE);
  var jD = new THREE.Mesh(janelaGeo, matJanela);
  jD.position.set(-lado / 2 + 0.1, 1.6, 0);
  jD.rotation.y = Math.PI / 2;
  jD.castShadow = true;
  grupo.add(jD);

  return grupo;
}

// === Helpers ===

function montarBase(grupo, largura, prof, mat) {
  var geo = new THREE.BoxGeometry(largura, 0.15, prof);
  var piso = new THREE.Mesh(geo, mat);
  piso.position.y = 0.075;
  piso.receiveShadow = true;
  grupo.add(piso);
}

function montarParedesQuadradas(grupo, lado, alt, mat, comPorta, comJanela) {
  var espessura = 0.18;
  var meiaPorta = 0.6;
  var altPorta = 1.9;

  // Norte (frente, +Z) — sempre com porta
  if (comPorta) {
    // Parede com buraco da porta: 3 pedacos (esquerda, direita, em cima da porta)
    var larguraEsq = lado / 2 - meiaPorta;
    var pNE = criarParedeRetangulo(larguraEsq, alt, espessura, mat);
    pNE.position.set(-lado / 4 - meiaPorta / 2, alt / 2, lado / 2);
    grupo.add(pNE);

    var pND = criarParedeRetangulo(larguraEsq, alt, espessura, mat);
    pND.position.set(lado / 4 + meiaPorta / 2, alt / 2, lado / 2);
    grupo.add(pND);

    var pNT = criarParedeRetangulo(meiaPorta * 2, alt - altPorta, espessura, mat);
    pNT.position.set(0, altPorta + (alt - altPorta) / 2, lado / 2);
    grupo.add(pNT);

    // Porta — fica como mesh mais escura, ligeiramente afundada
    var portaGeo = new THREE.BoxGeometry(meiaPorta * 2 - 0.1, altPorta - 0.05, 0.06);
    var porta = new THREE.Mesh(portaGeo, matPorta);
    porta.position.set(0, altPorta / 2, lado / 2 + espessura / 2);
    porta.castShadow = true;
    grupo.add(porta);
  } else {
    var pN = criarParedeRetangulo(lado, alt, espessura, mat);
    pN.position.set(0, alt / 2, lado / 2);
    grupo.add(pN);
  }

  // Sul (tras, -Z)
  if (comJanela) {
    var larguraJanela = 0.9;
    var alturaJanela = 0.9;
    var alturaCentroJanela = alt * 0.6;
    var larguraSeg = (lado - larguraJanela) / 2;

    var pSE = criarParedeRetangulo(larguraSeg, alt, espessura, mat);
    pSE.position.set(-lado / 2 + larguraSeg / 2, alt / 2, -lado / 2);
    grupo.add(pSE);
    var pSD = criarParedeRetangulo(larguraSeg, alt, espessura, mat);
    pSD.position.set(lado / 2 - larguraSeg / 2, alt / 2, -lado / 2);
    grupo.add(pSD);
    var pSCimaH = alt - alturaCentroJanela - alturaJanela / 2;
    var pSCima = criarParedeRetangulo(larguraJanela, pSCimaH, espessura, mat);
    pSCima.position.set(0, alt - pSCimaH / 2, -lado / 2);
    grupo.add(pSCima);
    var pSBaixoH = alturaCentroJanela - alturaJanela / 2;
    var pSBaixo = criarParedeRetangulo(larguraJanela, pSBaixoH, espessura, mat);
    pSBaixo.position.set(0, pSBaixoH / 2, -lado / 2);
    grupo.add(pSBaixo);

    // Janela (vidro)
    var jGeo = new THREE.BoxGeometry(larguraJanela, alturaJanela, 0.1);
    var j = new THREE.Mesh(jGeo, matJanela);
    j.position.set(0, alturaCentroJanela, -lado / 2);
    grupo.add(j);
  } else {
    var pS = criarParedeRetangulo(lado, alt, espessura, mat);
    pS.position.set(0, alt / 2, -lado / 2);
    grupo.add(pS);
  }

  // Leste e oeste (sem aberturas pra simplificar V3.0)
  var pL = criarParedeRetangulo(lado, alt, espessura, mat);
  pL.rotation.y = Math.PI / 2;
  pL.position.set(lado / 2, alt / 2, 0);
  grupo.add(pL);

  var pO = criarParedeRetangulo(lado, alt, espessura, mat);
  pO.rotation.y = Math.PI / 2;
  pO.position.set(-lado / 2, alt / 2, 0);
  grupo.add(pO);
}

function criarParedeRetangulo(largura, alt, espessura, mat) {
  var geo = new THREE.BoxGeometry(largura, alt, espessura);
  var m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function montarTelhadoPiramide(grupo, lado, altParede, altTelhado, mat) {
  // ConeGeometry com 4 lados forma piramide quadrada
  var raio = (lado / 2) * Math.SQRT2; // raio = diagonal/2 da base quadrada
  var geo = new THREE.ConeGeometry(raio, altTelhado, 4);
  var telhado = new THREE.Mesh(geo, mat);
  telhado.position.y = altParede + altTelhado / 2;
  telhado.rotation.y = Math.PI / 4; // alinha as faces com as paredes
  telhado.castShadow = true;
  grupo.add(telhado);
}

function montarChamine(grupo, larguraChamine, altMin, profChamine, mat, altura) {
  var geo = new THREE.BoxGeometry(larguraChamine * 0.6, altura, profChamine * 0.6);
  var chamine = new THREE.Mesh(geo, mat);
  // Posiciona no canto traseiro do telhado
  chamine.position.set(-larguraChamine * 0.5, altMin + altura / 2, -profChamine * 0.5);
  chamine.castShadow = true;
  grupo.add(chamine);
}

// Lookup pra recriar cabana a partir do tipo (usado na persistencia)
var FABRICAS_CABANA = {
  pequena: criarCabanaPequena,
  media: criarCabanaMedia,
  grande: criarCabanaGrande
};

var CUSTOS_CABANA = {
  pequena: { madeira: 22 },
  media:   { madeira: 50, pedra: 10 },
  grande:  { madeira: 100, pedra: 30 }
};
