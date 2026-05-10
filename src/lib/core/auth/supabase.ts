import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SecureKVStore } from "@/lib/tauri/storage/secure-kv";
import { logger } from "@/lib/core/utils/logger";

// Supabase 专用的安全存储实例
const supabaseStore = new SecureKVStore({ service: "bunshin-supabase" });

// Custom storage adapter for Tauri using SecureKVStore
const TauriSupabaseStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await supabaseStore.getSecret(`supabase_${key}`);
    } catch (error) {
      logger.warn(error as string);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await supabaseStore.setSecret(`supabase_${key}`, value);
    } catch (error) {
      logger.warn(error as string);
      throw error;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await supabaseStore.deleteSecret(`supabase_${key}`);
    } catch (error) {
      logger.warn(error as string);
      throw error;
    }
  },
};

// Initialize Supabase client with Tauri configuration
async function createSupabaseClient() {
  const supabaseUrl = "https://trphslgzosdbjjntuibp.supabase.co";
  const supabaseAnonKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRycGhzbGd6b3NkYmpqbnR1aWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5NDY0MDAsImV4cCI6MjA2MDUyMjQwMH0.FIJZfdVFH6XqTD_2pUQdU6sUWN7T_moWX_Gov3iQLaE";

  if (!supabaseUrl || !supabaseAnonKey) {
    logger.warn("supabase");
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: TauriSupabaseStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

// Create the Supabase client instance
let supabaseClientInstance: SupabaseClient | null = null;

export const supabase = {
  get auth() {
    if (!supabaseClientInstance) {
      logger.warn("supabase");
      return null;
    }
    return supabaseClientInstance.auth;
  },
  get from() {
    if (!supabaseClientInstance) {
      logger.warn("supabase");
      return null;
    }
    return supabaseClientInstance.from.bind(supabaseClientInstance);
  },
  get rpc() {
    if (!supabaseClientInstance) {
      logger.warn("supabase");
      return null;
    }
    return supabaseClientInstance.rpc.bind(supabaseClientInstance);
  },
};

// Initialize the client asynchronously
export async function initializeSupabase(): Promise<SupabaseClient | null> {
  if (!supabaseClientInstance) {
    supabaseClientInstance = await createSupabaseClient();
  }
  return supabaseClientInstance;
}

// Handle app state changes for auto-refresh
if (typeof window !== "undefined") {
  // Listen for window focus/blur events instead of React Native AppState
  window.addEventListener("focus", () => {
    if (supabase.auth) {
      supabase.auth.startAutoRefresh();
    }
  });

  window.addEventListener("blur", () => {
    if (supabase.auth) {
      supabase.auth.stopAutoRefresh();
    }
  });

  // Also handle page visibility API
  document.addEventListener("visibilitychange", () => {
    if (supabase.auth) {
      if (document.visibilityState === "visible") {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    }
  });
}
