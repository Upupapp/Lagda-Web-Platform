import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    proxy: {
      // Mirrors production's own transport: Netlify's public/_redirects
      // proxies /api/* to the backend, stripping the /api prefix, so the
      // frontend never talks cross-origin and its session cookie is
      // genuinely first-party (see that file's own comment for why that
      // matters). VITE_API_BASE_URL=/api locally hits this same rule
      // instead of a second, divergent "direct absolute URL" code path —
      // one transport regime for both environments.
      // Target must match Lagda-Backend's own .env API_PORT for whoever is
      // running it locally — that repo's .env.example documents 8080 as the
      // default, but a local override is common (this workspace's own
      // Lagda-Backend/.env currently runs 8090). Override with
      // VITE_DEV_API_PORT if your backend listens elsewhere.
      '/api': {
        target: `http://localhost:${process.env.VITE_DEV_API_PORT ?? '8090'}`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  build: {
    rollupOptions: {
      output: {
        // Command 11 code-split the routes and got the entry chunk to ~336 KB.
        // Everything added since (C12 onwards) landed back in it, because the
        // route chunks were split but the libraries they all share were not —
        // so the entry grew to 909 KB and every deploy invalidated the whole
        // thing, framework included.
        //
        // Splitting by package keeps the parts that change on a different
        // cadence from the parts that do not: React and the router change when
        // a dependency is upgraded, the icon set changes when a screen adopts a
        // new glyph, and application code changes constantly.
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router'],
          // 76 files import from lucide-react. Rollup tree-shakes to the icons
          // actually referenced, but that set is large and shared by nearly
          // every route, so it belongs in its own long-lived chunk.
          'icons': ['lucide-react'],
        },
      },
    },
  },
})
