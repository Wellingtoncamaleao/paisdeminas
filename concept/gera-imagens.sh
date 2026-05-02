#!/bin/sh
# Roda dentro do container matrix-core. Gera 4 PNGs em /tmp/concept-NN.png em paralelo.
set -e

gera() {
  P="$1"
  OUT="$2"
  curl -s https://api.openai.com/v1/images/generations \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"model\":\"gpt-image-1\",\"prompt\":\"$P\",\"size\":\"1536x1024\",\"quality\":\"medium\",\"n\":1}" \
    | tee "/tmp/$(basename "$OUT" .png).json" \
    | sed -n 's/.*"b64_json": *"\([^"]*\)".*/\1/p' \
    | base64 -d > "$OUT"
  echo "[ok] $OUT ($(wc -c < "$OUT") bytes)"
}

P1="Cinematic wide-angle landscape concept art of a historical hiking trail through dense Brazilian Atlantic Forest in the highlands of Minas Gerais in the 1500s, untouched primal wilderness, golden dawn light filtering through morning mist, lush ferns and tropical hardwood trees, distant mountains barely visible through fog, no people, no buildings, photorealistic painterly style, peaceful contemplative atmosphere, inspired by Slow Roads game and Red Dead Redemption 2 visuals"

P2="Cinematic concept art of a wide forest clearing beside a clear river in the highlands of Minas Gerais Brazil in the 1500s, ideal homestead location, soft afternoon golden light, dense Atlantic tropical jungle surrounding the clearing, pebbled riverbank with smooth stones, no buildings, no people, painterly photorealistic style, lush vegetation, peaceful uninhabited primal wilderness"

P3="First-person view concept art of human hands collecting stones and wooden logs from the forest floor in the Brazilian Atlantic Forest in the 1500s, dense moss-covered ground, ferns and tropical undergrowth, golden dappled sunlight through the canopy, survival game perspective, photorealistic painterly style, immersive forest atmosphere, no other people"

P4="Cinematic concept art of a small rustic wooden cabin freshly built in a forest clearing in the Brazilian Atlantic Forest of Minas Gerais in the 1500s, primitive construction with rough logs and thatched palm roof, surrounded by dense tropical jungle, thin smoke rising from a stone chimney, golden hour light, peaceful pioneer settlement atmosphere, photorealistic painterly style, no people visible"

gera "$P1" /tmp/concept-01-trilha-amanhecer.png &
gera "$P2" /tmp/concept-02-clareira-rio.png &
gera "$P3" /tmp/concept-03-coleta-recursos.png &
gera "$P4" /tmp/concept-04-cabana-rustica.png &
wait
echo "all done"
