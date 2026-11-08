// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import {
  createClient,
  SupabaseClient,
  User,
  Session,
  AuthChangeEvent,
} from "@supabase/supabase-js";

// ============================================
// PART 2: CONFIGURATION & CONSTANTS
// ============================================

/**
 * Supabase Configuration
 * Matches extension's configuration for seamless data sharing
 * In production, these should be environment variables
 */
const env = (typeof import.meta !== "undefined" && (import.meta as any).env) || (typeof process !== "undefined" && process.env) || {};
const SUPABASE_URL: string = env.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
const SUPABASE_ANON_KEY: string = env.VITE_SUPABASE_ANON_KEY || "placeholder-anon-key";

/**
 * Auth Configuration - Website specific settings
 */
const AUTH_CONFIG = {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
  storageKey: "researchmate-auth",
  flowType: "pkce" as const,
};

// ============================================
// PART 3: TYPE DEFINITIONS
// ============================================

export interface AuthResult {
  user: User | null;
  error: Error | null;
}

export interface SessionResult {
  session: Session | null;
  error: Error | null;
}

export type AuthEventCallback = (
  event: AuthChangeEvent,
  session: Session | null
) => void;

export type SyncState = "synced" | "syncing" | "signed_out" | "error";

export interface SyncStatus {
  state: SyncState;
  label: string;
}

// ============================================
// PART 4: SUPABASE CLIENT INITIALIZATION
// ============================================

/**
 * Create and export Supabase client
 * Configured to match extension settings for seamless data sharing
 */
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: AUTH_CONFIG,
  }
);

// Log initialization in development (without exposing URL)
if (import.meta.env?.DEV) {
  console.log("🔧 Supabase client initialized");
}

// ============================================
// PART 4B: SYNC STATUS & AUTH ERROR RECOVERY
// ============================================

let currentSyncStatus: SyncStatus = {
  state: "signed_out",
  label: "Signed out, working locally",
};

const syncListeners = new Set<(status: SyncStatus) => void>();

export function getSyncStatus(): SyncStatus {
  return currentSyncStatus;
}

export function setSyncStatus(status: SyncStatus): void {
  currentSyncStatus = status;
  for (const listener of syncListeners) {
    try {
      listener(status);
    } catch (e) {
      console.warn("Error in sync listener:", e);
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("researchmate:sync_status_changed", { detail: status })
    );
  }
}

export function subscribeToSyncStatus(
  callback: (status: SyncStatus) => void
): () => void {
  syncListeners.add(callback);
  callback(currentSyncStatus);
  return () => {
    syncListeners.delete(callback);
  };
}

let isRefreshing = false;
let sessionKnownInvalid = false;

export function isSessionKnownInvalid(): boolean {
  return sessionKnownInvalid;
}

export function resetSessionInvalidFlag(): void {
  sessionKnownInvalid = false;
}

/**
 * Checks if an error is a JWT expiration or auth failure (401, 403, PGRST303).
 */
export function isAuthError(error: any): boolean {
  if (!error) return false;
  const code = error.code || error.status;
  const msg = (error.message || "").toLowerCase();
  return (
    code === "PGRST303" ||
    code === 401 ||
    code === 403 ||
    code === "401" ||
    code === "403" ||
    msg.includes("jwt expired") ||
    msg.includes("token is expired") ||
    msg.includes("invalid claim")
  );
}

/**
 * Handles auth errors by attempting ONE session refresh.
 * If refresh fails or token is dead: signs out cleanly, clears Supabase auth tokens,
 * and leaves the app running in local-first offline mode.
 * Never touches the local Question Bank, exams, or decks.
 */
