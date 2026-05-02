# Minas Gerais 1500
### Um simulador de colonização ambientado nas terras virgens de Minas Gerais

---

## A ideia em uma linha

Você surge sozinho numa trilha de Mata Atlântica ao amanhecer, em uma versão da Minas Gerais dos anos 1500 antes da chegada de qualquer um. Caminha, escolhe um terreno, planta sua primeira pedra. O resto é com você.

---

## Como o jogo começa

O jogador entra no mundo e lê uma única mensagem:

> **"Bem-vindo a Minas Gerais. Caminhe e escolha seu terreno."**

A partir daí, ele caminha por uma trilha histórica em meio a vegetação densa, neblina baixa e luz dourada de manhã cedo. Pode parar em qualquer lugar — perto de um rio, numa clareira, no alto de uma encosta — e clamar aquele pedaço de terra como seu. O servidor confirma se a área está livre, registra suas coordenadas, e a partir dali aquele lote é dele.

Com o terreno em mãos, ele começa a coletar pedras e madeira do próprio lote, levanta uma cabana rústica, e a partir desse ponto começa a construir do nada uma vida no mundo selvagem. Conforme outros jogadores chegam, novos vizinhos vão aparecendo nas trilhas, cada um colonizando um pedaço diferente do mapa.

---

## Por que esse jogo

A maioria dos jogos de mundo aberto te dá um cenário pronto, missões prontas, um caminho a seguir. **Minas Gerais 1500** faz o oposto: te coloca num mundo cru, sem narrativa imposta, sem objetivo dado. O sentido vem de você mesmo — onde construir, o que coletar, quem ser.

A inspiração estética vem de jogos como *Slow Roads* (a contemplação da paisagem) e *Red Dead Redemption 2* (densidade visual e atmosfera), e a inspiração de gameplay vem de *Satisfactory* (sistema de construção com encaixe) e simuladores de sobrevivência clássicos como *Rust* e *Valheim* — mas com o recorte histórico-geográfico do Brasil colonial mineiro.

---

## O time

O projeto está sendo feito por **Vitinho (10 anos)** com apoio do pai (Wellington, desenvolvedor de software). É o primeiro projeto sério de programação do Vitinho, e a escolha de fazer um jogo desse porte vem da vontade dele de criar algo grande, do tamanho da imaginação dele.

---

## Estado atual

- **Fase 0 — Ideação**: pitch e direção estética definidos (concept art em anexo)
- **Fase 1 — Mundo navegável**: em desenvolvimento (jogador caminha pela trilha em terceira pessoa)
- **Fase 2 — Posse e coleta**: clamar terreno + coletar recursos
- **Fase 3 — Construção**: sistema de encaixe inspirado em *Satisfactory*
- **Fase 4 — Multiplayer**: servidor em Go com WebSockets, persistência em Supabase, vizinhos visíveis em tempo real

---

## Estética (ver imagens em anexo)

As 4 imagens de concept art que acompanham este documento dão o tom visual do jogo:

1. **Trilha ao amanhecer** — a primeira coisa que o jogador vê
2. **Clareira do rio** — um dos lugares possíveis pra clamar como lar
3. **Coleta de recursos** — primeiras ações do jogador, em primeira pessoa
4. **Cabana rústica** — primeira construção, recompensa visual da primeira jornada

Paleta: verdes profundos da Mata Atlântica, dourado do amanhecer mineiro, azul-acinzentado da névoa.

---

*Projeto em desenvolvimento ativo. Comentários, sugestões e curiosidade são bem-vindos.*
