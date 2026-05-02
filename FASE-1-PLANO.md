# Fase 1 — Mundo do Vitinho (Versão Funcional 1.0)

**Objetivo**: o Vitinho abre um arquivo `index.html` no navegador e ja ve o personagem dele caminhando pela trilha de Minas Gerais 1500. Tudo roda local, sem servidor, sem instalar nada.

**Estimativa de tempo**: 10-15h de trabalho de implementacao, divididas em 8 etapas com entrega visual em cada uma.

---

## 1. Visao geral — o que o Vitinho vai ver na V1.0

Quando ele abrir o jogo:

1. Tela inicial preta com o titulo "Minas Gerais 1500" e um botao "Comecar"
2. Ao clicar, fade-in pra cena: ele esta numa trilha de terra cortando uma floresta densa de Mata Atlantica
3. E amanhecer — luz dourada, neblina baixa, ceu rosado-laranja
4. Ele ve o personagem dele em terceira pessoa (camera atras)
5. Aparece a mensagem por 5 segundos: **"Bem-vindo a Minas Gerais. Caminhe e escolha seu terreno."**
6. Ele aperta WASD e o personagem comeca a caminhar pela trilha
7. Mouse gira a camera ao redor
8. Shift faz correr
9. Ele NAO atravessa as arvores nem as pedras

Isso e o jogo na V1.0. Ainda nao tem coleta, nao tem clamar terreno, nao tem construcao, nao tem servidor. Mas ja e um **mundo navegavel** — primeira vitoria pro Vitinho.

---

## 2. O que NAO entra na V1.0 (pra controlar escopo)

Lista do que vai vir depois pra nao desanimar misturando tudo agora:

- ❌ Coleta de pedras/madeira (Fase 2)
- ❌ Clamar terreno (Fase 2)
- ❌ Construcao de cabana com snap (Fase 3)
- ❌ Inventario (Fase 2)
- ❌ Outros jogadores (Fase 4 — quando entra o Go + WebSocket)
- ❌ Salvar progresso entre sessoes (Fase 4)
- ❌ Modelos 3D detalhados de pessoa, animais, casas (V1.0 usa **formas geometricas simples** como placeholder; modelos bonitos chegam depois)
- ❌ Audio (talvez entre na V1.0 se sobrar tempo na Etapa 7, senao Fase 2)
- ❌ Dia/noite dinamico (mundo fica fixo no amanhecer na V1.0)
- ❌ Clima/chuva/vento

**Por que tao restrito?** Porque cada item desses e um sub-projeto de horas/dias. Se misturar tudo, leva 3 meses pra ver alguma coisa rodando. V1.0 = base solida pra crescer.

---

## 3. Stack tecnica

| Componente | Escolha | Motivo |
|---|---|---|
| Engine 3D | **Three.js r160** via CDN | mais usado do mundo, tudo que precisamos pronto |
| Linguagem | **Vanilla JS** (sem build, sem modulos ES6) | abre direto no navegador |
| Estilo | CSS puro num arquivo | simples |
| Hospedagem | **arquivo local** na V1.0 | so abrir `index.html` no Chrome |
| Modelos 3D | **geometrias built-in do Three.js** | cilindro = tronco, cone = copa, capsula = personagem |
| Texturas | **cores chapadas + materiais Lambert** | sem precisar baixar texturas |
| Fisica | **raycaster proprio** (sem engine) | suficiente pra V1.0 |
| Camera | **third-person custom** | mais fluido que OrbitControls pra jogo |

**Por que sem modulos ES6 e sem build?** Pra abrir clicando no `.html`. Quando o Vitinho der dois cliques no arquivo, **funciona**. Sem `npm install`, sem `npm run dev`, sem nada. Isso e fundamental pra crianca — barreira zero entre ela e o jogo.

---

## 4. Estrutura de arquivos

```
d:/VICTOR/PAIS DE MINAS/
├── concept/                              [ja existe — concept art da Fase 0]
├── paisdeminas.md                        [ja existe — pitch original]
├── FASE-1-PLANO.md                       [este documento]
└── jogo/                                 [NOVO]
    ├── index.html                        ponto de entrada
    ├── css/
    │   └── estilo.css                    tela inicial + HUD
    ├── js/
    │   ├── main.js                       boot do jogo (cena, camera, render loop)
    │   ├── mundo.js                      terreno, ceu, neblina, iluminacao
    │   ├── trilha.js                     spline da trilha + textura de terra
    │   ├── floresta.js                   arvores e pedras (InstancedMesh)
    │   ├── personagem.js                 avatar + animacao basica
    │   ├── controles.js                  WASD + mouse + shift
    │   ├── camera.js                     camera de terceira pessoa
    │   └── colisao.js                    raycaster pra arvores/pedras/chao
    └── libs/
        └── three.min.js                  Three.js r160 (copia local pra offline)
```

