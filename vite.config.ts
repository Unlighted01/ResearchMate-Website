// ============================================
// VITE CONFIGURATION
// ============================================

import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

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
    },

    // ============================================
    // PLUGINS
    // ============================================
    plugins: [react()],

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
