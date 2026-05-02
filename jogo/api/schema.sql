-- Schema do Pais de Minas (SQLite)
-- Aplicado automaticamente em db.php se as tabelas nao existirem

CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT UNIQUE NOT NULL COLLATE NOCASE,
  senha_hash TEXT NOT NULL,
  token TEXT,
  cor_camisa TEXT DEFAULT '#7a4a26',
  criado_em TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_players_token ON players(token);

CREATE TABLE IF NOT EXISTS claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER UNIQUE NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  x REAL NOT NULL,
  z REAL NOT NULL,
  larg REAL NOT NULL,
  prof REAL NOT NULL,
  rot_y REAL NOT NULL DEFAULT 0,
  criado_em TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cabanas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  x REAL NOT NULL,
  z REAL NOT NULL,
  rot_y REAL NOT NULL DEFAULT 0,
  criado_em TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cabanas_player ON cabanas(player_id);

CREATE TABLE IF NOT EXISTS fogueiras (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  x REAL NOT NULL,
  z REAL NOT NULL,
  ativa INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_fogueiras_player ON fogueiras(player_id);

CREATE TABLE IF NOT EXISTS inventarios (
  player_id INTEGER PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  madeira INTEGER NOT NULL DEFAULT 0,
  pedra INTEGER NOT NULL DEFAULT 0,
  atualizado_em TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS posicoes_atuais (
  player_id INTEGER PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  x REAL NOT NULL,
  z REAL NOT NULL,
  rot_y REAL NOT NULL,
  atualizado_em TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_posicoes_atualizado ON posicoes_atuais(atualizado_em);
