# Deploy — Minas Gerais 1500

Setup do app no Easypanel da VPS pra servir em `paisdeminas.wcamaleao.com`.
Tudo automatizado: você dá `git push origin master` → Easypanel detecta → rebuild → site atualizado em ~30s.

---

## Pré-requisitos
- ✅ Repo no GitHub: https://github.com/Wellingtoncamaleao/paisdeminas
- ✅ Dockerfile + nginx.conf no repo
- ✅ Cache busting automático (`__BUILD__` substituído no build)
- 🔲 Conta no Easypanel da VPS
- 🔲 DNS de `paisdeminas.wcamaleao.com` apontando pra VPS

---

## Passo 1 — DNS

No painel do registrador do `wcamaleao.com` (Registro.br, GoDaddy, ou onde estiver):

Adicionar registro:
```
Tipo:  A     (ou CNAME se preferir)
Nome:  paisdeminas
Valor: 162.240.100.21    (IP da VPS)
TTL:   3600
```

Verificar com: `nslookup paisdeminas.wcamaleao.com`

---

## Passo 2 — Easypanel: criar app

1. Entra no Easypanel da VPS
2. **Projeto** → criar novo (ex: `paisdeminas`) ou usar existente
3. Dentro do projeto: **+ Service** → **App**
4. Nome do serviço: `paisdeminas-web`

### Source — GitHub
- **Source**: GitHub
- **Owner**: `Wellingtoncamaleao`
- **Repository**: `paisdeminas`
- **Branch**: `master`
- **Build path**: `/` (raiz do repo)
- **Auto deploy**: ✅ ATIVAR (vai fazer rebuild a cada push)

> Se o Easypanel não tem GitHub conectado ainda, ele vai pedir pra autorizar a App do Easypanel no GitHub. Autoriza e seleciona o repo.

### Build
- **Build type**: Dockerfile
- **Dockerfile path**: `Dockerfile`

### Deploy
- **Port**: `80` (nginx interno)
- **Replicas**: 1
- **Memory limit**: 128 MB (jogo é leve, conteúdo estático)
- **CPU limit**: 0.5 cores

### Domain
- **+ Add domain**: `paisdeminas.wcamaleao.com`
- **HTTPS**: ✅ ATIVAR (Easypanel gera certificado Let's Encrypt automaticamente)
- **Force HTTPS**: ✅ (redireciona HTTP → HTTPS)

### Environment
Não tem variáveis de ambiente. Pode deixar vazio.

---

## Passo 3 — Primeiro deploy

1. Salva o serviço
2. Easypanel inicia o build automaticamente (acompanha pelos logs)
3. Build leva ~1-2min (puxa nginx:alpine + copia arquivos + sed do BUILD_ID)
4. Quando o status virar 🟢 **Running**, abre `https://paisdeminas.wcamaleao.com` no celular

Se aparecer "DNS_PROBE_FINISHED_NXDOMAIN", o DNS ainda não propagou — espera 5-10min e tenta de novo.

---

## Passo 4 — Verificar cache busting

Depois do primeiro deploy:

1. Abre `https://paisdeminas.wcamaleao.com` no Chrome (DevTools → Network)
2. Vê os scripts: devem aparecer com `?v=1730xxxxxx` (timestamp)
3. Faz uma alteração local (ex: muda cor de algo no `mundo.js`)
4. `git add . && git commit -m "teste" && git push origin master`
5. Espera ~1min (Easypanel rebuild)
6. Recarrega a página no celular **sem limpar cache** — deve ver mudança imediata

Se NÃO ver, verifica:
- Headers `Cache-Control: no-cache` no `.html` (Network → index.html → Response Headers)
- Build ID mudou (URL do JS deve ter `?v=` diferente)

---

## Como atualizar daqui pra frente

```bash
cd "D:/VICTOR/PAIS DE MINAS"
# faz mudanças
git add jogo/
git commit -m "descrição da mudança"
git push origin master
# espera ~1min, abre o jogo no celular, recarrega
```

Easypanel mostra logs em tempo real do build se quiser acompanhar.

---

## Troubleshooting

| Sintoma | Causa provável | Solução |
|---|---|---|
| 502 Bad Gateway | container não subiu | Easypanel logs — provavelmente erro no nginx.conf |
| DNS não resolve | propagação | Espera 10min, ou usa `dig paisdeminas.wcamaleao.com` |
| Site velho aparece | cache do CDN/proxy intermediário | Force refresh `Ctrl+Shift+R` no PC; em mobile, fechar aba e reabrir |
| HTTPS não funciona | Let's Encrypt falhou | Easypanel → Domain → reissue cert |
| Imagem com pesoexcessivo | concept/ vai pro container | já tem `.dockerignore` excluindo concept/, mas confere |

---

## Custo estimado

Container nginx-alpine:
- RAM: ~5-10MB em idle
- CPU: ~0% em idle (estático, sem processamento)
- Egress: depende de uso. Jogo carrega ~3-4MB total no primeiro acesso (Three.js CDN externa, não conta), depois `localStorage` cuida do resto.

Negligível na fatura da VPS.

---

## Próximos passos pós-deploy

Quando estiver no ar e o Vitinho testando no celular:
1. Coletar feedback dele (o que travou, o que ele quis fazer e não conseguiu)
2. Fase 3 — Construção (sistema de snap)
3. Considerar PWA (instalável como app no celular, modo offline)
