# 🗺️ Projeto: Minas Gerais 1500 (Ideação V2.0)
**Equipe:** Wellington & Vitinho  
**Stack:** Go (Backend/VPS) + Three.js (Frontend/Web) + Supabase (Database)

---

## 1. Visão Geral e Ambientação
O jogo é um simulador de colonização realista ambientado em uma versão inabitada das terras de Minas Gerais nos anos 1500. 
- **O Início:** O jogador começa após a criação do avatar, surgindo em uma trilha histórica ao amanhecer.
- **Imersão:** Mensagem de boas-vindas: "Bem-vindo a Minas Gerais. Caminhe e escolha seu terreno."
- **Estética:** Realismo focado em vegetação densa, rios e névoa matinal (estilo *Slow Roads*).

## 2. Dinâmica de Gameplay (O Primeiro Dia)
- **Exploração Livre:** O jogador caminha pela trilha e mata até encontrar um local vago que lhe agrade (ex: perto de um rio ou em uma clareira).
- **Sistema de Claim (Posse):** Ao encontrar o local, o jogador ativa uma função para "Clamar Terreno". O servidor em Go valida se a área está livre e registra as coordenadas no Supabase.
- **Coleta Manual:** Primeiras ações envolvem coletar pedras e madeira do próprio lote para iniciar a primeira estrutura.

## 3. Arquitetura Técnica (Instruções para o Claude)

### A. Backend (Go - Alta Performance)
- **Gerenciamento de Mundo:** Servidor em Go rodando em VPS para validar movimentação e posse de terras.
- **WebSockets:** Comunicação bidirecional para que vizinhos vejam uns aos outros explorando em tempo real.
- **Concorrência:** Uso de Goroutines para lidar com múltiplos exploradores simultâneos.

### B. Frontend (Three.js - Web)
- **Renderização de Terreno:** Sistema de mundo aberto que carrega conforme o jogador caminha.
- **Sistema de Build:** Interface de construção inspirada em *Satisfactory* (sistema de encaixe/snap).
- **Interface:** Menu minimalista e transparente para não quebrar a imersão histórica.

### C. Persistência (Supabase)
- **Tabelas Principais:**
    - `players`: Perfil, avatar e inventário.
    - `world_chunks`: Dados de cada lote (coordenadas, dono e objetos construídos).

---

## 4. Roteiro de Implementação Inicial
1. Criar o "Mundo Vazio" em Three.js com uma trilha e sistema de colisão.
2. Implementar o servidor em Go para registrar a entrada de novos jogadores.
3. Criar a lógica de "Check-in" de terreno: o Front envia a posição atual e o Back reserva aquele quadrante para o jogador.