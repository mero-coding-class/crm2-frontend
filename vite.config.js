import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, projectRoot, '');
  const backendUrl = env.VITE_BACKEND_URL;
  const apiOrigin = (env.VITE_API_ORIGIN || process.env.VITE_API_ORIGIN || '').trim();
  const sameOriginApi = (env.VITE_SAME_ORIGIN_API || process.env.VITE_SAME_ORIGIN_API) === 'true';

  if (command === 'build' && !apiOrigin && !sameOriginApi) {
    throw new Error(
      'Set VITE_API_ORIGIN for a separate API host, or set VITE_SAME_ORIGIN_API=true when a reverse proxy serves /api on this origin.'
    );
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': resolve(projectRoot, 'src'),
      },
    },
    server: {
      host: "0.0.0.0",
      port: 3000,
      proxy: {
        '/ws': {
          target: backendUrl || 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        '/api': {
          target: backendUrl || 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        },
        '/health': {
          target: backendUrl || 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        },
        '/media': {
          target: backendUrl || 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
