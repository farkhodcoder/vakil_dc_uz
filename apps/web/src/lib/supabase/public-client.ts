import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@vakil/db";

/**
 * Ochiq (publishable) kalit bilan server tomonidagi mijoz.
 * Faqat ochiq ma'lumot: nimani ko'rish mumkinligini RLS belgilaydi.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase sozlanmagan: apps/web/.env.local da NEXT_PUBLIC_SUPABASE_URL va NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY kerak",
    );
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
