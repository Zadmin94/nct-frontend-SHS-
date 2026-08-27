import { fileURLToPath, URL } from 'url';
import process from 'node:process';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import svgr from 'vite-plugin-svgr';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const apiUrl = env.VITE_API_URL || 'http://localhost:8080';
  const aiUrl = env.VITE_AI_API_URL || 'http://localhost:8090';

  return {
    plugins: [react(), tailwindcss(), svgr()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@public': fileURLToPath(new URL('./public', import.meta.url)),
        '@assets': fileURLToPath(new URL('./src/assets', import.meta.url)),
        '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
        '@modules': fileURLToPath(new URL('./src/components/modules', import.meta.url)),
        '@pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
        '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
        '@hooks': fileURLToPath(new URL('./src/hooks', import.meta.url)),
        '@context': fileURLToPath(new URL('./src/context', import.meta.url)),
        '@routes': fileURLToPath(new URL('./src/routes', import.meta.url)),
        '@layouts': fileURLToPath(new URL('./src/layouts', import.meta.url)),
        '@api': fileURLToPath(new URL('./src/api', import.meta.url)),
      },
    },
    server: {
      watch: { usePolling: true },
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
        },
        '/ai': {
          target: aiUrl,
          changeOrigin: true,
        },
        '/uploads': {
          target: apiUrl,
          changeOrigin: true,
        },
        '/attachment': {
          target: apiUrl,
          changeOrigin: true,
        },
      },
    },
  };
});
