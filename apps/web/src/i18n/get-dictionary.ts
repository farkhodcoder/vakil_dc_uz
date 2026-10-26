import { lang } from "next/root-params";
import { notFound } from "next/navigation";
import { DICTIONARIES } from "./dictionaries";
import type { Dictionary } from "./dictionaries/types";
import { isLang, type Lang } from "./locales";

/** Joriy til (root param) — noto'g'ri bo'lsa 404 */
export async function getLang(): Promise<Lang> {
  const value = await lang();
  if (!isLang(value)) notFound();
  return value;
}

export async function getDictionary(): Promise<{ lang: Lang; t: Dictionary }> {
  const current = await getLang();
  return { lang: current, t: DICTIONARIES[current] };
}

export function dictionaryFor(current: Lang): Dictionary {
  return DICTIONARIES[current];
}
