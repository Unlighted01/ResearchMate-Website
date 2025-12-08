/// <reference types="vite/client" />

// ============================================
// VITE ENVIRONMENT VARIABLES TYPE DEFINITIONS
// ============================================

interface ImportMetaEnv {
  // Supabase
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;

  // Gemini AI
  readonly VITE_GEMINI_API_KEY: string;

  // Application
  readonly VITE_SITE_URL: string;
  readonly VITE_ENABLE_AI: string;
  readonly VITE_ENABLE_REALTIME: string;

  // Vite built-ins
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
