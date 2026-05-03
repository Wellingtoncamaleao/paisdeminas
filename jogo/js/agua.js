// Material de agua estilizada (low-poly) — vertex shader com ondas senoidais
// animadas + fragment com gradiente raso/fundo + espuma sutil nas margens.
// Usado pelo rio (rio.js) e pelo oceano decorativo fora da silhueta (mundo.js).
//
// Ondas: 2 senoides somadas com frequencias e velocidades diferentes pra
// quebrar o padrao repetitivo. Eixo da altura e parametrizavel — rio usa Y
// (mesh nao rotacionado), oceano usa Z (PlaneGeometry rotacionada -PI/2 em X
// faz o eixo Z local virar Y mundo).
//
// Lista global MATERIAIS_AGUA[] — atualizarAguas(delta) e chamada no loop
// principal pra avancar o uniform `time` em todos.

var MATERIAIS_AGUA = [];

function criarMaterialAgua(opcoes) {
  opcoes = opcoes || {};
  var eixoAltura     = opcoes.eixoAltura || 'y';      // 'y' (rio) | 'z' (oceano)
  var amplitude      = opcoes.amplitude !== undefined ? opcoes.amplitude : 0.4;
  var frequencia     = opcoes.frequencia !== undefined ? opcoes.frequencia : 0.18;
  var velocidadeOnda = opcoes.velocidadeOnda !== undefined ? opcoes.velocidadeOnda : 1.2;
  var corSuperficie  = opcoes.corSuperficie !== undefined ? opcoes.corSuperficie : 0x6dc4d8;
  var corFundo       = opcoes.corFundo !== undefined ? opcoes.corFundo : 0x1a4068;
  var corEspuma      = opcoes.corEspuma !== undefined ? opcoes.corEspuma : 0xeaf3f7;
  var espumaBordas   = opcoes.espumaBordas !== undefined ? opcoes.espumaBordas : true;
  var opacidade      = opcoes.opacidade !== undefined ? opcoes.opacidade : 0.92;
  // Eixos pra calcular as ondas (2 dimensoes do plano horizontal). Pro rio
  // (eixo Y como altura), as ondas variam ao longo de X e Z. Pro oceano
  // (eixo Z como altura local), variam ao longo de X e Y.
  var eixoOnda1 = (eixoAltura === 'z') ? 'x' : 'x';
  var eixoOnda2 = (eixoAltura === 'z') ? 'y' : 'z';

  var uniforms = {
    time:           { value: 0 },
    amplitude:      { value: amplitude },
    frequencia:     { value: frequencia },
    velocidadeOnda: { value: velocidadeOnda },
    corSuperficie:  { value: new THREE.Color(corSuperficie) },
    corFundo:       { value: new THREE.Color(corFundo) },
    corEspuma:      { value: new THREE.Color(corEspuma) },
    espumaBordas:   { value: espumaBordas ? 1.0 : 0.0 },
    opacidade:      { value: opacidade }
  };

  var vertexShader = [
    'uniform float time;',
    'uniform float amplitude;',
    'uniform float frequencia;',
    'uniform float velocidadeOnda;',
    'varying vec2 vUv;',
    'varying float vOnda;',
    'void main() {',
    '  vUv = uv;',
    '  vec3 pos = position;',
    // 2 senoides somadas (freq/vel diferentes) → padrao mais natural que 1 onda
    '  float onda1 = sin(position.' + eixoOnda1 + ' * frequencia + time * velocidadeOnda) * amplitude;',
    '  float onda2 = sin(position.' + eixoOnda2 + ' * frequencia * 1.4 + time * velocidadeOnda * 0.7) * amplitude * 0.6;',
    '  float deslocamento = onda1 + onda2;',
    '  pos.' + eixoAltura + ' += deslocamento;',
    '  vOnda = deslocamento;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);',
    '}'
  ].join('\n');

  var fragmentShader = [
    'uniform vec3 corSuperficie;',
    'uniform vec3 corFundo;',
    'uniform vec3 corEspuma;',
    'uniform float amplitude;',
    'uniform float espumaBordas;',
    'uniform float opacidade;',
    'varying vec2 vUv;',
    'varying float vOnda;',
    'void main() {',
    // Cor base: ondas mais altas (cristas) puxam pro tom claro/superficie;
    // mais baixas (vales) puxam pro fundo escuro
    '  float fatorOnda = clamp((vOnda + amplitude) / (amplitude * 2.0), 0.0, 1.0);',
    '  vec3 cor = mix(corFundo, corSuperficie, fatorOnda);',
    // Espuma sutil em cristas altas (pico das ondas) — bem leve pra nao
    // virar manchas chamativas
    '  float foamCrista = smoothstep(amplitude * 0.7, amplitude * 1.0, vOnda);',
    '  cor = mix(cor, corEspuma, foamCrista * 0.18);',
    // Espuma nas margens (so se espumaBordas=1) — UV.x proximo de 0/1 = borda
    // Faixa estreita e com mistura mais leve pra parecer "lambida" da agua
    '  if (espumaBordas > 0.5) {',
    '    float distBorda = min(vUv.x, 1.0 - vUv.x);',
    '    float foamMargem = 1.0 - smoothstep(0.0, 0.025, distBorda);',
    '    cor = mix(cor, corEspuma, foamMargem * 0.4);',
    '  }',
    '  gl_FragColor = vec4(cor, opacidade);',
    '}'
  ].join('\n');

  var mat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false  // evita Z-fighting com terreno em areas rasas
  });

  MATERIAIS_AGUA.push(mat);
  return mat;
}

// Avanca o tempo de cada material de agua pro loop de animacao em main.js.
// delta vem do THREE.Clock — segundos desde o ultimo frame.
function atualizarAguas(delta) {
  for (var i = 0; i < MATERIAIS_AGUA.length; i++) {
    MATERIAIS_AGUA[i].uniforms.time.value += delta;
  }
}
