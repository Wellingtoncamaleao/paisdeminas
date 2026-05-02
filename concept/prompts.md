# Prompts usados — Concept Art "Minas Gerais 1500"

Geradas em 2026-05-01 via OpenAI `gpt-image-1` (chave na VPS).

**Config comum:**
- Modelo: `gpt-image-1`
- Tamanho: `1536x1024` (landscape)
- Qualidade: `medium`
- N: 1 por chamada
- Custo: ~$0.04/imagem × 4 = ~$0.17 total

Pra regerar/variar, dá pra usar [.gera-imagens.sh](.gera-imagens.sh) (script que rodou no container `matrix-core` da VPS).

---

## 01 — Trilha ao amanhecer
**Arquivo:** [concept-01-trilha-amanhecer.png](concept-01-trilha-amanhecer.png)
**Cena:** abertura do jogo, "Bem-vindo a Minas Gerais. Caminhe e escolha seu terreno."

```
Cinematic wide-angle landscape concept art of a historical hiking trail through dense Brazilian Atlantic Forest in the highlands of Minas Gerais in the 1500s, untouched primal wilderness, golden dawn light filtering through morning mist, lush ferns and tropical hardwood trees, distant mountains barely visible through fog, no people, no buildings, photorealistic painterly style, peaceful contemplative atmosphere, inspired by Slow Roads game and Red Dead Redemption 2 visuals
```

---

## 02 — Clareira do rio
**Arquivo:** [concept-02-clareira-rio.png](concept-02-clareira-rio.png)
**Cena:** lugar candidato para o jogador clamar terreno (clareira ampla, rio cortando, pedras lisas no leito).

```
Cinematic concept art of a wide forest clearing beside a clear river in the highlands of Minas Gerais Brazil in the 1500s, ideal homestead location, soft afternoon golden light, dense Atlantic tropical jungle surrounding the clearing, pebbled riverbank with smooth stones, no buildings, no people, painterly photorealistic style, lush vegetation, peaceful uninhabited primal wilderness
```

---

## 03 — Coleta de recursos (primeira pessoa)
**Arquivo:** [concept-03-coleta-recursos.png](concept-03-coleta-recursos.png)
**Cena:** primeiras ações do jogador, mãos coletando pedras e madeira na floresta.

```
First-person view concept art of human hands collecting stones and wooden logs from the forest floor in the Brazilian Atlantic Forest in the 1500s, dense moss-covered ground, ferns and tropical undergrowth, golden dappled sunlight through the canopy, survival game perspective, photorealistic painterly style, immersive forest atmosphere, no other people
```

---

## 04 — Cabana rústica
**Arquivo:** [concept-04-cabana-rustica.png](concept-04-cabana-rustica.png)
**Cena:** primeira recompensa visual depois de coletar — cabana de madeira com telhado de palha, fumacinha na chaminé.

```
Cinematic concept art of a small rustic wooden cabin freshly built in a forest clearing in the Brazilian Atlantic Forest of Minas Gerais in the 1500s, primitive construction with rough logs and thatched palm roof, surrounded by dense tropical jungle, thin smoke rising from a stone chimney, golden hour light, peaceful pioneer settlement atmosphere, photorealistic painterly style, no people visible
```

---

## Notas pra próximas iterações

- Se quiser **mais detalhe/qualidade**, trocar `quality:medium` por `quality:high` no script (custo: ~$0.17/imagem, 4× mais caro).
- Pra **portrait** (cenas verticais como personagem em pé): trocar `size` para `1024x1536`.
- Pra manter **consistência de paleta** entre novas cenas, repetir os termos âncora: *"Brazilian Atlantic Forest", "Minas Gerais 1500s", "golden hour light", "photorealistic painterly style"*.
- Cenas que ainda não temos e podem ser úteis: vista panorâmica da Serra do Espinhaço, fauna nativa (capivara/onça-pintada/tucano), avatar de colono, marco de "claim" (pedra empilhada/totem).
