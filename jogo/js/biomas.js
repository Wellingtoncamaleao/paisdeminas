// Biomas de Minas Gerais — distribuicao geografica aproximada de 1500.
// Tres biomas reais que coexistiam no estado:
//   - Mata Atlantica: leste/sudeste (Zona da Mata, Caparao, Vertentes)
//   - Cerrado: centro/oeste (Triangulo Mineiro, Alto Paranaiba, centro)
//   - Caatinga: norte (Sertao mineiro, Janauba, Serra Geral)
//
// Distribuicao real e mais complexa que tres faixas — ha enclaves, transicoes,
// matas ciliares — mas pra jogo simplifica em 3 zonas com bordas suavizadas.

// Cores base do chao por bioma (hex). Multiplicam textura procedural de grama
// (vertexColors=true), entao tonalidade visual final = textura * cor.
// Lazy init — biomas.js carrega antes do importmap module ter exposto THREE.
var COR_BIOMA_HEX = {
  mata:     0x6a9c4a, // verde brilhante (mata densa, umida)
  cerrado:  0xc0a560, // verde-amarelado (gramineas, ressecado)
  caatinga: 0xc89060  // ocre/marrom claro (solo exposto, seco)
};
var COR_BIOMA = null; // populado em garantirCoresBioma()
function garantirCoresBioma() {
  if (COR_BIOMA) return;
  if (typeof THREE === 'undefined' || !THREE.Color) return;
  COR_BIOMA = {
    mata:     new THREE.Color(COR_BIOMA_HEX.mata),
    cerrado:  new THREE.Color(COR_BIOMA_HEX.cerrado),
    caatinga: new THREE.Color(COR_BIOMA_HEX.caatinga)
  };
}

// Vegetacao tipica de cada bioma — modelos GLTF do pack Quaternius ja carregados
// em vegetacao3d.js. floresta.js consulta essa tabela pra escolher modelo certo
// na hora de spawnar planta.
var VEGETACAO_BIOMA = {
  mata: {
    arvores:        ['CommonTree_1', 'CommonTree_3', 'CommonTree_5'],
    arvoresOutras:  ['BirchTree_1', 'BirchTree_3', 'MapleTree_1', 'MapleTree_3'],
    coniferas:      ['Pine_2', 'Pine_4'],
    arbustos:       ['Bush_Common_Flowers', 'Bush_Large_Flowers', 'Fern_1', 'Flower_1_Clump']
  },
  cerrado: {
    arvores:        ['TwistedTree_1', 'TwistedTree_3'],
    arvoresOutras:  ['DeadTree_1'],
    coniferas:      [], // raras no cerrado
    arbustos:       ['Bush_Common', 'Grass_Wispy_Tall', 'Grass_Common_Tall']
  },
  caatinga: {
    arvores:        ['DeadTree_1', 'TwistedTree_1'],
    arvoresOutras:  [],
    coniferas:      [],
    arbustos:       ['Grass_Common_Tall'] // bem ralo
  }
};

// Multiplicador de densidade — quantas plantas spawnam por bioma.
// Mata e referencia (1.0). Cerrado tem ~metade. Caatinga ~1/4 (ressecada).
var DENSIDADE_BIOMA = {
  mata:     1.0,
  cerrado:  0.55,
  caatinga: 0.25
};

// Limites das zonas (em coords de mundo). Suavizacao na faixa de mistura.
var FRONTEIRA_NORTE_CAATINGA = 350;     // z > FRONTEIRA → caatinga puro
var FRONTEIRA_SUL_MATA       = -300;    // z < FRONTEIRA → mata pelo sul
var FRONTEIRA_LESTE_MATA     = 200;     // x > FRONTEIRA → mata pelo leste
var FAIXA_MISTURA            = 180;     // suavizacao em torno das fronteiras

