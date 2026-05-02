<?php
// Endpoint de estado do player atual (autenticado)
// GET  /api/state.php                       → estado completo (claim, cabanas, fogueiras, inventario)
// POST /api/state.php?action=salvar_claim   → tenta clamar terreno (valida overlap)
// POST /api/state.php?action=salvar_cabana  → adiciona cabana
// POST /api/state.php?action=apagar_cabana  → remove cabana por id
// POST /api/state.php?action=salvar_fogueira → adiciona fogueira (retorna id)
// POST /api/state.php?action=apagar_fogueira → seta ativa=0 ou remove (id)
// POST /api/state.php?action=salvar_inventario → upsert {madeira, pedra}
// POST /api/state.php?action=ping_posicao → upsert posicoes_atuais

declare(strict_types=1);
require_once __DIR__ . '/db.php';

$player = exigirAuth();
$pdo = obterPdo();
$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo === 'GET') {
    // Spawn salvo do player (null se primeiro acesso)
    $stmt = $pdo->prepare('SELECT spawn_x, spawn_z FROM players WHERE id = ? LIMIT 1');
    $stmt->execute([$player['id']]);
    $spawnRow = $stmt->fetch();
    $spawn = null;
    if ($spawnRow && $spawnRow['spawn_x'] !== null) {
        $spawn = ['x' => (float)$spawnRow['spawn_x'], 'z' => (float)$spawnRow['spawn_z']];
    }
    $player['spawn'] = $spawn;

    // Carrega estado completo do player
    $claim = null;
    $stmt = $pdo->prepare('SELECT x, z, larg, prof, rot_y, pilha_mad_offx, pilha_mad_offz, pilha_ped_offx, pilha_ped_offz FROM claims WHERE player_id = ? LIMIT 1');
    $stmt->execute([$player['id']]);
    if ($row = $stmt->fetch()) {
        $claim = [
            'x' => (float)$row['x'], 'z' => (float)$row['z'],
            'larg' => (float)$row['larg'], 'prof' => (float)$row['prof'],
            'rotY' => (float)$row['rot_y'],
            'pilhaMadOffX' => $row['pilha_mad_offx'] !== null ? (float)$row['pilha_mad_offx'] : null,
            'pilhaMadOffZ' => $row['pilha_mad_offz'] !== null ? (float)$row['pilha_mad_offz'] : null,
            'pilhaPedOffX' => $row['pilha_ped_offx'] !== null ? (float)$row['pilha_ped_offx'] : null,
            'pilhaPedOffZ' => $row['pilha_ped_offz'] !== null ? (float)$row['pilha_ped_offz'] : null,
        ];
    }

    $stmt = $pdo->prepare('SELECT id, tipo, x, z, rot_y FROM cabanas WHERE player_id = ?');
    $stmt->execute([$player['id']]);
    $cabanas = array_map(fn($r) => [
        'id' => (int)$r['id'], 'tipo' => $r['tipo'],
        'x' => (float)$r['x'], 'z' => (float)$r['z'], 'rotY' => (float)$r['rot_y']
    ], $stmt->fetchAll());

    $stmt = $pdo->prepare('SELECT id, x, z, ativa FROM fogueiras WHERE player_id = ?');
    $stmt->execute([$player['id']]);
    $fogueiras = array_map(fn($r) => [
        'id' => (int)$r['id'], 'x' => (float)$r['x'], 'z' => (float)$r['z'],
        'ativa' => (bool)$r['ativa']
    ], $stmt->fetchAll());

    $stmt = $pdo->prepare('SELECT madeira, pedra FROM inventarios WHERE player_id = ? LIMIT 1');
    $stmt->execute([$player['id']]);
    $inv = $stmt->fetch() ?: ['madeira' => 0, 'pedra' => 0];

    jsonResposta([
        'player' => $player,
        'claim' => $claim,
        'cabanas' => $cabanas,
        'fogueiras' => $fogueiras,
        'inventario' => ['madeira' => (int)$inv['madeira'], 'pedra' => (int)$inv['pedra']]
    ]);
}

if ($metodo !== 'POST') {
    jsonResposta(['erro' => 'Método não permitido'], 405);
}

