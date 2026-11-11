FROM php:8.2-cli

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git unzip curl libzip-dev zip \
    && docker-php-ext-install pdo pdo_mysql \
    && rm -rf /var/lib/apt/lists/*

# Install composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /app

# Copy project (.dockerignore keeps .env, vendor and local storage out of the image)
COPY . .

# Install production dependencies only
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader

ENV APP_ENV=production \
    APP_DEBUG=false

# Expose port
EXPOSE 10000

# Start Laravel. db:seed only creates roles and permissions here: demo accounts with a
# known password are added only when DEMO_SEED_ENABLED=true (see config/app.php).
CMD php artisan migrate --force && php artisan db:seed --force && php artisan serve --host=0.0.0.0 --port=10000