**Convencoes:**
- Variaveis e funcoes em **portugues** (regra do CLAUDE.md global)
- Estado global: `let cena, camera, renderer, personagem, mundo, etc.`
- Cada arquivo expoe uma funcao `init<Modulo>()` que main.js chama na ordem certa

---

## 5. Etapas em ordem — com entrega visual em cada uma

A regra e: **toda etapa termina com algo que o Vitinho consegue ver/testar**. Sem etapa "invisivel".

### Etapa 1 — "Hello, mundo 3D" (1h)
- Cria pasta `jogo/` com `index.html`, `css/estilo.css`, `js/main.js`
- Carrega Three.js via CDN (`<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>`)
- Cria cena, camera perspectiva, renderer WebGL
- Coloca um cubo verde girando no centro
- Render loop com `requestAnimationFrame`
- Redimensionamento responsivo (resize window)

**Entrega**: abrir `index.html`, ver cubo verde girando contra fundo cinza. **Provacao tecnica**: Three.js tá funcionando.

---

### Etapa 2 — Mundo basico (terreno + ceu) (1.5h)
- `mundo.js` cria:
  - Plano gigante (200×200) com material verde (grama)
  - Skybox: cor de fundo gradiente amanhecer (rosa → dourado → azul claro)
  - Neblina (`THREE.Fog`) atmosferica
  - Luz ambiente baixa (azul-acinzentada)
  - Luz direcional (sol) baixa no horizonte, cor dourada
- Ajusta camera pra olhar pro plano de cima

**Entrega**: abrir, ver "campo" verde com ceu de amanhecer e neblina ao fundo. Ja tem clima de Minas Gerais 1500.

---

### Etapa 3 — Personagem + camera de terceira pessoa (2h)
- `personagem.js` cria:
  - `THREE.Group` com `CapsuleGeometry` (corpo) + `SphereGeometry` (cabeca)
  - Cor pele/roupa simples
  - Posicao inicial em `(0, 0, 0)`
- `camera.js` implementa terceira pessoa:
  - Camera fica numa esfera de raio 8 ao redor do personagem
  - Mouse X rotaciona horizontal, Mouse Y rotaciona vertical (com limite pra nao virar de cabeca pra baixo)
  - Camera sempre olha pro personagem
  - Pointer lock (clica na tela e o mouse trava no jogo, igual jogo de FPS)

**Entrega**: ve o personagem em terceira pessoa, mouse gira a camera ao redor dele. Ainda parado.

---

### Etapa 4 — Movimento (WASD + correr) (1.5h)
- `controles.js`:
  - W/S: andar pra frente/tras (relativo a direcao da camera)
  - A/D: lados
  - Shift: corre (2x velocidade)
  - Velocidade andar: 4 unidades/segundo. Correr: 8 u/s
- Animacao bem simples: oscilacao vertical leve quando andando (bobbing)
- Personagem rotaciona pra direcao do movimento

**Entrega**: WASD anda no campo, mouse gira camera, shift corre. **Marco importante** — ja parece um jogo.

---

### Etapa 5 — Trilha de terra (1.5h)
- `trilha.js`:
  - Define spline (curva Catmull-Rom) com 6-8 pontos espalhados pelo mapa, criando uma trilha serpenteando
  - Gera geometria de fita (TubeGeometry ou Mesh customizado) com 3 unidades de largura
  - Material marrom-terra com textura de ruido (`MeshLambertMaterial` + `repeat`)
  - Trilha fica ligeiramente acima do terreno pra nao haver z-fighting

**Entrega**: trilha de terra cortando o campo, serpenteando. Personagem aparece em cima da trilha.

---

### Etapa 6 — Floresta (arvores e pedras) (2h)
- `floresta.js`:
  - **Arvore**: `Group` com `CylinderGeometry` (tronco marrom) + `ConeGeometry` (copa verde escura). Variacoes de altura/largura
  - **Pedra**: `DodecahedronGeometry` cinza com escala aleatoria
  - Usa `InstancedMesh` pra renderizar **300+ arvores e 100+ pedras** com 1 draw call (performance)
  - Distribui aleatoriamente no mapa, MAS:
    - Nao nasce a menos de 3 unidades da spline da trilha
    - Mais densidade longe da trilha, menos perto
  - Variacao de rotacao Y aleatoria (parecer natural)

**Entrega**: trilha rodeada de floresta densa. Mundo deixa de ser "campo aberto" e vira "Mata Atlantica". O concept art comeca a fazer sentido aqui.

