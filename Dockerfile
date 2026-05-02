FROM nginx:alpine

# Conteudo do jogo
COPY jogo/ /usr/share/nginx/html/

# Config nginx (cache busting + gzip + headers)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Substitui __BUILD__ pelo timestamp da build pra forcar refresh de assets
# (HTML eh sempre no-cache, entao browser sempre pega novo BUILD)
RUN BUILD_ID=$(date +%s) && \
    sed -i "s/__BUILD__/$BUILD_ID/g" /usr/share/nginx/html/index.html && \
    echo "Build ID: $BUILD_ID"

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
