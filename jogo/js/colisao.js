// Colisao: testa se uma posicao (x,z) eh livre de arvores/pedras/paredes e dentro do mundo
var paredesCabana = []; // retangulos de parede {x, z, larg, prof, rotY}

function podeMover(x, z) {
  var margem = 0.5; // raio do personagem

  // Limites do mundo: silhueta de MG (mapa-mg.js).
  // Fallback retangular caso mapa-mg.js nao esteja disponivel.
  if (typeof dentroDoEstado === 'function') {
    if (!dentroDoEstado(x, z)) return false;
  } else if (x < -195 || x > 195 || z < -195 || z > 195) {
    return false;
  }

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

  // Paredes de cabanas (retangulos rotacionados)
  for (var k = 0; k < paredesCabana.length; k++) {
    if (colideRetCirc(x, z, paredesCabana[k], margem)) return false;
  }

  return true;
}

// Colisao circulo-retangulo rotacionado:
// transforma o ponto pro espaco local do retangulo, faz AABB clamp
function colideRetCirc(px, pz, ret, raio) {
  var dx = px - ret.x;
  var dz = pz - ret.z;
  var cosR = Math.cos(-ret.rotY);
  var sinR = Math.sin(-ret.rotY);
  var localX = dx * cosR - dz * sinR;
  var localZ = dx * sinR + dz * cosR;
  var halfW = ret.larg / 2;
  var halfP = ret.prof / 2;
  var clampX = Math.max(-halfW, Math.min(halfW, localX));
  var clampZ = Math.max(-halfP, Math.min(halfP, localZ));
  var distX = localX - clampX;
  var distZ = localZ - clampZ;
  return (distX * distX + distZ * distZ) < (raio * raio);
}
