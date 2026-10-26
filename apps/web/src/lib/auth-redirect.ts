import { DEFAULT_LANG, isLang, type Lang } from "@/i18n/locales";

/**
 * Kirishdan keyingi yo'naltirish manzili: faqat shu saytdagi nisbiy yo'l.
 * "//evil.com", "https://..." va "/\\evil" kabi ochiq yo'naltirishlar rad etiladi.
 */
export function safeNextPath(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  try {
    const url = new URL(next, "https://vakil.local");
    return url.origin === "https://vakil.local" ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
}

/** "/ru/mashq" → "ru"; aniqlab bo'lmasa — standart til */
export function langFromPath(path: string | null | undefined): Lang {
  const first = path?.split("/")[1] ?? "";
  return isLang(first) ? first : DEFAULT_LANG;
}

/** Google'dan qaytgandan keyin: so'ralgan sahifa yoki mashq sahifasi */
export function afterLoginPath(nextRaw: string | null | undefined): string {
  const lang = langFromPath(nextRaw);
  return safeNextPath(nextRaw, `/${lang}/mashq`);
}

/** Brauzerdan OAuth uchun qaytish manzili */
export function callbackUrl(origin: string, next: string): string {
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}
