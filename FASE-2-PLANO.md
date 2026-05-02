# Fase 2 — Posse e Coleta (V2.0)

**Objetivo**: o jogador caminha, escolhe um terreno, **clama posse** (cerca aparece, salva entre sessoes), e comeca a **coletar madeira e pedra** das arvores e pedras do mundo. Inventario fica visivel no HUD.

**Estimativa**: ~3h de implementacao, sem refazer arquitetura.

---

## 1. O que o Vitinho vai poder fazer (alem do que ja faz na V1.1)

1. Caminhar pela trilha (igual antes)
2. Sair da trilha e parar num lugar bonito (clareira, perto de pedras, etc)
3. Apertar **C** → cerca de madeira aparece em volta dele, mensagem "Esta terra é sua"
4. Cerca persiste — fechar o jogo e abrir de novo, a cerca continua la
5. Aproximar de uma arvore → apertar **E** → ela some, **+3 madeira**
6. Aproximar de uma pedra → apertar **E** → ela some, **+1 pedra**
7. HUD no canto inferior direito mostra "Madeira: X · Pedra: Y" o tempo todo
8. Inventario tambem persiste entre sessoes

---

## 2. Mecanicas

### Claim de terreno
- Tecla **C** dispara `tentarClaim()`
- Validacoes: nao em cima da trilha (distancia minima 5), so 1 claim por jogador na V2.0
- Cria cerca: 16 estacas (cilindros marrons) + 16 travas horizontais conectando as estacas, raio 8 unidades ao redor do jogador
- Salva em `localStorage`: chave `paisdeminas-claim`, valor `{x, z, raio, t}`
- Mensagem de feedback: "Esta terra é sua. Colete madeira e pedra."

### Coleta
- Tecla **E** dispara `tentarColeta()`
- Cooldown 500ms entre coletas
- Procura arvore mais proxima dentro de raio 2.5
  - Se achar: arvore some (escala 0 na InstancedMesh) + `inventario.madeira += 3` + dica "+3 madeira"
- Se nao achar arvore, procura pedra mesma logica → `inventario.pedra += 1` + dica "+1 pedra"
- Inventario persiste em `localStorage` (`paisdeminas-inv`)

### HUD
- Painel canto inferior direito: "Madeira: X" e "Pedra: Y"
- Painel central inferior pra dicas temporarias ("Esta terra é sua", "+3 madeira", etc)
- Estilo: fonte Georgia, cor dourada (`#f6dca5`), background semi-transparente (combina com tela inicial)

---

## 3. Arquivos novos / alterados

```
jogo/
├── index.html                  [+] inclui claim/coleta/hud/inventario
├── css/estilo.css              [~] adiciona estilos do HUD
└── js/
    ├── floresta.js             [~] arvoresPos/pedrasPos guardam refs pra remocao
    ├── controles.js            [~] handlers C e E (one-shot)
    ├── inventario.js           [+] novo
    ├── hud.js                  [+] novo
    ├── claim.js                [+] novo
    ├── coleta.js               [+] novo
    └── main.js                 [~] inicializa novos modulos
```

---

## 4. O que NAO entra na V2.0

- ❌ Construcao de cabana com snap (Fase 3)
- ❌ Multiplos claims por jogador (so 1 na V2.0)
- ❌ Arvores que crescem de volta apos coletadas (mundo nao regenera)
- ❌ Drop de itens visivel no chao (vai direto pro inventario)
- ❌ Limite de inventario / peso
- ❌ Inimigos / NPCs
- ❌ Persistencia do mundo (so claim e inventario persistem; arvores/pedras coletadas voltam ao recarregar — mundo "reseta")

---

## 5. Riscos e mitigacoes

| Risco | Mitigacao |
|---|---|
| Vento sobrescreve arvore removida (matriz volta) | Ao remover, zerar tambem `matrizesOriginais` correspondente |
| Coleta dispara multiplas vezes ao segurar E | Usar keydown one-shot (so na primeira vez que aperta) + cooldown 500ms |
| Cerca z-fighting com terreno | Estacas em y=0.7 (centro do cilindro), travas em y=0.95 — bem acima de y=0 |
| localStorage indisponivel (modo privado) | try/catch — funciona em sessao mas nao persiste |
| Coletas grandes derrubam fps | InstancedMesh.setMatrixAt e barato, sem problema |

---

## 6. Aceite V2.0

- [ ] Aperta C com personagem fora da trilha → cerca aparece, mensagem confirma
- [ ] Aperta C em cima da trilha → mensagem "Saia da trilha" (nao clama)
- [ ] Recarrega o jogo → cerca aparece no mesmo lugar
- [ ] Aproxima de uma arvore e aperta E → arvore some, HUD mostra "Madeira: 3"
- [ ] Aproxima de uma pedra e aperta E → pedra some, HUD mostra "Pedra: 1"
- [ ] Recarrega o jogo → inventario continua com mesmos valores
- [ ] Sem regressoes: WASD anda, mouse gira, sombras OK, vento OK
