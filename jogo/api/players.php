<?php
// GET /api/players.php → retorna estado dos OUTROS players (excluindo o atual)
// - jogadores: lista com posicao atual de quem deu ping nos ultimos 60s
// - claims: terrenos clamados por outros (mostra cerca, nao deixa clamar em cima)
// - cabanas: cabanas de outros (visiveis, nao interage)
// - fogueiras: fogueiras de outros (acende/apaga apenas server-side)

declare(strict_types=1);
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResposta(['erro' => 'Método não permitido'], 405);
}

$player = exigirAuth();
$pdo = obterPdo();

$pid = $player['id'];

// Posicoes atuais de jogadores ativos (ping nos ultimos 60s)
$stmt = $pdo->prepare("
    SELECT p.id, p.nome, p.cor_camisa, pa.x, pa.z, pa.rot_y
    FROM posicoes_atuais pa
    JOIN players p ON p.id = pa.player_id
    WHERE pa.player_id != ? AND pa.atualizado_em > datetime('now', '-60 seconds')
");
$stmt->execute([$pid]);
$jogadores = array_map(fn($r) => [
    'id' => (int)$r['id'],
    'nome' => $r['nome'],
    'cor_camisa' => $r['cor_camisa'],
    'x' => (float)$r['x'],
    'z' => (float)$r['z'],
    'rotY' => (float)$r['rot_y']
], $stmt->fetchAll());

// Claims de outros
$stmt = $pdo->prepare("
    SELECT c.id, c.x, c.z, c.larg, c.prof, c.rot_y, p.nome
    FROM claims c JOIN players p ON p.id = c.player_id
    WHERE c.player_id != ?
");
$stmt->execute([$pid]);
$claims = array_map(fn($r) => [
    'id' => (int)$r['id'],
    'x' => (float)$r['x'], 'z' => (float)$r['z'],
    'larg' => (float)$r['larg'], 'prof' => (float)$r['prof'],
    'rotY' => (float)$r['rot_y'],
    'nome' => $r['nome']
], $stmt->fetchAll());

// Cabanas de outros
$stmt = $pdo->prepare("
    SELECT c.id, c.tipo, c.x, c.z, c.rot_y, p.nome
    FROM cabanas c JOIN players p ON p.id = c.player_id
    WHERE c.player_id != ?
");
$stmt->execute([$pid]);
$cabanas = array_map(fn($r) => [
    'id' => (int)$r['id'], 'tipo' => $r['tipo'],
    'x' => (float)$r['x'], 'z' => (float)$r['z'],
    'rotY' => (float)$r['rot_y'],
    'nome' => $r['nome']
], $stmt->fetchAll());

// Fogueiras de outros
$stmt = $pdo->prepare("
    SELECT f.id, f.x, f.z, f.ativa, p.nome
    FROM fogueiras f JOIN players p ON p.id = f.player_id
    WHERE f.player_id != ?
");
$stmt->execute([$pid]);
$fogueiras = array_map(fn($r) => [
    'id' => (int)$r['id'],
    'x' => (float)$r['x'], 'z' => (float)$r['z'],
    'ativa' => (bool)$r['ativa'],
    'nome' => $r['nome']
], $stmt->fetchAll());

jsonResposta([
    'jogadores' => $jogadores,
    'claims' => $claims,
    'cabanas' => $cabanas,
    'fogueiras' => $fogueiras
]);
