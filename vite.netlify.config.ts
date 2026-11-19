import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { fileURLToPath } from 'node:url';

const workspace = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode, command }) => {
  const env = { ...loadEnv(mode, workspace, ''), ...process.env };
  const url = env.SUPABASE_URL ?? '';
  const key = env.SUPABASE_PUBLISHABLE_KEY ?? '';
  const configured =
    /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) &&
    key.startsWith('sb_publishable_') &&
    key.length > 20;
  if (command === 'build' && !configured) {
    throw new Error(
      'Configura SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY antes de compilar para Netlify. No uses claves secretas.',
    );
  }
  // Solo estos dos valores públicos se incluyen en el artefacto. Nunca process.env completo.
  const config = JSON.stringify({
    configured,
    url: configured ? url : '',
    key: configured ? key : '',
  });
  const publicConfig: Plugin = {
    name: 'mentorias-public-config',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'api/config.json',
        source: config,
      });
      // Netlify Drop también necesita estas reglas dentro de la carpeta publicada.
      this.emitFile({
        type: 'asset',
        fileName: '_redirects',
        source: '/api/config /api/config.json 200!\n/* /index.html 200\n',
      });
      this.emitFile({
        type: 'asset',
        fileName: '_headers',
        source:
          '/*\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n/api/*\n  Cache-Control: no-store\n/index.html\n  Cache-Control: no-cache\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n',
      });
    },
    configureServer(server) {
      server.middlewares.use('/api/config', (_request, response) => {
        response.setHeader('Content-Type', 'application/json');
        response.setHeader('Cache-Control', 'no-store');
        response.end(config);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/config', (_request, response) => {
        response.setHeader('Content-Type', 'application/json');
        response.setHeader('Cache-Control', 'no-store');
        response.end(config);
      });
    },
  };
  return {
    root: fileURLToPath(new URL('./netlify', import.meta.url)),
    publicDir: fileURLToPath(new URL('./public', import.meta.url)),
    resolve: {
      alias: {
        'next/image': fileURLToPath(
          new URL('./netlify/image.tsx', import.meta.url),
        ),
        '@': workspace,
      },
    },
    css: { postcss: { plugins: [tailwindcss()] } },
    plugins: [react(), publicConfig],
    build: { outDir: '../netlify-dist', emptyOutDir: true },
    server: { port: 3001, strictPort: true },
    preview: { port: 4173, strictPort: true },
  };
});
