import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { SITE_PAGES } from './src/marketing/siteMap';
import { APP_ROUTE_PATTERNS } from './src/routes';

/**
 * Writes robots.txt, and sitemap.xml when VITE_SITE_URL is set, for the public marketing
 * pages. Sign-in, workspace and Owner Console paths and draft (noindex) pages are left out.
 */
function marketingSeoFiles(siteUrl: string): Plugin {
  const origin = siteUrl.trim().replace(/\/+$/, '');
  return {
    name: 'alphagrew-marketing-seo-files',
    apply: 'build',
    generateBundle() {
      const robots = ['User-agent: *', ...APP_ROUTE_PATTERNS.map((pattern) => `Disallow: ${pattern.replace('/*', '/')}`)];
      if (origin) {
        const urls = Object.values(SITE_PAGES)
          .filter((page) => !page.noindex)
          .map((page) => `  <url><loc>${origin}${page.path === '/' ? '/' : page.path}</loc></url>`);
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
        });
        robots.push('', `Sitemap: ${origin}/sitemap.xml`);
      }
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `${robots.join('\n')}\n` });
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const proxyTarget = env.LARAVEL_DEV_URL || 'http://127.0.0.1:8000';
  const frontendRoot = __dirname;

  // Without an API URL the app runs offline on demo data, which must never ship by accident.
  if (command === 'build' && !env.VITE_API_BASE_URL?.trim() && env.VITE_DEMO_MODE !== 'true') {
    throw new Error('VITE_API_BASE_URL is not set. Set it to the Laravel API URL, or set VITE_DEMO_MODE=true for an offline demo build.');
  }

  return {
    root: frontendRoot,
    envDir: __dirname,
    plugins: [react(), tailwindcss(), marketingSeoFiles(env.VITE_SITE_URL ?? '')],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy:
        env.VITE_API_BASE_URL === '/api/v1'
          ? {
              '/api': {
                target: proxyTarget,
                changeOrigin: true,
              },
            }
          : undefined,
    },
  };
});
