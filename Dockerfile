FROM php:8.2-apache

# Instala dependencias necesarias para PostgreSQL + extensiones PHP
RUN apt-get update && apt-get install -y \
    libpq-dev \
    && docker-php-ext-install pdo pdo_pgsql pgsql

# Habilita el módulo de reescritura de Apache
RUN a2enmod rewrite

# Establece AllowOverride All en el directorio raíz del sitio
RUN sed -i 's|AllowOverride None|AllowOverride All|g' /etc/apache2/apache2.conf

# Copia tu código al contenedor
COPY . /var/www/html/
