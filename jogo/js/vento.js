// Vento sutil: rotacao Z senoidal nas copas das arvores
// Usa as matrizes originais salvas em floresta.js + multiplica por uma rotacao a cada frame
var tempoVento = 0;
var matrizTempVento = new THREE.Matrix4();
var matrizRotZVento = new THREE.Matrix4();
var matrizFinalVento = new THREE.Matrix4();

function atualizarVento(delta) {
  if (typeof copasParaVento === 'undefined' || copasParaVento.length === 0) return;
  tempoVento += delta;

  for (var k = 0; k < copasParaVento.length; k++) {
    var item = copasParaVento[k];
    var arr = item.matrizesOriginais;
    var count = item.mesh.count;
    var intens = item.intensidade;

    for (var i = 0; i < count; i++) {
      // Carrega matriz original (16 floats por instancia)
      matrizTempVento.fromArray(arr, i * 16);

      // Calcula rotacao Z do vento (offset por instancia pra dessincronizar)
      var swing = Math.sin(tempoVento * 0.9 + i * 0.73) * intens;
      var swingX = Math.cos(tempoVento * 0.7 + i * 0.51) * intens * 0.5;
      matrizRotZVento.makeRotationFromEuler(new THREE.Euler(swingX, 0, swing));

      // Final = original × rot (rotacao em coords locais da arvore)
      matrizFinalVento.multiplyMatrices(matrizTempVento, matrizRotZVento);
      item.mesh.setMatrixAt(i, matrizFinalVento);
    }

    item.mesh.instanceMatrix.needsUpdate = true;
  }
}
