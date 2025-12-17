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
const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY: string = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  throw new Error("Missing VITE_SUPABASE_URL environment variable");
}

if (!SUPABASE_ANON_KEY) {
  throw new Error("Missing VITE_SUPABASE_ANON_KEY environment variable");
}

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
if (import.meta.env.DEV) {
  console.log("🔧 Supabase client initialized");
}

// ============================================
// PART 5: USER AUTHENTICATION FUNCTIONS
// ============================================

/**
 * Get the current authenticated user
 * @returns Promise<User | null>
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("❌ Get user error:", error.message);
      return null;
    }

    return user;
  } catch (error) {
    console.error("❌ Get user exception:", error);
    return null;
  }
}

/**
 * Get the current session
 * @returns Promise<SessionResult>
 */
export async function getSession(): Promise<SessionResult> {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("❌ Get session error:", error.message);
      return { session: null, error };
    }

    return { session, error: null };
  } catch (error) {
    console.error("❌ Get session exception:", error);
    return { session: null, error: error as Error };
  }
}

/**
 * Check if user is currently authenticated
 * @returns Promise<boolean>
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return !!session;
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
    if (import.meta.env.DEV) {
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

    if (import.meta.env.DEV) {
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
    if (import.meta.env.DEV) {
      console.log("📝 Sign up attempt");
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        // Redirect to website after email confirmation
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error("❌ Sign up error:", error.message);
      return { user: null, error };
    }

    if (import.meta.env.DEV) {
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
    if (import.meta.env.DEV) {
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
    if (import.meta.env.DEV) {
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
 * Sign out the current user
 * @returns Promise<{ error: Error | null }>
 */
export async function signOut(): Promise<{ error: Error | null }> {
  try {
    if (import.meta.env.DEV) {
      console.log("🚪 Signing out");
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("❌ Sign out error:", error.message);
      return { error };
    }

    if (import.meta.env.DEV) {
      console.log("✅ Signed out successfully");
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
    if (import.meta.env.DEV) {
      console.log("🔄 Auth state changed:", event);
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
    if (import.meta.env.DEV) {
      console.log("📧 Sending password reset email");
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/#/auth/reset-password`,
    });

    if (error) {
      console.error("❌ Password reset error:", error.message);
      return { error };
    }

    if (import.meta.env.DEV) {
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
};