---

### Etapa 7 — Colisao (1.5h)
- `colisao.js`:
  - **Chao**: raycaster pra baixo do personagem; ajusta Y pra ficar sempre no chao (nao cair, nao flutuar)
  - **Arvores e pedras**: pra cada movimento, testa raycaster horizontal nas direcoes WASD; se for bater, cancela movimento naquela direcao
  - Gravidade simples (acumula velocidade Y, raycaster trava no chao)
- Otimizacao: so testa colisao com instancias proximas (raio de 5 unidades)

**Entrega**: nao atravessa mais arvores nem pedras. Personagem esbarra. Comeca a parecer mundo solido.

---

### Etapa 8 — Polimento V1.0 (1.5h)
- **Tela inicial** (`estilo.css`):
  - Fundo preto com nome do jogo "Minas Gerais 1500" em fonte serif
  - Botao "Comecar"
  - Esconde quando clica
- **Mensagem de abertura**: 
  - Texto branco semitransparente sobreposto: "Bem-vindo a Minas Gerais. Caminhe e escolha seu terreno."
  - Aparece por 5 segundos depois do "Comecar", fade out suave
- **HUD minimo**: pequena cruz (crosshair) ou nada (preferencia: nada, pra imersao)
- **Tela de loading** entre clique e jogo (caso assets demorem)
- **Ajustes finais**: sensibilidade de mouse, velocidade do personagem, distancia da camera

**Entrega**: experiencia completa do "primeiro contato" da V1.0.

---

## 6. Como vamos testar

Eu termino a V1.0 e te falo "pronto". Voce abre o `index.html` no Chrome do PC do Vitinho. Ele testa:

✅ **Checklist de aceite:**
- [ ] Tela inicial aparece e botao "Comecar" funciona
- [ ] Mensagem de boas-vindas aparece e some
- [ ] Personagem visivel em terceira pessoa
- [ ] WASD anda
- [ ] Shift corre
- [ ] Mouse gira camera
- [ ] Trilha visivel cortando floresta
- [ ] Arvores e pedras espalhadas
- [ ] Nao atravessa arvores
- [ ] Nao cai do mapa
- [ ] Roda fluido (>= 30 FPS) no PC do Vitinho

Se algo falhar, ajusto. Se passar tudo, V1.0 ta pronta.

---

## 7. Riscos e mitigacoes

| Risco | Mitigacao |
|---|---|
| Performance ruim no PC do Vitinho | InstancedMesh ja resolve. Se mesmo assim cair, reduzo numero de arvores |
| Sensibilidade do mouse muito alta/baixa | Variavel ajustavel; ele me fala "rapido demais" e ajusto |
| Vitinho enjoa do visual (capsula simples) | V1.0 e placeholder. Modelo bonito vem depois. Mas se ele quiser ANTES, tem que pegar `.glb` no Sketchfab/Mixamo |
| WebGL nao funciona no PC dele | improvavel (todo PC moderno tem). Se acontecer, atualizar driver de video |
| Eu (Claude) implemento e nao testa direito | Vou rodar smoke test com Puppeteer (skill `/browser`) antes de te entregar |

---

## 8. Proximos passos depois da V1.0 (so pra nao perder de vista)

- **Fase 2** — Sistema de claim local: tecla pra "clamar terreno", marca o quadrante com cercas, salva no `localStorage`. Ja parece "construir o seu lugar".
- **Fase 3** — Coleta + construcao: clicar em arvore/pedra coleta, inventario aparece, sistema de snap pra construir cabana.
- **Fase 4** — Servidor (Go + Supabase): persistencia entre sessoes, multiplayer, claim valida no servidor.

---

## 9. Decisoes em aberto pra voce confirmar antes de eu comecar

1. **Confirmar escopo**: o que esta em "NAO entra na V1.0" (secao 2) ta ok cortar mesmo? Ou quer puxar algo pra ca?
2. **Estilo do personagem**: capsula como placeholder funciona, ou ja quer um modelo simples (ex: cubo + retangulo, ou Mixamo `.glb` baixado)?
3. **Som**: entra na V1.0 (passos + ambiente de floresta) ou deixa pra Fase 2?
4. **Abrir local ou servir local**: o `index.html` aberto direto pode ter restricoes do browser (CORS pra texturas, etc). A V1.0 nao usa textura externa entao deve funcionar — mas se der problema, tem que servir via `python -m http.server` ou similar. Te aviso se acontecer.
5. **Versao do Three.js fixada**: vou usar `0.160.0`. Quer outra?

Me responde 1-5 e eu comeco.
