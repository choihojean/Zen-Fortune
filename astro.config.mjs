import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    platformProxy: { enabled: true },
  }),
  integrations: [react()],
  vite: {
    ssr: {
      external: ['node:crypto'],
    },
    resolve: {
      alias: import.meta.env.PROD
        ? { 'react-dom/server': 'react-dom/server.edge' }
        : undefined,
    },
  },
});
