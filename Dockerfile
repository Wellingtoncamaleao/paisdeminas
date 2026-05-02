FROM php:8.2-apache

# Extensoes necessarias: PDO_SQLite (banco) + headers (cache busting)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsqlite3-dev \
    && docker-php-ext-install pdo pdo_sqlite \
    && a2enmod headers rewrite \
    && rm -rf /var/lib/apt/lists/*

# Conteudo do jogo
COPY jogo/ /var/www/html/

# Config Apache (cache busting + .htaccess da pasta api/)
COPY apache.conf /etc/apache2/sites-available/000-default.conf

# Diretorio persistente pro SQLite (volume montado no Easypanel: /var/www/data)
RUN mkdir -p /var/www/data \
    && chown -R www-data:www-data /var/www/data /var/www/html \
    && chmod 755 /var/www/data
VOLUME ["/var/www/data"]

# Substitui __BUILD__ pelo timestamp do build pra forcar refresh de assets
RUN BUILD_ID=$(date +%s) && \
    sed -i "s/__BUILD__/$BUILD_ID/g" /var/www/html/index.html && \
    echo "Build ID: $BUILD_ID"

EXPOSE 80
