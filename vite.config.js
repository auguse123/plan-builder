import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';

// `npm run build` rend UN SEUL fichier, `dist/index.html` — scripts, styles et
// police dedans. Il s'ouvre d'un double-clic, sans Node ni serveur : c'est la
// forme sous laquelle l'Atelier se donne (`npm run fichier` le copie à la racine).
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { assetsInlineLimit: 100_000_000 },
  server: { port: 5180 },
});
