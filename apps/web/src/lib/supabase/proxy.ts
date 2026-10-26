import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Supabase sessiyasini yangilaydi (muddati o'tgan tokenni almashtiradi) va
 * foydalanuvchi bor-yo'qligini qaytaradi. Supabase SSR qo'llanmasidagi tartib.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          // CDN sessiyali javobni keshlamasligi uchun
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // createServerClient va getClaims orasida boshqa kod bo'lmasin (Supabase tavsiyasi)
  const { data } = await supabase.auth.getClaims();
  return { response, isSignedIn: Boolean(data?.claims?.sub) };
}
