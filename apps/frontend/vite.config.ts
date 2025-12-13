import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

// Custom plugin to conditionally apply COEP headers
// Only apply to routes that need FFmpeg (not /play which needs external iframes)
function conditionalCoepHeaders(): Plugin {
  return {
    name: 'conditional-coep-headers',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        // Don't apply COEP to /play route - it needs to embed Ready Player Me iframe
        if (!url.startsWith('/play')) {
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
          res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Conditional COEP headers for FFmpeg support (except on /play)
    conditionalCoepHeaders(),
    // Bundle visualizer - generates stats.html after build
    // Run with: npm run build:analyze (or ANALYZE=true npm run build)
    process.env.ANALYZE === 'true' &&
      visualizer({
        filename: 'dist/stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap', // Options: 'treemap', 'sunburst', 'network'
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI libraries
          'vendor-ui': ['framer-motion', '@tremor/react', 'lucide-react'],
          // Data fetching
          'vendor-data': ['@tanstack/react-query', 'axios', 'zustand'],
          // Charts
          'vendor-charts': ['@nivo/line', '@nivo/pie', '@nivo/bar'],
        },
      },
    },
  },
  define: {
    // Make environment variables available at build time
    'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  // Optimize WASM loading
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
}));
