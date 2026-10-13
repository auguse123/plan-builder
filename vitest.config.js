import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Les couches pures seulement : la géométrie du plan et le dépôt local.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { environment: 'node', include: ['src/**/*.test.{js,jsx}'] },
});
