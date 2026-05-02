// Geometrias das 3 cabanas (Pequena, Média, Grande)
// Cada funcao retorna um THREE.Group ja montado e centrado em (0,0,0)
// Materiais sao reutilizados entre cabanas pra reduzir alocacoes

// Materiais texturizados — usam texturas procedurais geradas em texturas.js
// Lazy init: criam na primeira chamada (texturas.js precisa estar carregado)
var matMadeiraClara = null;
var matMadeiraEscura = null;
var matTelhadoPalha = null;
var matPedra = null;
var matJanela = null;
var matPorta = null;

function inicializarMateriaisCabana() {
  if (matMadeiraClara) return; // ja iniciado
  matMadeiraClara = new THREE.MeshLambertMaterial({
    color: 0xc89060, map: texturaMadeira()
  });
  matMadeiraEscura = new THREE.MeshLambertMaterial({
    color: 0x8a5028, map: texturaMadeira()
  });
  matTelhadoPalha = new THREE.MeshLambertMaterial({
    color: 0xc89058, map: texturaPalha(), flatShading: true
  });
  matPedra = new THREE.MeshLambertMaterial({
    color: 0xa0a0a0, map: texturaPedra(), flatShading: true
  });
  matJanela = new THREE.MeshLambertMaterial({
    color: 0xc8d8e8, emissive: 0x443322, emissiveIntensity: 0.2
  });
  matPorta = new THREE.MeshLambertMaterial({ color: 0x3d2010 });
}

function criarCabanaPequena() {
  inicializarMateriaisCabana();
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
  inicializarMateriaisCabana();
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
  inicializarMateriaisCabana();
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
  var meiaPorta = 0.9; // porta de 1.8m (cabe folgado o personagem de raio 0.5)
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
  grande: criarCabanaGrande,
  fogueira: criarFogueiraGrupo
};

var CUSTOS_CABANA = {
  pequena: { madeira: 22 },
  media:   { madeira: 50, pedra: 10 },
  grande:  { madeira: 100, pedra: 30 },
  fogueira: { madeira: 3 }
};

// Lados das construcoes — pra colisao precisa
var LADOS_CABANA = {
  pequena: 4,
  media: 6,
  grande: 8,
  fogueira: 1.5
};

// Materiais da fogueira (lazy init)
var matFogueiraPedra = null;
var matFogueiraTronco = null;
var matFogueiraChama = null;
var matFogueiraBrasa = null;

function inicializarMateriaisFogueira() {
  if (matFogueiraPedra) return;
  matFogueiraPedra = new THREE.MeshLambertMaterial({ color: 0x6e6a64, flatShading: true });
  matFogueiraTronco = new THREE.MeshLambertMaterial({ color: 0x4a2f1a });
  matFogueiraChama = new THREE.MeshBasicMaterial({
    color: 0xff8030, transparent: true, opacity: 0.92, fog: false, depthWrite: false
  });
  matFogueiraBrasa = new THREE.MeshBasicMaterial({
    color: 0xff3010, transparent: true, opacity: 0.9, fog: false
  });
}

