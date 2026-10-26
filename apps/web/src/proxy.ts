import { NextResponse, type NextRequest } from "next/server";
import { LEGAL_KINDS } from "@/content/legal-kinds";
import { isLang, langFromAcceptLanguage, LANGS, type Lang } from "@/i18n/locales";
import { updateSession } from "@/lib/supabase/proxy";

function preferredLang(request: NextRequest): Lang {
  const saved = request.cookies.get("vakil_lang")?.value;
  if (saved && isLang(saved)) return saved;
  return langFromAcceptLanguage(request.headers.get("accept-language"));
}

// Kirish talab qilinadigan bo'limlar (haqiqiy tekshiruv sahifaning o'zida — bu faqat tezkor yo'naltirish)
const PROTECTED = new RegExp(`^/(${LANGS.join("|")})/(mashq|kabinet|tolov)(/|$)`);
const LEGAL = new RegExp(`^/(${LANGS.join("|")})/hujjat/([^/]+)/?$`);

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1) Til prefiksi yo'q → /uz, /oz, /ru, /en yoki /tr
  if (!LANGS.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = `/${preferredLang(request)}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  // 2) Noma'lum hujjat turi → haqiqiy 404 (Cache Components'da dynamicParams yo'q, sahifadagi
  //    notFound() esa production'da qobiq oqib ketgach 200 status bilan qaytadi)
  const legal = LEGAL.exec(pathname);
  if (legal && !(LEGAL_KINDS as readonly string[]).includes(legal[2] ?? "")) {
    return NextResponse.rewrite(new URL(`/${legal[1]}/hujjat-topilmadi`, request.url));
  }

  // 3) Supabase sessiyasini yangilash
  const { response, isSignedIn } = await updateSession(request);

  // 4) Kirmagan foydalanuvchi → kirish sahifasi
  if (!isSignedIn && PROTECTED.test(pathname)) {
    const lang = pathname.split("/")[1];
    const url = request.nextUrl.clone();
    url.pathname = `/${lang}/kirish`;
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  // ichki fayllar, API, OAuth qaytishi, MediaPipe, shriftlar, ikonka va kengaytmali statik fayllar o'tkazib yuboriladi
  matcher: ["/((?!_next|api|auth|mediapipe|fonts|icon|favicon\\.ico|.*\\..*).*)"],
};
