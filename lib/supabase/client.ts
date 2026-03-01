import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for Client Components (browser).
 * Use in components marked with "use client".
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
