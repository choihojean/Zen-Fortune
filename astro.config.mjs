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
    // dev 에서 React 아일랜드가 "jsxDEV is not a function" 으로 깨지는 것을 막기 위해
    // React 런타임을 기동 시점에 미리 번들한다 (지연 발견 시 optimizer 캐시가 어긋나는 문제).
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    },
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
