# Minas Gerais 1500

Simulador de colonização ambientado nas terras virgens de Minas Gerais nos anos 1500.

Projeto de **Vitinho (10 anos)** com apoio do pai (Wellington).

🎮 **Jogue:** https://paisdeminas.wcamaleao.com

---

## Como funciona

Você surge sozinho numa trilha de Mata Atlântica ao amanhecer. Caminha, escolhe um terreno, planta sua primeira pedra. O resto é com você.

### Controles (PC)
- **WASD** — caminhar
- **Mouse** — olhar
- **Shift** — correr
- **C** — clamar terreno
- **E** — coletar madeira/pedra
- **B** — modo construção (em breve)
- **ESC** — soltar mouse

### Controles (Celular)
- **Joystick virtual** (canto inferior esquerdo) — caminhar
- **Toque + arrastar** (resto da tela) — olhar
- **Botões** (canto inferior direito) — Correr · Coletar · Clamar · Construir

---

## Stack técnica

- **Frontend**: Three.js r160 (CDN) + Vanilla JS (sem build, sem framework)
- **Hospedagem**: VPS (nginx-alpine via Easypanel)
- **Persistência cliente**: `localStorage` (claim, inventário)
- **Estrutura**: ~12 arquivos JS modulares globais (sem ESM)

```
jogo/
├── index.html          ponto de entrada (scripts versionados via ?v=BUILD)
├── css/estilo.css      tela inicial + HUD + controles touch
└── js/
    ├── main.js         boot e loop principal
    ├── mundo.js        terreno + céu gradiente + iluminação
    ├── trilha.js       spline da trilha
    ├── floresta.js     3 tipos de árvore + samambaias + arbustos
    ├── personagem.js   humanoide custom (chapéu, camisa, calça)
    ├── controles.js    teclado WASD + integração joystick
    ├── camera.js       3ª pessoa orbital
    ├── colisao.js      teste de movimento (árvores/pedras/limite)
    ├── audio.js        ambiente + passos (Web Audio sintético)
    ├── vento.js        balanço sutil das copas
    ├── inventario.js   madeira/pedra com persistência
    ├── hud.js          painel + dicas
    ├── claim.js        cerca de madeira + persistência
    ├── coleta.js       remoção de instâncias + adição ao inventário
    ├── pilhas.js       pilhas visuais dentro do claim
    └── touch.js        joystick virtual + drag câmera + botões
```

---

## Deploy

### Build local
```bash
docker build -t paisdeminas .
docker run -p 8080:80 paisdeminas
# abre http://localhost:8080
```

### CI/CD
Push em `master` → Easypanel detecta → rebuilda imagem → container reinicia. Cache busting automático via `__BUILD__` substituído pelo timestamp na build (assets ganham nova URL `?v=...` a cada deploy).

---

## Fases do projeto

- ✅ **Fase 0** — Ideação e concept art
- ✅ **Fase 1** — Mundo navegável (terreno, trilha, floresta, personagem)
- ✅ **Fase 1.1** — Polimento (humanoide, sombras, vento, tone mapping)
- ✅ **Fase 2** — Posse, coleta, inventário, pilhas visuais
- ✅ **Mobile** — Touch controls + responsivo
- ⏳ **Fase 3** — Construção modular (snap de paredes/telhado/piso)
- ⏳ **Fase 4** — Multiplayer (Go + WebSockets + Supabase)
