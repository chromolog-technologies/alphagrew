import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

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
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': frontendRoot,
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
