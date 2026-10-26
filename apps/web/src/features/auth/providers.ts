import "server-only";
import { cacheLife, cacheTag } from "next/cache";

export interface AuthProviders {
  phone: boolean;
  email: boolean;
  google: boolean;
}

/**
 * Supabase'da qaysi kirish usullari yoqilgan (ochiq /auth/v1/settings).
 * Kirish sahifasi faqat yoqilganlarini ko'rsatadi — Dashboard'da yoqilishi bilan tugma paydo bo'ladi.
 */
export async function getAuthProviders(): Promise<AuthProviders> {
  "use cache";
  cacheLife("minutes");
  cacheTag("auth-providers");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const none = { phone: false, email: false, google: false };
  if (!url || !key) return none;
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
    if (!res.ok) return none;
    const external = ((await res.json()) as { external?: Record<string, boolean> }).external ?? {};
    return { phone: Boolean(external.phone), email: Boolean(external.email), google: Boolean(external.google) };
  } catch {
    return none;
  }
}