export async function handleAuthError(error?: any): Promise<boolean> {
  if (sessionKnownInvalid) return false;
  if (isRefreshing) return false;

  isRefreshing = true;
  try {
    console.warn("🔒 Auth error detected. Attempting single session refresh...");
    const { data, error: refreshErr } = await supabase.auth.refreshSession();
    if (!refreshErr && data?.session) {
      console.log("✅ Session successfully refreshed.");
      sessionKnownInvalid = false;
      setSyncStatus({ state: "synced", label: "SYNCED" });
      return true;
    }
  } catch (e) {
    console.warn("Session refresh attempt failed:", e);
  } finally {
    isRefreshing = false;
  }

  // Refresh failed: session is irrevocably invalid
  console.warn("⚠️ Session refresh failed. Switching to local-only mode.");
  sessionKnownInvalid = true;

  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Ignore network errors on sign out
  }

  // Clear ONLY Supabase auth keys from localStorage (never touch Question Bank, exams, or decks!)
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("researchmate-auth");
    localStorage.removeItem("supabase.auth.token");
    localStorage.setItem("rm_guest_mode", "true");
  }

  setSyncStatus({ state: "signed_out", label: "Signed out, working locally" });

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("researchmate:auth_state_changed", {
        detail: { state: "signed_out", label: "Signed out, working locally" },
      })
    );
  }

  return false;
}

// ============================================
// PART 5: USER AUTHENTICATION FUNCTIONS
// ============================================

/**
 * Get the current authenticated user
 * @returns Promise<User | null>
 */
export async function getCurrentUser(): Promise<User | null> {
  if (sessionKnownInvalid) return null;
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      if (isAuthError(error)) {
        await handleAuthError(error);
      }
      return null;
    }

    setSyncStatus({ state: "synced", label: "SYNCED" });
    return user;
  } catch (error) {
    if (isAuthError(error)) {
      await handleAuthError(error);
    }
    return null;
  }
}

/**
 * Get the current session
 * @returns Promise<SessionResult>
 */
export async function getSession(): Promise<SessionResult> {
  if (sessionKnownInvalid) return { session: null, error: null };
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      if (isAuthError(error)) {
        await handleAuthError(error);
      }
      return { session: null, error };
    }

    if (session?.expires_at && session.expires_at * 1000 < Date.now()) {
      const refreshed = await handleAuthError({ code: "PGRST303", message: "JWT expired" });
      if (!refreshed) {
        return { session: null, error: null };
      }
    }

    return { session, error: null };
  } catch (error) {
    return { session: null, error: error as Error };
  }
}

/**
 * Check if user is currently authenticated
 * @returns Promise<boolean>
 */
export async function isAuthenticated(): Promise<boolean> {
  if (sessionKnownInvalid) return false;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return false;
    if (session.expires_at && session.expires_at * 1000 < Date.now()) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// ============================================
// PART 6: EMAIL AUTHENTICATION
// ============================================

/**
 * Sign in with email and password
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise<AuthResult>
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    if (import.meta.env?.DEV) {
      console.log("🔑 Sign in attempt");
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (error) {
      console.error("❌ Sign in error:", error.message);
      return { user: null, error };
    }

    sessionKnownInvalid = false;
    setSyncStatus({ state: "synced", label: "SYNCED" });

    if (import.meta.env?.DEV) {
      console.log("✅ Signed in successfully");
    }
    return { user: data.user, error: null };
  } catch (error) {
    console.error("❌ Sign in exception:", error);
    return { user: null, error: error as Error };
  }
}

/**
 * Sign up with email and password
 * @param email - User's email address
 * @param password - User's password (min 6 characters)
 * @returns Promise<AuthResult>
 */
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    if (import.meta.env?.DEV) {
      console.log("📝 Sign up attempt");
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error("❌ Sign up error:", error.message);
      return { user: null, error };
    }

    if (import.meta.env?.DEV) {
      console.log("✅ Sign up successful");
    }
    return { user: data.user, error: null };
  } catch (error) {
    console.error("❌ Sign up exception:", error);
    return { user: null, error: error as Error };
  }
}

// ============================================
// PART 7: OAUTH AUTHENTICATION
// ============================================

/**
 * Sign in with Google OAuth
 * @returns Promise<{ error: Error | null }>
 */
