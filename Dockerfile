FROM php:8.2-apache

# Instala dependencias necesarias para PostgreSQL + extensiones PHP
RUN apt-get update && apt-get install -y \
    libpq-dev \
    && docker-php-ext-install pdo pdo_pgsql pgsql

# Copia tu código al contenedor
COPY . /var/www/html/