$action = $_GET['action'] ?? '';
$dados = lerJsonBody();

if ($action === 'salvar_claim') {
    $x = (float)($dados['x'] ?? 0);
    $z = (float)($dados['z'] ?? 0);
    $larg = (float)($dados['larg'] ?? 24);
    $prof = (float)($dados['prof'] ?? 16);
    $rotY = (float)($dados['rotY'] ?? 0);

    // Carrega claims de outros players uma vez
    $stmt = $pdo->prepare('
        SELECT p.nome, c.x, c.z, c.larg, c.prof, c.rot_y
        FROM claims c JOIN players p ON p.id = c.player_id
        WHERE c.player_id != ?
    ');
    $stmt->execute([$player['id']]);
    $outros = $stmt->fetchAll();

    // Valida overlap com claims de OUTROS players (distancia entre centros)
    $meiaDiag = sqrt($larg * $larg + $prof * $prof) / 2;
    foreach ($outros as $outro) {
        $dx = $x - (float)$outro['x'];
        $dz = $z - (float)$outro['z'];
        $dist = sqrt($dx * $dx + $dz * $dz);
        $diagOutro = sqrt($outro['larg'] * $outro['larg'] + $outro['prof'] * $outro['prof']) / 2;
        if ($dist < ($meiaDiag + $diagOutro - 0.5)) {
            jsonResposta(['erro' => 'Esse terreno já é de ' . $outro['nome']], 409);
        }
    }

    // SOBRESCREVE rotY com a do vizinho mais proximo (raio 50m)
    // Garante alinhamento mesmo se client estava com claimsOutros desatualizado
    $menorDist = INF;
    $rotVizinho = null;
    foreach ($outros as $outro) {
        $dx = $x - (float)$outro['x'];
        $dz = $z - (float)$outro['z'];
        $dist = sqrt($dx * $dx + $dz * $dz);
        if ($dist < 50 && $dist < $menorDist) {
            $menorDist = $dist;
            $rotVizinho = (float)$outro['rot_y'];
        }
    }
    if ($rotVizinho !== null) $rotY = $rotVizinho;

    // INSERT (com UNIQUE em player_id, falha se ja tem claim)
    try {
        $stmt = $pdo->prepare('INSERT INTO claims (player_id, x, z, larg, prof, rot_y) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([$player['id'], $x, $z, $larg, $prof, $rotY]);
        jsonResposta(['ok' => true, 'id' => (int)$pdo->lastInsertId(), 'rotY' => $rotY]);
    } catch (PDOException $e) {
        jsonResposta(['erro' => 'Você já tem um terreno'], 409);
    }
}

if ($action === 'salvar_cabana') {
    $tipo = $dados['tipo'] ?? '';
    if (!in_array($tipo, ['pequena', 'media', 'grande'], true)) {
        jsonResposta(['erro' => 'Tipo inválido'], 400);
    }
    $x = (float)($dados['x'] ?? 0);
    $z = (float)($dados['z'] ?? 0);
    $rotY = (float)($dados['rotY'] ?? 0);

    $stmt = $pdo->prepare('INSERT INTO cabanas (player_id, tipo, x, z, rot_y) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([$player['id'], $tipo, $x, $z, $rotY]);
    jsonResposta(['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
}

if ($action === 'apagar_cabana') {
    $id = (int)($dados['id'] ?? 0);
    $stmt = $pdo->prepare('DELETE FROM cabanas WHERE id = ? AND player_id = ?');
    $stmt->execute([$id, $player['id']]);
    jsonResposta(['ok' => true]);
}

if ($action === 'mover_cabana') {
    $id = (int)($dados['id'] ?? 0);
    $x = (float)($dados['x'] ?? 0);
    $z = (float)($dados['z'] ?? 0);
    $rotY = (float)($dados['rotY'] ?? 0);
    $stmt = $pdo->prepare('UPDATE cabanas SET x = ?, z = ?, rot_y = ? WHERE id = ? AND player_id = ?');
    $stmt->execute([$x, $z, $rotY, $id, $player['id']]);
    jsonResposta(['ok' => true]);
}

if ($action === 'salvar_offset_pilha') {
    $tipo = $dados['tipo'] ?? '';
    $offX = (float)($dados['offX'] ?? 0);
    $offZ = (float)($dados['offZ'] ?? 0);
    $col = null;
    if ($tipo === 'madeira') { $colX = 'pilha_mad_offx'; $colZ = 'pilha_mad_offz'; }
    elseif ($tipo === 'pedra') { $colX = 'pilha_ped_offx'; $colZ = 'pilha_ped_offz'; }
    else jsonResposta(['erro' => 'Tipo invalido'], 400);
    $stmt = $pdo->prepare("UPDATE claims SET $colX = ?, $colZ = ? WHERE player_id = ?");
    $stmt->execute([$offX, $offZ, $player['id']]);
    jsonResposta(['ok' => true]);
}

if ($action === 'mover_fogueira') {
    $id = (int)($dados['id'] ?? 0);
    $x = (float)($dados['x'] ?? 0);
    $z = (float)($dados['z'] ?? 0);
    $stmt = $pdo->prepare('UPDATE fogueiras SET x = ?, z = ? WHERE id = ? AND player_id = ?');
    $stmt->execute([$x, $z, $id, $player['id']]);
    jsonResposta(['ok' => true]);
}

if ($action === 'salvar_fogueira') {
    $x = (float)($dados['x'] ?? 0);
    $z = (float)($dados['z'] ?? 0);
    $stmt = $pdo->prepare('INSERT INTO fogueiras (player_id, x, z, ativa) VALUES (?, ?, ?, 1)');
    $stmt->execute([$player['id'], $x, $z]);
    jsonResposta(['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
}

if ($action === 'apagar_fogueira') {
    $id = (int)($dados['id'] ?? 0);
    $stmt = $pdo->prepare('DELETE FROM fogueiras WHERE id = ? AND player_id = ?');
    $stmt->execute([$id, $player['id']]);
    jsonResposta(['ok' => true]);
}

if ($action === 'set_fogueira_ativa') {
    $id = (int)($dados['id'] ?? 0);
    $ativa = !empty($dados['ativa']) ? 1 : 0;
    $stmt = $pdo->prepare('UPDATE fogueiras SET ativa = ? WHERE id = ? AND player_id = ?');
    $stmt->execute([$ativa, $id, $player['id']]);
    jsonResposta(['ok' => true]);
}

if ($action === 'salvar_inventario') {
    $madeira = max(0, (int)($dados['madeira'] ?? 0));
    $pedra = max(0, (int)($dados['pedra'] ?? 0));
    $stmt = $pdo->prepare('
        INSERT INTO inventarios (player_id, madeira, pedra, atualizado_em)
        VALUES (?, ?, ?, datetime("now"))
        ON CONFLICT(player_id) DO UPDATE SET
            madeira = excluded.madeira,
            pedra = excluded.pedra,
            atualizado_em = excluded.atualizado_em
    ');
    $stmt->execute([$player['id'], $madeira, $pedra]);
    jsonResposta(['ok' => true]);
}

if ($action === 'salvar_spawn') {
    $x = (float)($dados['x'] ?? 0);
    $z = (float)($dados['z'] ?? 0);
    $stmt = $pdo->prepare('UPDATE players SET spawn_x = ?, spawn_z = ? WHERE id = ?');
    $stmt->execute([$x, $z, $player['id']]);
    jsonResposta(['ok' => true]);
}

if ($action === 'ping_posicao') {
    $x = (float)($dados['x'] ?? 0);
    $z = (float)($dados['z'] ?? 0);
    $rotY = (float)($dados['rotY'] ?? 0);
    $stmt = $pdo->prepare('
        INSERT INTO posicoes_atuais (player_id, x, z, rot_y, atualizado_em)
        VALUES (?, ?, ?, ?, datetime("now"))
        ON CONFLICT(player_id) DO UPDATE SET
            x = excluded.x, z = excluded.z, rot_y = excluded.rot_y,
            atualizado_em = excluded.atualizado_em
    ');
    $stmt->execute([$player['id'], $x, $z, $rotY]);
    jsonResposta(['ok' => true]);
}

jsonResposta(['erro' => 'Ação inválida'], 400);
