import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  isSupabaseConfigured,
} from "./supabase-config.js";

export { isSupabaseConfigured };

export let supabase = null;

if (isSupabaseConfigured) {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    });
}

export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Add the project URL and public anon/publishable key to assets/js/supabase-config.js.",
    );
  }
  return supabase;
}
