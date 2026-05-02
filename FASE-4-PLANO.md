# Fase 4 — Multiplayer com persistência server-side

## Problema

Hoje o jogo é 100% client-side. Cada usuário tem o próprio mundo isolado em `localStorage`. Não dá pra:
- Compartilhar o mundo: dois jogadores podem clamar o mesmo terreno simultaneamente
- Ver outros jogadores
- Ter conta persistente (limpou cache → perdeu progresso)
- Vender nomes "limpos" depois (Victor vs Victor1) — não tem sistema de identidade

## Solução

Backend **PHP 8.2 + Apache + SQLite** rodando no mesmo container. Auth simples (nome + senha), token salvo em `localStorage`. Estado do jogo (claim, cabanas, fogueiras, inventário) migra do `localStorage` pra tabelas SQLite.

Realtime via **polling a cada 2-3s** (sem WebSocket na V1). Suficiente pra ver outros jogadores andando "em tempo quase-real".

## Por que SQLite (e não Supabase)

- Container autocontido — `git push` deploya tudo (inclui DB schema)
- Backup é copiar 1 arquivo
- Wellington roda futuras alterações sozinho via push (sem dashboard externo)
- Free, sem dependência de serviço terceiro

## Stack

| Componente | Tecnologia |
|---|---|
| Backend | PHP 8.2 + Apache (imagem `php:8.2-apache`) |
| Banco | SQLite via PDO, arquivo em `/var/www/data/paisdeminas.db` |
| Volume Docker | `/var/www/data` montado como volume persistente no Easypanel |
| Auth | Hash bcrypt + token aleatório (hex 64) salvo em `localStorage` |
| Realtime | Polling 2-3s (sem WebSocket) |

## Schema

```sql
CREATE TABLE players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  token TEXT,
  cor_camisa TEXT DEFAULT '#7a4a26',
  criado_em TEXT DEFAULT (datetime('now'))
);

CREATE TABLE claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER UNIQUE NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  x REAL NOT NULL,
  z REAL NOT NULL,
  larg REAL NOT NULL,
  prof REAL NOT NULL,
  rot_y REAL NOT NULL DEFAULT 0,
  criado_em TEXT DEFAULT (datetime('now'))
);

CREATE TABLE cabanas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,         -- pequena | media | grande
  x REAL NOT NULL,
  z REAL NOT NULL,
  rot_y REAL NOT NULL DEFAULT 0,
  criado_em TEXT DEFAULT (datetime('now'))
);

CREATE TABLE fogueiras (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  x REAL NOT NULL,
  z REAL NOT NULL,
  ativa INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT DEFAULT (datetime('now'))
);

CREATE TABLE inventarios (
  player_id INTEGER PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  madeira INTEGER NOT NULL DEFAULT 0,
  pedra INTEGER NOT NULL DEFAULT 0,
  atualizado_em TEXT DEFAULT (datetime('now'))
);

CREATE TABLE posicoes_atuais (
  player_id INTEGER PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  x REAL NOT NULL,
  z REAL NOT NULL,
  rot_y REAL NOT NULL,
  atualizado_em TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_cabanas_player ON cabanas(player_id);
CREATE INDEX idx_fogueiras_player ON fogueiras(player_id);
CREATE INDEX idx_posicoes_atualizado ON posicoes_atuais(atualizado_em);
```

## Endpoints REST

Todos retornam JSON. Auth via header `X-Token` (exceto registrar/login).

| Método | Rota | Função |
|---|---|---|
| POST | `/api/auth.php?action=registrar` | nome + senha → cria conta + token |
| POST | `/api/auth.php?action=login` | nome + senha → token |
| GET | `/api/state.php` | retorna {claim, cabanas[], fogueiras[], inventario} do player atual |
| POST | `/api/state.php?action=salvar_claim` | x, z, larg, prof, rot_y → valida overlap + insere |
| POST | `/api/state.php?action=salvar_cabana` | tipo, x, z, rot_y → insere |
| POST | `/api/state.php?action=salvar_fogueira` | x, z → insere |
| POST | `/api/state.php?action=apagar_fogueira` | id, ativa → atualiza |
| POST | `/api/state.php?action=salvar_inventario` | madeira, pedra → upsert |
| POST | `/api/state.php?action=ping_posicao` | x, z, rot_y → upsert posicoes_atuais (chamado a cada ~2s) |
| GET | `/api/players.php` | retorna posições + claims/cabanas de TODOS players ativos (polling 2s) |

## Validação de nome

- Mínimo 4 chars, máximo 20
- Regex: `/^[A-Za-z0-9_]+$/` (alfanumérico + underscore)
- **Precisa ter pelo menos 1 dígito** — reserva nomes "limpos" pra venda futura
- Exemplo: `Victor` ❌, `Victor1` ✅, `Vitinho2026` ✅, `ana` ❌ (curto + sem dígito)

## Validação de senha

- Mínimo 4 chars, máximo 30 chars
- Sem outras restrições (V1 simples)

## Validação de claim único

Ao tentar clamar:
1. Rodar query: existe algum claim cujo bbox sobrepõe (x±larg/2, z±prof/2)?
2. Se sim, retorna 409 Conflict com nome do dono atual
3. Se não, INSERT atômico com `UNIQUE(player_id)` (cada player só pode ter 1 claim na V1)

## Mundo único

Todos os players estão no mesmo MG 1500. Sem salas/shards na V1.

## Cores variáveis

Camisa do colono varia por player: hash do nome → cor estável. `cor_camisa` salva no banco pra render dos outros (Fase 4.2).

## Critérios de aceite — V4.0

- [ ] Tela de login aparece antes do jogo
- [ ] Não aceita nome sem dígito (`Victor` rejeitado, `Victor1` aceito)
- [ ] Senha mínima 4 chars
- [ ] Após login, jogo carrega com estado do banco (não localStorage)
- [ ] Clamar terreno chama API, valida overlap server-side
- [ ] Construir cabana persiste no banco
- [ ] Coletar madeira persiste no banco (debounce ~2s)
- [ ] Recarregar a página → estado do banco volta
- [ ] Limpar localStorage → token some, jogo pede login de novo
- [ ] Token continua válido entre sessões (não expira na V1)

## Fases sub-divididas

| Sub-fase | Escopo | Tempo |
|---|---|---|
| **4.0** | Backend + Auth + persistência básica (esta) | ~5h |
| **4.1** | Outros jogadores: ver claims, cabanas, fogueiras dos outros (estático) | ~3h |
| **4.2** | Outros jogadores: avatares andando em tempo real (polling) | ~4h |

## Setup adicional no Easypanel (Wellington)

Após o primeiro push:
1. Easypanel → app paisdeminas → **Volumes** → adicionar:
   - **Source**: `paisdeminas-data` (volume nomeado, persistente)
   - **Mount**: `/var/www/data`
2. Reiniciar container
3. Schema é criado automaticamente no primeiro acesso (db.php cuida)

## Notas pro futuro

- **Cerca completa entre estacas**: feature visual — gasta madeira pra construir cerca real entre as 4 estacas. Anotado.
- **Minérios como moeda**: ouro + outros minérios serão recursos especiais com peso de valor diferente. Pode virar economia: troca entre players, mineração, etc. Anotado pra Fase 5.
- **WebSocket**: se polling 2s ficar limitante (ex: muitos players, lag visível), migra pra Ratchet (PHP) ou container Node ws separado.
