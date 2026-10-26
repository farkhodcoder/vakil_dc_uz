import { NextResponse } from "next/server";
import { afterLoginPath } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * FAQAT LOKAL ISHLAB CHIQISH: Google sozlanmagan paytda himoyalangan sahifalarni sinash uchun.
 * Sinov foydalanuvchisi .env.local dagi DEV_LOGIN_EMAIL / DEV_LOGIN_PASSWORD (gitga tushmaydi).
 * Production build'da (NODE_ENV=production) 404 qaytaradi.
 */
export async function POST(request: Request) {
  const email = process.env.DEV_LOGIN_EMAIL;
  const password = process.env.DEV_LOGIN_PASSWORD;
  if (process.env.NODE_ENV !== "development" || !email || !password) {
    return new NextResponse(null, { status: 404 });
  }
  const form = await request.formData();
  const next = afterLoginPath(typeof form.get("next") === "string" ? (form.get("next") as string) : null);
  const origin = new URL(request.url).origin;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return NextResponse.redirect(`${origin}/uz/kirish?xato=1`, 303);
  return NextResponse.redirect(`${origin}${next}`, 303);
}
