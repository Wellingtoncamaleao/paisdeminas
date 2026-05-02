// Colisao: testa se uma posicao (x,z) eh livre de arvores/pedras e dentro do mundo
function podeMover(x, z) {
  var margem = 0.5; // raio do personagem

  // Limites do mundo
  if (x < -195 || x > 195 || z < -195 || z > 195) return false;

  // Arvores
  for (var i = 0; i < arvoresPos.length; i++) {
    var arv = arvoresPos[i];
    var dx = x - arv.x;
    var dz = z - arv.z;
    var raio = arv.raio + margem;
    if (dx * dx + dz * dz < raio * raio) return false;
  }

  // Pedras
  for (var j = 0; j < pedrasPos.length; j++) {
    var ped = pedrasPos[j];
    var dx2 = x - ped.x;
    var dz2 = z - ped.z;
    var raio2 = ped.raio + margem;
    if (dx2 * dx2 + dz2 * dz2 < raio2 * raio2) return false;
  }

  return true;
}
