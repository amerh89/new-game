import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Sync is optional. Without these two variables the app never shows a login. */
export const supabaseConfigured = Boolean(url && anonKey);

let clientPromise: Promise<SupabaseClient> | null = null;

/** The Supabase library is only downloaded when sync is configured. */
export function getSupabase(): Promise<SupabaseClient> | null {
  if (!supabaseConfigured) return null;
  clientPromise ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    }),
  );
  return clientPromise;
}

export const PROGRESS_TABLE = "user_progress";