// Helper: smoothstep tipo GLSL — transicao suave [0..1] entre edge0 e edge1
function _smoothstep(edge0, edge1, x) {
  var t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Pesos de cada bioma em (x, z) — soma = 1. Usado pra mistura de cores
// e pra escolher vegetacao com probabilidades suaves nas fronteiras.
function pesosBiomaEm(x, z) {
  // Caatinga — norte (z > 350). Tem prioridade sobre mata-leste no Sertao
  var pesoCaatinga = _smoothstep(
    FRONTEIRA_NORTE_CAATINGA - FAIXA_MISTURA,
    FRONTEIRA_NORTE_CAATINGA + FAIXA_MISTURA,
    z
  );

  // Mata Atlantica — leste/sul, MAS so na metade sul (z < 350)
  // mataLeste so vale quando NAO esta no Sertao (caatinga)
  var mataLeste = _smoothstep(
    FRONTEIRA_LESTE_MATA - FAIXA_MISTURA,
    FRONTEIRA_LESTE_MATA + FAIXA_MISTURA,
    x
  ) * (1 - pesoCaatinga); // some no norte
  var mataSul = _smoothstep(
    FRONTEIRA_SUL_MATA + FAIXA_MISTURA,
    FRONTEIRA_SUL_MATA - FAIXA_MISTURA,
    z
  );
  // Combina (max — qualquer um dos dois ja faz mata)
  var pesoMata = Math.max(mataLeste, mataSul);

  // Cerrado = preenche o que sobra (centro/oeste/norte-medio).
  // Garantir soma = 1: cerrado = 1 - mata - caatinga (clampado)
  var totalOutros = pesoMata + pesoCaatinga;
  if (totalOutros > 1) {
    pesoMata /= totalOutros;
    pesoCaatinga /= totalOutros;
    totalOutros = 1;
  }
  var pesoCerrado = 1 - totalOutros;

  return { mata: pesoMata, cerrado: pesoCerrado, caatinga: pesoCaatinga };
}

// Bioma predominante em (x, z) — usado quando precisa de uma decisao discreta
// (escolher modelo de arvore, contar quantas spawnaram em cada zona, etc).
function biomaEm(x, z) {
  var p = pesosBiomaEm(x, z);
  if (p.mata >= p.cerrado && p.mata >= p.caatinga) return 'mata';
  if (p.caatinga >= p.cerrado) return 'caatinga';
  return 'cerrado';
}

// Cor do chao em (x, z) — mistura ponderada das cores de cada bioma. Resultado
// vai pro atributo "color" do vertex no terrenoMesh.
function corChaoEm(x, z) {
  garantirCoresBioma();
  if (!COR_BIOMA) return new THREE.Color(0xffffff);
  var p = pesosBiomaEm(x, z);
  var cor = new THREE.Color(0, 0, 0);
  cor.r = COR_BIOMA.mata.r * p.mata + COR_BIOMA.cerrado.r * p.cerrado + COR_BIOMA.caatinga.r * p.caatinga;
  cor.g = COR_BIOMA.mata.g * p.mata + COR_BIOMA.cerrado.g * p.cerrado + COR_BIOMA.caatinga.g * p.caatinga;
  cor.b = COR_BIOMA.mata.b * p.mata + COR_BIOMA.cerrado.b * p.cerrado + COR_BIOMA.caatinga.b * p.caatinga;
  return cor;
}

// Densidade local — multiplicador suave (entre 0.25 e 1.0) baseado nos pesos.
// Em pontos de transicao mata→caatinga, densidade interpola suavemente.
function densidadeEm(x, z) {
  var p = pesosBiomaEm(x, z);
  return DENSIDADE_BIOMA.mata * p.mata
       + DENSIDADE_BIOMA.cerrado * p.cerrado
       + DENSIDADE_BIOMA.caatinga * p.caatinga;
}

// Sortea modelo de arvore apropriado pro bioma local. categoria = 'arvores',
// 'arvoresOutras', 'coniferas' ou 'arbustos'. Pesa pelos pesos do bioma —
// nas fronteiras, mistura modelos. Retorna null se nao houver modelo aplicavel.
function sortearModeloVegetacao(x, z, categoria) {
  var p = pesosBiomaEm(x, z);
  var biomas = ['mata', 'cerrado', 'caatinga'];
  // Soma pesos cumulativos pra escolher bioma alvo via roleta
  var r = Math.random();
  var acum = 0;
  var biomaEscolhido = null;
  for (var i = 0; i < biomas.length; i++) {
    acum += p[biomas[i]];
    if (r <= acum) { biomaEscolhido = biomas[i]; break; }
  }
  if (!biomaEscolhido) biomaEscolhido = 'cerrado';

  var lista = VEGETACAO_BIOMA[biomaEscolhido][categoria];
  if (!lista || lista.length === 0) return null;
  return lista[Math.floor(Math.random() * lista.length)];
}
