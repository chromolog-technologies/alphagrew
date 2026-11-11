#!/bin/sh
# Container start: prepare the database and caches, then hand over to supervisord.
set -e

cd /var/www/html

# Apache listens on $PORT (Render and similar hosts set it).
sed -i "s/^Listen .*/Listen ${PORT:-10000}/" /etc/apache2/ports.conf

php artisan migrate --force
# Roles and permissions are idempotent (firstOrCreate). Demo accounts with a known
# password are created only when DEMO_SEED_ENABLED=true (see config/app.php).
php artisan db:seed --force

php artisan config:cache
php artisan route:cache
php artisan event:cache
php artisan view:cache

chown -R www-data:www-data storage bootstrap/cache

exec "$@"