// Cria grupo da fogueira (pedras em circulo + lenha + brasa + chama + PointLight)
function criarFogueiraGrupo() {
  inicializarMateriaisFogueira();
  var grupo = new THREE.Group();
  grupo.userData.tipo = 'fogueira';
  grupo.userData.raioColisao = 1.0;

  // 6 pedras em circulo (varias rotacoes pra parecer natural)
  var pedraGeo = new THREE.DodecahedronGeometry(0.22, 0);
  for (var i = 0; i < 6; i++) {
    var ang = (i / 6) * Math.PI * 2;
    var pedra = new THREE.Mesh(pedraGeo, matFogueiraPedra);
    var dist = 0.45 + Math.random() * 0.08;
    pedra.position.set(Math.cos(ang) * dist, 0.13, Math.sin(ang) * dist);
    pedra.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    pedra.scale.setScalar(0.85 + Math.random() * 0.35);
    pedra.castShadow = true;
    grupo.add(pedra);
  }

  // 4 troncos arrumados em "tipi" (cones convergindo no topo)
  var troncoGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.65, 5);
  for (var k = 0; k < 4; k++) {
    var angT = (k / 4) * Math.PI * 2;
    var tronco = new THREE.Mesh(troncoGeo, matFogueiraTronco);
    tronco.position.set(Math.cos(angT) * 0.16, 0.32, Math.sin(angT) * 0.16);
    tronco.rotation.z = -Math.cos(angT) * 0.45;
    tronco.rotation.x = Math.sin(angT) * 0.45;
    tronco.castShadow = true;
    grupo.add(tronco);
  }

  // Brasa (esfera achatada vermelha no centro)
  var brasaGeo = new THREE.SphereGeometry(0.18, 8, 6);
  var brasa = new THREE.Mesh(brasaGeo, matFogueiraBrasa);
  brasa.position.set(0, 0.16, 0);
  brasa.scale.set(1, 0.4, 1);
  grupo.add(brasa);
  grupo.userData.brasa = brasa;

  // Chama (cone laranja-amarelo, animado no loop pra oscilar)
  var chamaGeo = new THREE.ConeGeometry(0.2, 0.85, 6);
  var chama = new THREE.Mesh(chamaGeo, matFogueiraChama);
  chama.position.set(0, 0.7, 0);
  grupo.add(chama);
  grupo.userData.chama = chama;

  // Luz da fogueira — ponto laranja, raio razoavel pra iluminar arredores
  var luz = new THREE.PointLight(0xff7720, 1.4, 16, 1.6);
  luz.position.set(0, 1.0, 0);
  grupo.add(luz);
  grupo.userData.luz = luz;

  return grupo;
}

// Retorna array de retangulos de parede (em coords absolutas, ja rotacionados)
// pra cada cabana. Norte tem 2 segmentos com abertura no meio (porta).
// Cada retangulo: { x, z, larg, prof, rotY } — colidiveis com circulo do personagem.
function obterColisaoCabana(tipo, x, z, rotY) {
  // Fogueira nao tem paredes — colisao redonda eh adicionada em construcao.js (arvoresPos)
  if (tipo === 'fogueira') return [];

  var lado = LADOS_CABANA[tipo] || 4;
  var espessura = 0.18;
  var meiaPorta = 0.9; // mesmo valor de montarParedesQuadradas pra colisao casar com visual

  // Paredes em coords LOCAIS (centro da cabana = origem)
  var paredesLocais = [
    // Norte (frente, +Z) — 2 segmentos com abertura no meio (porta de largura 1.2m)
    { dx: -(lado / 4 + meiaPorta / 2), dz: lado / 2, larg: lado / 2 - meiaPorta, prof: espessura },
    { dx: (lado / 4 + meiaPorta / 2),  dz: lado / 2, larg: lado / 2 - meiaPorta, prof: espessura },
    // Sul (-Z) — parede inteira
    { dx: 0, dz: -lado / 2, larg: lado, prof: espessura },
    // Leste (+X)
    { dx: lado / 2,  dz: 0, larg: espessura, prof: lado },
    // Oeste (-X)
    { dx: -lado / 2, dz: 0, larg: espessura, prof: lado }
  ];

  // Aplica rotacao Y e translacao
  var cosR = Math.cos(rotY);
  var sinR = Math.sin(rotY);
  var paredesGlobais = [];
  for (var i = 0; i < paredesLocais.length; i++) {
    var p = paredesLocais[i];
    paredesGlobais.push({
      x: x + p.dx * cosR - p.dz * sinR,
      z: z + p.dx * sinR + p.dz * cosR,
      larg: p.larg,
      prof: p.prof,
      rotY: rotY
    });
  }
  return paredesGlobais;
}
