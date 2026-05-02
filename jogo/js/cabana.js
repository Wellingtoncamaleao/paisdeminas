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
  grupo.userData.lado = lado;

  montarBase(grupo, lado, lado, matMadeiraEscura);
  montarParedesQuadradas(grupo, lado, altParede, matMadeiraClara, /*comPorta*/ true, /*comJanela*/ false);
  montarTelhadoPiramide(grupo, lado, altParede, 1.6, matTelhadoPalha);
  montarMoveisInternos(grupo, 'pequena', lado);

  return grupo;
}

function criarCabanaMedia() {
  inicializarMateriaisCabana();
  var grupo = new THREE.Group();
  grupo.userData.tipo = 'media';
  grupo.userData.raioColisao = 4.5;

  var lado = 6;
  var altParede = 2.8;
  grupo.userData.lado = lado;

  montarBase(grupo, lado, lado, matMadeiraEscura);
  montarParedesQuadradas(grupo, lado, altParede, matMadeiraClara, true, true);
  montarTelhadoPiramide(grupo, lado, altParede, 2.0, matTelhadoPalha);
  montarChamine(grupo, lado * 0.3, altParede + 1.0, lado * 0.3, matPedra, 1.3);
  montarMoveisInternos(grupo, 'media', lado);

  return grupo;
}

function criarCabanaGrande() {
  inicializarMateriaisCabana();
  var grupo = new THREE.Group();
  grupo.userData.tipo = 'grande';
  grupo.userData.raioColisao = 6.0;

  var lado = 8;
  var altParede = 3.2;
  grupo.userData.lado = lado;

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

  montarMoveisInternos(grupo, 'grande', lado);

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
  telhado.userData.eTelhado = true; // marca pra esconder quando jogador entra
  grupo.add(telhado);
  // Salva ref pra acesso rapido
  grupo.userData.telhado = telhado;
}

// === Moveis interiores (geometricos baratos, mesma estetica low-poly) ===
function montarMoveisInternos(grupo, tipo, lado) {
  // Materiais especificos pra moveis (criados aqui pra reuso)
  var matMoveisMad = new THREE.MeshLambertMaterial({ color: 0x6a3818 });
  var matColchao = new THREE.MeshLambertMaterial({ color: 0xc8a878 });
  var matTravess = new THREE.MeshLambertMaterial({ color: 0xf0e4cc });
  var matBau = new THREE.MeshLambertMaterial({ color: 0x4a2812 });
  var matMetal = new THREE.MeshLambertMaterial({ color: 0x8a7848 });
  var matTapete = new THREE.MeshLambertMaterial({ color: 0x8a3825 });

  // Cama: presente em todas as cabanas (dorm e basico)
  // Posicao: encostada na parede leste (X+), centrada em Z
  var cama = criarCama(matMoveisMad, matColchao, matTravess);
  cama.position.set(lado / 2 - 0.55, 0.15, -lado / 4);
  cama.rotation.y = Math.PI / 2; // cabeceira pra leste
  grupo.add(cama);

  if (tipo === 'pequena') {
    // Cabana pequena: cama + baú pequeno
    var bauP = criarBau(matBau, matMetal, 0.7);
    bauP.position.set(-lado / 2 + 0.5, 0.18, lado / 2 - 0.6);
    bauP.rotation.y = Math.PI / 4;
    grupo.add(bauP);

    // Tapete pequeno no centro
    var tapeteP = criarTapete(matTapete, 1.2);
    tapeteP.position.set(0, 0.16, 0);
    grupo.add(tapeteP);
  } else if (tipo === 'media') {
    // Cabana media: cama + mesa + 2 banquinhos + baú + tapete
    var mesa = criarMesa(matMoveisMad, 1.0, 0.8);
    mesa.position.set(-0.5, 0, 0.5);
    grupo.add(mesa);

    var banco1 = criarBanco(matMoveisMad);
    banco1.position.set(-0.5, 0, 1.5);
    grupo.add(banco1);

    var banco2 = criarBanco(matMoveisMad);
    banco2.position.set(-0.5, 0, -0.5);
    banco2.rotation.y = Math.PI;
    grupo.add(banco2);

    var bauM = criarBau(matBau, matMetal, 0.9);
    bauM.position.set(-lado / 2 + 0.5, 0.22, -lado / 2 + 0.5);
    grupo.add(bauM);

    var tapeteM = criarTapete(matTapete, 1.8);
    tapeteM.position.set(-0.5, 0.16, 0.5);
    grupo.add(tapeteM);
  } else if (tipo === 'grande') {
    // Cabana grande: cama dupla + mesa retangular + 4 cadeiras + baú grande + tapete
    var mesaG = criarMesa(matMoveisMad, 1.6, 0.8, /*retangular*/ true);
    mesaG.position.set(0, 0, 0);
    grupo.add(mesaG);

    var bancoG1 = criarBanco(matMoveisMad, 1.6);
    bancoG1.position.set(0, 0, 1.0);
    grupo.add(bancoG1);
    var bancoG2 = criarBanco(matMoveisMad, 1.6);
    bancoG2.position.set(0, 0, -1.0);
    bancoG2.rotation.y = Math.PI;
    grupo.add(bancoG2);

    var bauG = criarBau(matBau, matMetal, 1.1);
    bauG.position.set(-lado / 2 + 0.6, 0.24, -lado / 2 + 0.6);
    grupo.add(bauG);

    var tapeteG = criarTapete(matTapete, 2.6);
    tapeteG.position.set(0, 0.16, 0);
    grupo.add(tapeteG);
  }
}

