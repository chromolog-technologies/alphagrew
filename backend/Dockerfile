# Production image for the Laravel API.
#
# One container runs three processes under supervisord (docker/supervisord.conf):
#   - Apache + mod_php serving public/ (with OPcache)
#   - the queue worker: resume parsing, interview evaluation, readiness scores and
#     academic summaries are queued jobs and never finish without it
#   - the scheduler: idle-interview cleanup, token pruning, offer expiry, owner jobs
#
# docker/entrypoint.sh migrates, seeds roles and permissions (demo accounts only when
# DEMO_SEED_ENABLED=true) and builds the config, route, event and view caches at start,
# because those depend on the runtime environment variables.
FROM php:8.4-apache

RUN apt-get update && apt-get install -y --no-install-recommends \
        curl git unzip libzip-dev libicu-dev poppler-utils supervisor \
    && docker-php-ext-install pdo_mysql zip intl opcache pcntl bcmath \
    && a2enmod rewrite headers \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY docker/php.ini /usr/local/etc/php/conf.d/zz-alphagrew.ini
COPY docker/apache.conf /etc/apache2/sites-available/000-default.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/alphagrew.conf
COPY docker/entrypoint.sh /usr/local/bin/alphagrew-entrypoint
RUN chmod +x /usr/local/bin/alphagrew-entrypoint

WORKDIR /var/www/html

# Dependencies first, so code changes don't reinstall them.
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --no-scripts --no-autoloader

# .dockerignore keeps .env, vendor, tests and local storage out of the image.
COPY . .
RUN composer dump-autoload --optimize --no-dev \
    && php artisan package:discover --ansi \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr \
    PDFTOTEXT_PATH=/usr/bin/pdftotext \
    PORT=10000

EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s \
    CMD curl -fsS "http://127.0.0.1:${PORT}/up" || exit 1

ENTRYPOINT ["alphagrew-entrypoint"]
CMD ["supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]
