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
