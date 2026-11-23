import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, Plugin } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function syncBuildToPublicHtml(): Plugin {
  return {
    name: 'sync-build-to-public-html',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      const publicHtmlDir = path.resolve(__dirname, 'public_html');
      if (!fs.existsSync(distDir)) return;
      try {
        fs.mkdirSync(publicHtmlDir, { recursive: true });
        fs.cpSync(distDir, publicHtmlDir, { recursive: true, force: true });
      } catch (err) {
        console.warn('[Vite Build Note] Unable to sync dist to public_html:', err);
      }
    },
  };
}

export default defineConfig(({ command }) => {
  return {
    base: command === 'build' ? './' : '/',
    plugins: [react(), tailwindcss(), syncBuildToPublicHtml()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 2500,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
