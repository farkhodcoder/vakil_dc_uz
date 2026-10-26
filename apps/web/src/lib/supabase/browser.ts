"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@vakil/db";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** Brauzer mijozi (sessiya cookie'da). Bitta nusxa. */
export function getBrowserClient() {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
  }
  return client;
}
