import Link from "next/link";
import { Suspense } from "react";
import type { Dictionary } from "@/i18n/dictionaries/types";
import type { Lang } from "@/i18n/locales";
import { AuthLink } from "@/features/auth/session-controls";
import { LangSwitcher } from "./lang-switcher";
import { Logo } from "./logo";

export function SiteHeader({ lang, t }: { lang: Lang; t: Dictionary }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href={`/${lang}`} aria-label={`vakil — ${t.nav.home}`} className="shrink-0 rounded-lg">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/${lang}/mashq`}
            className="hidden min-h-11 items-center rounded-full px-3 text-sm font-semibold text-ink hover:text-brand sm:inline-flex"
          >
            {t.nav.practice}
          </Link>
          <Suspense fallback={<div className="h-11 w-[72px] sm:w-[124px]" />}>
            <LangSwitcher current={lang} label={t.nav.language} />
          </Suspense>
          <AuthLink lang={lang} labels={{ login: t.nav.login, cabinet: t.nav.cabinet }} />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ lang, t }: { lang: Lang; t: Dictionary }) {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:px-6">
        <p className="max-w-3xl leading-relaxed">{t.footer.disclaimer}</p>
        <nav className="flex flex-wrap gap-x-5">
          <Link href={`/${lang}/hujjat/oferta`} className="inline-flex min-h-11 items-center font-semibold hover:text-brand">
            {t.footer.offer}
          </Link>
          <Link href={`/${lang}/hujjat/maxfiylik`} className="inline-flex min-h-11 items-center font-semibold hover:text-brand">
            {t.footer.privacy}
          </Link>
          <a
            href="https://dvprogram.state.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center font-semibold hover:text-brand"
          >
            {t.footer.official}
          </a>
        </nav>
        <p>© 2026 vakil · {t.meta.tagline}</p>
      </div>
    </footer>
  );
}
