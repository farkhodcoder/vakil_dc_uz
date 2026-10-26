"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { HTML_LANG, LANGS, LANG_LABEL, LANG_SHORT, type Lang } from "@/i18n/locales";

function rememberLang(lang: Lang) {
  document.cookie = `vakil_lang=${lang}; path=/; max-age=31536000; samesite=lax`;
}

const PREFIX = new RegExp(`^/(${LANGS.join("|")})(?=/|$)`);

/** 5 til — ochiluvchi menyu (telefonda ham sig'adi) */
export function LangSwitcher({ current, label }: { current: Lang; label: string }) {
  const pathname = usePathname() ?? `/${current}`;
  const rest = pathname.replace(PREFIX, "");
  const ref = useRef<HTMLDetailsElement>(null);

  // Tashqariga bosilganda yoki Escape — yopiladi
  useEffect(() => {
    const close = (e: Event) => {
      const el = ref.current;
      if (!el?.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !el.contains(e.target as Node)) el.open = false;
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  return (
    <details ref={ref} className="relative">
      <summary
        aria-label={label}
        className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm font-semibold text-ink hover:border-brand [&::-webkit-details-marker]:hidden"
      >
        <svg viewBox="0 0 24 24" className="size-4 text-muted" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
        <span className="sm:hidden">{LANG_SHORT[current]}</span>
        <span className="hidden sm:inline">{LANG_LABEL[current]}</span>
      </summary>
      <nav
        aria-label={label}
        className="absolute right-0 z-30 mt-2 flex w-44 flex-col rounded-2xl border border-line bg-surface p-1.5 shadow-lg"
      >
        {LANGS.map((lang) => (
          <Link
            key={lang}
            href={`/${lang}${rest}`}
            hrefLang={HTML_LANG[lang]}
            lang={HTML_LANG[lang]}
            aria-current={lang === current ? "true" : undefined}
            onClick={() => {
              rememberLang(lang);
              if (ref.current) ref.current.open = false;
            }}
            className={`flex min-h-11 items-center justify-between rounded-xl px-3 text-sm font-semibold ${
              lang === current ? "bg-brand-50 text-brand" : "text-ink hover:bg-paper"
            }`}
          >
            {LANG_LABEL[lang]}
            <span className="text-xs font-bold text-muted">{LANG_SHORT[lang]}</span>
          </Link>
        ))}
      </nav>
    </details>
  );
}
