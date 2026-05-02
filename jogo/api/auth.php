<?php
// Endpoints de autenticacao: registrar e login
// Ambos retornam { token, player: { id, nome, cor_camisa } } em sucesso

declare(strict_types=1);
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResposta(['erro' => 'Método não permitido'], 405);
}

$action = $_GET['action'] ?? '';
$dados = lerJsonBody();

$nome = trim($dados['nome'] ?? '');
$senha = (string)($dados['senha'] ?? '');

if ($action === 'registrar') {
    // Valida
    if ($erro = nomeValido($nome)) jsonResposta(['erro' => $erro], 400);
    if ($erro = senhaValida($senha)) jsonResposta(['erro' => $erro], 400);

    $pdo = obterPdo();

    // Nome ja existe?
    $stmt = $pdo->prepare('SELECT id FROM players WHERE nome = ? LIMIT 1');
    $stmt->execute([$nome]);
    if ($stmt->fetch()) jsonResposta(['erro' => 'Esse nome já está em uso'], 409);

    $hash = password_hash($senha, PASSWORD_BCRYPT);
    $token = gerarToken();
    $cor = corDoNome($nome);

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('INSERT INTO players (nome, senha_hash, token, cor_camisa) VALUES (?, ?, ?, ?)');
        $stmt->execute([$nome, $hash, $token, $cor]);
        $playerId = (int)$pdo->lastInsertId();
        // Inventario inicial vazio
        $pdo->prepare('INSERT INTO inventarios (player_id, madeira, pedra) VALUES (?, 0, 0)')
            ->execute([$playerId]);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        jsonResposta(['erro' => 'Falha ao criar conta'], 500);
    }

    jsonResposta([
        'token' => $token,
        'player' => ['id' => $playerId, 'nome' => $nome, 'cor_camisa' => $cor]
    ]);
}

if ($action === 'login') {
    if ($erro = nomeValido($nome)) jsonResposta(['erro' => $erro], 400);
    if ($erro = senhaValida($senha)) jsonResposta(['erro' => $erro], 400);

    $pdo = obterPdo();
    $stmt = $pdo->prepare('SELECT id, nome, senha_hash, cor_camisa FROM players WHERE nome = ? LIMIT 1');
    $stmt->execute([$nome]);
    $player = $stmt->fetch();
    if (!$player || !password_verify($senha, $player['senha_hash'])) {
        jsonResposta(['erro' => 'Nome ou senha incorretos'], 401);
    }

    // Renova token
    $token = gerarToken();
    $pdo->prepare('UPDATE players SET token = ? WHERE id = ?')->execute([$token, $player['id']]);

    jsonResposta([
        'token' => $token,
        'player' => [
            'id' => $player['id'],
            'nome' => $player['nome'],
            'cor_camisa' => $player['cor_camisa']
        ]
    ]);
}

jsonResposta(['erro' => 'Acao invalida'], 400);