function criarCama(matMad, matColch, matTrav) {
  var g = new THREE.Group();
  // Estrutura de madeira (base)
  var baseGeo = new THREE.BoxGeometry(2.0, 0.2, 1.0);
  var base = new THREE.Mesh(baseGeo, matMad);
  base.position.y = 0.1;
  base.receiveShadow = true;
  base.castShadow = true;
  g.add(base);
  // Colchao
  var colchaoGeo = new THREE.BoxGeometry(1.85, 0.18, 0.85);
  var colchao = new THREE.Mesh(colchaoGeo, matColch);
  colchao.position.y = 0.29;
  colchao.castShadow = true;
  g.add(colchao);
  // Travesseiro (cabeceira lado oeste)
  var travGeo = new THREE.BoxGeometry(0.45, 0.12, 0.7);
  var trav = new THREE.Mesh(travGeo, matTrav);
  trav.position.set(-0.7, 0.45, 0);
  trav.castShadow = true;
  g.add(trav);
  // Cabeceira (parede vertical na ponta)
  var cabGeo = new THREE.BoxGeometry(0.1, 0.7, 1.0);
  var cab = new THREE.Mesh(cabGeo, matMad);
  cab.position.set(-1.0, 0.35, 0);
  cab.castShadow = true;
  g.add(cab);
  return g;
}

function criarMesa(mat, comprimento, profundidade, retangular) {
  var g = new THREE.Group();
  var w = comprimento;
  var d = profundidade;
  // Tampo
  var tampoGeo = retangular
    ? new THREE.BoxGeometry(w, 0.06, d)
    : new THREE.CylinderGeometry(w / 2, w / 2, 0.06, 16);
  var tampo = new THREE.Mesh(tampoGeo, mat);
  tampo.position.y = 0.7;
  tampo.castShadow = true;
  tampo.receiveShadow = true;
  g.add(tampo);
  // 4 pernas
  var pernaGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6);
  var posicoes = [
    { x: w / 2 - 0.1, z: d / 2 - 0.1 },
    { x: -w / 2 + 0.1, z: d / 2 - 0.1 },
    { x: w / 2 - 0.1, z: -d / 2 + 0.1 },
    { x: -w / 2 + 0.1, z: -d / 2 + 0.1 }
  ];
  for (var i = 0; i < 4; i++) {
    var p = new THREE.Mesh(pernaGeo, mat);
    p.position.set(posicoes[i].x, 0.35, posicoes[i].z);
    p.castShadow = true;
    g.add(p);
  }
  return g;
}

function criarBanco(mat, comprimento) {
  var g = new THREE.Group();
  var w = comprimento || 0.7;
  // Assento
  var assGeo = new THREE.BoxGeometry(w, 0.08, 0.35);
  var ass = new THREE.Mesh(assGeo, mat);
  ass.position.y = 0.45;
  ass.castShadow = true;
  g.add(ass);
  // Pernas (2 pares laterais)
  var pernaGeo = new THREE.BoxGeometry(0.06, 0.45, 0.06);
  var posicoes = [
    { x: w / 2 - 0.05, z: 0.13 },
    { x: -w / 2 + 0.05, z: 0.13 },
    { x: w / 2 - 0.05, z: -0.13 },
    { x: -w / 2 + 0.05, z: -0.13 }
  ];
  for (var i = 0; i < 4; i++) {
    var p = new THREE.Mesh(pernaGeo, mat);
    p.position.set(posicoes[i].x, 0.225, posicoes[i].z);
    p.castShadow = true;
    g.add(p);
  }
  return g;
}

function criarBau(matMad, matMet, escala) {
  var g = new THREE.Group();
  var s = escala || 1;
  // Corpo
  var corpoGeo = new THREE.BoxGeometry(0.7 * s, 0.4 * s, 0.45 * s);
  var corpo = new THREE.Mesh(corpoGeo, matMad);
  corpo.position.y = 0.0;
  corpo.castShadow = true;
  g.add(corpo);
  // Tampa (semi-cilindro deitado por cima)
  var tampaGeo = new THREE.CylinderGeometry(0.225 * s, 0.225 * s, 0.7 * s, 8, 1, false, 0, Math.PI);
  var tampa = new THREE.Mesh(tampaGeo, matMad);
  tampa.rotation.z = Math.PI / 2;
  tampa.position.y = 0.2 * s;
  tampa.castShadow = true;
  g.add(tampa);
  // Fivela metalica frontal
  var fivelaGeo = new THREE.BoxGeometry(0.1 * s, 0.12 * s, 0.04 * s);
  var fivela = new THREE.Mesh(fivelaGeo, matMet);
  fivela.position.set(0, 0.05 * s, 0.23 * s);
  g.add(fivela);
  return g;
}

function criarTapete(mat, lado) {
  var geo = new THREE.PlaneGeometry(lado, lado * 0.7);
  geo.rotateX(-Math.PI / 2);
  var t = new THREE.Mesh(geo, mat);
  t.receiveShadow = true;
  return t;
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

  // Luz da fogueira — ponto laranja-vermelho, raio razoavel
  // Intensidade alta pq Three.js r155+ usa decay fisicamente correto (decay=2)
  // Setamos decay=1 (linear) pra ficar mais visivel/fake-game, intensity 25 base
  var luz = new THREE.PointLight(0xff7720, 25, 22, 1.0);
  luz.position.set(0, 1.2, 0);
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
