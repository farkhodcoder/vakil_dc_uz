// URL tillari: uz (lotin), oz (kirill — davlat portallaridagi odatiy konvensiya), ru, en, tr
export const LANGS = ["uz", "oz", "ru", "en", "tr"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "uz";

export const HTML_LANG: Record<Lang, string> = { uz: "uz-Latn", oz: "uz-Cyrl", ru: "ru", en: "en", tr: "tr" };
export const LANG_LABEL: Record<Lang, string> = {
  uz: "O‘zbekcha",
  oz: "Ўзбекча",
  ru: "Русский",
  en: "English",
  tr: "Türkçe",
};
export const LANG_SHORT: Record<Lang, string> = { uz: "Uz", oz: "Ўз", ru: "Ru", en: "En", tr: "Tr" };

/** @vakil/dv-photo xabarlaridagi til kaliti */
export const PHOTO_LOCALE = { uz: "uz_latn", oz: "uz_cyrl", ru: "ru", en: "en", tr: "tr" } as const satisfies Record<
  Lang,
  string
>;

export const isLang = (v: string): v is Lang => (LANGS as readonly string[]).includes(v);

/** Brauzer tilidan eng mosini tanlash (Accept-Language'ning birinchi qiymati) */
export function langFromAcceptLanguage(header: string | null | undefined): Lang {
  const first = (header ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  if (first.startsWith("uz-cyrl")) return "oz";
  if (first.startsWith("uz")) return "uz";
  if (first.startsWith("ru")) return "ru";
  if (first.startsWith("tr")) return "tr";
  if (first.startsWith("en")) return "en";
  return DEFAULT_LANG;
}

/**
 * O'zbek lotin tipografiyasi: o'/g' → o‘/g‘ (U+2018), qolgan apostrof → tutuq belgisi ’ (U+2019).
 */
export function uzTypography(s: string): string {
  return s.replace(/([oOgG])'/g, "$1‘").replace(/(\p{L})'(?=\p{L})/gu, "$1’");
}

/** Narx: 9 999 so'm → "9 999" (bo'shliq — tor bo'shliq emas, oddiy NBSP) */
export function formatSum(tiyin: number): string {
  const sum = Math.round(tiyin / 100);
  return String(sum).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
