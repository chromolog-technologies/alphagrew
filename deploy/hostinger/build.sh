#!/usr/bin/env bash
# Assembles a ready-to-run copy of AlphaGrew for shared hosting (Hostinger) in <out-dir>:
# the Laravel app with production vendor/, plus the built React site inside public/.
# Used by .github/workflows/deploy-hostinger.yml; can also be run locally.
#
#   deploy/hostinger/build.sh <out-dir>
#
# Environment:
#   SITE_URL        public address of the site (default https://alphagrew.chromologtechnologies.com)
#   NOINDEX         "true" hides the site from search engines (default true)
#   SKIP_INSTALL    "true" reuses existing vendor/ and node_modules/ (local testing)
set -euo pipefail

OUT="${1:?usage: build.sh <out-dir>}"
SITE_URL="${SITE_URL:-https://alphagrew.chromologtechnologies.com}"
NOINDEX="${NOINDEX:-true}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HERE="$ROOT/deploy/hostinger"

echo "Building AlphaGrew for $SITE_URL (noindex: $NOINDEX) into $OUT"

# 1. Backend: production dependencies only.
if [ "${SKIP_INSTALL:-false}" != "true" ]; then
  (cd "$ROOT/backend" && composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction --no-progress)
fi

# 2. Frontend: same-origin API, the demo address, no Vercel-only analytics.
if [ "${SKIP_INSTALL:-false}" != "true" ]; then
  (cd "$ROOT/frontend" && npm ci --no-audit --no-fund)
fi
(cd "$ROOT/frontend" && VITE_API_BASE_URL=/api/v1 VITE_SITE_URL="$SITE_URL" VITE_ANALYTICS=off npm run build)

# 3. Assemble: Laravel app, then the React build inside public/.
rm -rf "$OUT"
mkdir -p "$OUT"
rsync -a "$ROOT/backend/" "$OUT/" \
  --exclude '.env' --exclude '.env.*' --exclude 'tests/' --exclude 'node_modules/' \
  --exclude 'Dockerfile' --exclude '.dockerignore' --exclude 'docker/' \
  --exclude 'database/*.sqlite' --exclude '.phpunit*' --exclude 'phpunit.xml' \
  --exclude 'storage/logs/*.log' --exclude 'storage/framework/cache/data/*' \
  --exclude 'storage/framework/sessions/*' --exclude 'storage/framework/views/*' \
  --exclude 'storage/app/private/*' --exclude 'storage/app/public/*' \
  --exclude 'bootstrap/cache/*.php' --exclude '.gitignore' --exclude '.DS_Store'
cp "$ROOT/backend/.env.example" "$OUT/.env.example"
cp -R "$ROOT/frontend/dist/." "$OUT/public/"
find "$OUT" -name .DS_Store -delete

# Web server rules and the server .env template.
cp "$HERE/root.htaccess" "$OUT/.htaccess"
cp "$HERE/public.htaccess" "$OUT/public/.htaccess"
cp "$HERE/env.example" "$OUT/hostinger.env.example"
if [ "$NOINDEX" = "true" ]; then
  sed -i.bak 's/^    # @NOINDEX@ /    /' "$OUT/public/.htaccess" && rm "$OUT/public/.htaccess.bak"
  printf 'User-agent: *\nDisallow: /\n' > "$OUT/public/robots.txt"
  rm -f "$OUT/public/sitemap.xml"
fi

# Uploaded logos and staff photos are served from public/storage.
ln -s ../storage/app/public "$OUT/public/storage"

# Folders Laravel writes to must exist (git keeps them through these placeholders).
for dir in storage/app/public storage/app/private storage/framework/cache/data storage/framework/sessions \
           storage/framework/views storage/logs bootstrap/cache; do
  mkdir -p "$OUT/$dir"
  touch "$OUT/$dir/.gitkeep"
done

# Only the server's own files stay out of git: .env and what Laravel writes at runtime.
cat > "$OUT/.gitignore" <<'IGNORE'
.env
/storage/app/public/*
/storage/app/private/*
/storage/framework/cache/data/*
/storage/framework/sessions/*
/storage/framework/views/*
/storage/logs/*
/bootstrap/cache/*.php
!.gitkeep
IGNORE

echo "$(cd "$ROOT" && git rev-parse --short HEAD 2>/dev/null || echo local)" > "$OUT/DEPLOYED_COMMIT"
echo "Done: $(du -sh "$OUT" | cut -f1)"