export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  try {
    if (import.meta.env?.DEV) {
      console.log("🔑 Starting Google OAuth");
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/#/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      console.error("❌ Google OAuth error:", error.message);
      return { error };
    }

    return { error: null };
  } catch (error) {
    console.error("❌ Google OAuth exception:", error);
    return { error: error as Error };
  }
}

/**
 * Sign in with GitHub OAuth
 * @returns Promise<{ error: Error | null }>
 */
export async function signInWithGitHub(): Promise<{ error: Error | null }> {
  try {
    if (import.meta.env?.DEV) {
      console.log("🔑 Starting GitHub OAuth");
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/#/auth/callback`,
      },
    });

    if (error) {
      console.error("❌ GitHub OAuth error:", error.message);
      return { error };
    }

    return { error: null };
  } catch (error) {
    console.error("❌ GitHub OAuth exception:", error);
    return { error: error as Error };
  }
}

// ============================================
// PART 8: SIGN OUT
// ============================================

/**
 * Sign out the current user cleanly.
 * Clears only Supabase auth keys; leaves local question banks, exams, and decks intact.
 * @returns Promise<{ error: Error | null }>
 */
export async function signOut(): Promise<{ error: Error | null }> {
  try {
    if (import.meta.env?.DEV) {
      console.log("🚪 Signing out");
    }

    sessionKnownInvalid = true;

    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Ignore network errors
    }

    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("researchmate-auth");
      localStorage.removeItem("supabase.auth.token");
      localStorage.setItem("rm_guest_mode", "true");
    }

    setSyncStatus({ state: "signed_out", label: "Signed out, working locally" });

    if (import.meta.env?.DEV) {
      console.log("✅ Signed out successfully (local mode active)");
    }
    return { error: null };
  } catch (error) {
    console.error("❌ Sign out exception:", error);
    return { error: error as Error };
  }
}

// ============================================
// PART 9: AUTH STATE LISTENER
// ============================================

/**
 * Listen to auth state changes
 * @param callback - Called with (event, session) on auth changes
 * @returns Subscription object with unsubscribe method
 */
export function onAuthStateChange(callback: AuthEventCallback) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    if (import.meta.env?.DEV) {
      console.log("🔄 Auth state changed:", event);
    }
    if (event === "SIGNED_IN" && session) {
      sessionKnownInvalid = false;
      setSyncStatus({ state: "synced", label: "SYNCED" });
    } else if (event === "SIGNED_OUT") {
      sessionKnownInvalid = true;
      setSyncStatus({ state: "signed_out", label: "Signed out, working locally" });
    }
    callback(event, session);
  });

  return subscription;
}

// ============================================
// PART 10: PASSWORD RESET
// ============================================

/**
 * Send password reset email
 * @param email - User's email address
 * @returns Promise<{ error: Error | null }>
 */
export async function resetPassword(
  email: string
): Promise<{ error: Error | null }> {
  try {
    if (import.meta.env?.DEV) {
      console.log("📧 Sending password reset email");
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/#/auth/reset-password`,
    });

    if (error) {
      console.error("❌ Password reset error:", error.message);
      return { error };
    }

    if (import.meta.env?.DEV) {
      console.log("✅ Password reset email sent");
    }
    return { error: null };
  } catch (error) {
    console.error("❌ Password reset exception:", error);
    return { error: error as Error };
  }
}

/**
 * Update user's password (after reset)
 * @param newPassword - New password
 * @returns Promise<{ error: Error | null }>
 */
export async function updatePassword(
  newPassword: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error("❌ Update password error:", error.message);
      return { error };
    }

    console.log("✅ Password updated successfully");
    return { error: null };
  } catch (error) {
    console.error("❌ Update password exception:", error);
    return { error: error as Error };
  }
}

// ============================================
// PART 11: EXPORTS
// ============================================

export default {
  supabase,
  getCurrentUser,
  getSession,
  isAuthenticated,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signInWithGitHub,
  signOut,
  onAuthStateChange,
  resetPassword,
  updatePassword,
  handleAuthError,
  isAuthError,
  isSessionKnownInvalid,
  getSyncStatus,
  setSyncStatus,
  subscribeToSyncStatus,
};
