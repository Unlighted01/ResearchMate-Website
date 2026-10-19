// ============================================
// VITE CONFIGURATION
// ============================================

import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';


export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory
  const env = loadEnv(mode, '.', '');
  
  return {
    // ============================================
    // SERVER CONFIGURATION
    // ============================================
    server: {
      port: 3000,
      host: '0.0.0.0',
      open: true, // Open browser on start
    },

    // ============================================
    // BUILD CONFIGURATION
    // ============================================
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      minify: mode === 'production' ? 'esbuild' : false,
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('pdfjs-dist')) return 'vendor-pdf';
              if (id.includes('katex') || id.includes('mathjs') || id.includes('rehype-katex') || id.includes('remark-math')) return 'vendor-math';
              if (id.includes('three') || id.includes('react-force-graph') || id.includes('d3')) return 'vendor-viz';
              if (id.includes('mammoth') || id.includes('docx') || id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-docs';
              if (id.includes('recharts')) return 'vendor-charts';
              if (id.includes('lucide-react')) return 'vendor-icons';
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'vendor-react';
            }
          },
        },
      },
    },

    // ============================================
    // PLUGINS
    // ============================================
    plugins: [react(), tailwindcss()],

    // ============================================
    // RESOLVE ALIASES
    // ============================================
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@components': path.resolve(__dirname, './components'),
        '@services': path.resolve(__dirname, './services'),
        '@lib': path.resolve(__dirname, './lib'),
      },
    },

    // ============================================
    // ENVIRONMENT VARIABLES
    // ============================================
    // Note: Vite automatically exposes VITE_* variables to import.meta.env
    // No need to define them here unless you want process.env compatibility
    define: {
      // Legacy support for process.env (if needed)
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
  };
});
