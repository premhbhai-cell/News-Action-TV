export const SUPABASE_URL = "PASTE_SUPABASE_PROJECT_URL_HERE";
export const SUPABASE_ANON_KEY = "PASTE_SUPABASE_PUBLISHABLE_OR_ANON_KEY_HERE";

export const ADMIN_EMAIL = "newsactiontv@gmail.com";
export const NEWS_IMAGE_BUCKET = "news-images";

export const isSupabaseConfigured =
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("_HERE") &&
  SUPABASE_ANON_KEY.length > 30 &&
  !SUPABASE_ANON_KEY.includes("_HERE");
