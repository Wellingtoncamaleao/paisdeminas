<?php
// Conexao SQLite + helpers de inicializacao e verificacao de token
// Banco fica em /var/www/data/paisdeminas.db (volume persistente)

declare(strict_types=1);

const DB_PATH = '/var/www/data/paisdeminas.db';

function obterPdo(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $primeiroAcesso = !file_exists(DB_PATH);

    $pdo = new PDO('sqlite:' . DB_PATH);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->exec('PRAGMA foreign_keys = ON');
    $pdo->exec('PRAGMA journal_mode = WAL');

    if ($primeiroAcesso) {
        $schema = file_get_contents(__DIR__ . '/schema.sql');
        if ($schema !== false) $pdo->exec($schema);
    }

    // Migrations idempotentes pra adaptar bancos antigos a novas colunas
    aplicarMigrations($pdo);

    return $pdo;
}

function aplicarMigrations(PDO $pdo): void {
    $colunas = array_column($pdo->query('PRAGMA table_info(players)')->fetchAll(), 'name');
    if (!in_array('spawn_x', $colunas, true)) {
        $pdo->exec('ALTER TABLE players ADD COLUMN spawn_x REAL');
    }
    if (!in_array('spawn_z', $colunas, true)) {
        $pdo->exec('ALTER TABLE players ADD COLUMN spawn_z REAL');
    }
    $cClaims = array_column($pdo->query('PRAGMA table_info(claims)')->fetchAll(), 'name');
    if (!in_array('pilha_mad_offx', $cClaims, true)) $pdo->exec('ALTER TABLE claims ADD COLUMN pilha_mad_offx REAL');
    if (!in_array('pilha_mad_offz', $cClaims, true)) $pdo->exec('ALTER TABLE claims ADD COLUMN pilha_mad_offz REAL');
    if (!in_array('pilha_ped_offx', $cClaims, true)) $pdo->exec('ALTER TABLE claims ADD COLUMN pilha_ped_offx REAL');
    if (!in_array('pilha_ped_offz', $cClaims, true)) $pdo->exec('ALTER TABLE claims ADD COLUMN pilha_ped_offz REAL');
    if (!in_array('pilha_mad_rot', $cClaims, true)) $pdo->exec('ALTER TABLE claims ADD COLUMN pilha_mad_rot REAL DEFAULT 0');
    if (!in_array('pilha_ped_rot', $cClaims, true)) $pdo->exec('ALTER TABLE claims ADD COLUMN pilha_ped_rot REAL DEFAULT 0');
}

function jsonResposta($dados, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}

function lerJsonBody(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $dados = json_decode($raw, true);
    return is_array($dados) ? $dados : [];
}

// Verifica token do header X-Token e retorna player. Se nao valido, retorna 401.
function exigirAuth(): array {
    $token = $_SERVER['HTTP_X_TOKEN'] ?? '';
    if (!$token) jsonResposta(['erro' => 'Token ausente'], 401);

    $pdo = obterPdo();
    $stmt = $pdo->prepare('SELECT id, nome, cor_camisa FROM players WHERE token = ? LIMIT 1');
    $stmt->execute([$token]);
    $player = $stmt->fetch();
    if (!$player) jsonResposta(['erro' => 'Token invalido'], 401);
    return $player;
}

// Gera token aleatorio (64 chars hex)
function gerarToken(): string {
    return bin2hex(random_bytes(32));
}

// Validacao de nome — pelo menos 1 digito, alfanumerico+_, 4-20 chars
function nomeValido(string $nome): ?string {
    if (strlen($nome) < 4) return 'Nome muito curto (mínimo 4 caracteres)';
    if (strlen($nome) > 20) return 'Nome muito longo (máximo 20 caracteres)';
    if (!preg_match('/^[A-Za-z0-9_]+$/', $nome)) return 'Nome só pode ter letras, números e underscore';
    if (!preg_match('/\d/', $nome)) return 'Nome precisa ter pelo menos 1 número (ex: João1)';
    return null;
}

function senhaValida(string $senha): ?string {
    $len = strlen($senha);
    if ($len < 4) return 'Senha muito curta (mínimo 4 caracteres)';
    if ($len > 30) return 'Senha muito longa (máximo 30 caracteres)';
    return null;
}

// Cor de camisa estavel a partir do nome (hash → HSL)
function corDoNome(string $nome): string {
    $hash = crc32($nome);
    $h = $hash % 360;
    // Saturacao e luminosidade fixas pra cor "rustica"
    return sprintf('hsl(%d, 50%%, 35%%)', abs($h));
}
