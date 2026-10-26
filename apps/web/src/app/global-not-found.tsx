import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "404 | vakil", robots: { index: false } };

const HOMES = [
  { lang: "uz", label: "O‘zbekcha", text: "Sahifa topilmadi" },
  { lang: "oz", label: "Ўзбекча", text: "Саҳифа топилмади" },
  { lang: "ru", label: "Русский", text: "Страница не найдена" },
  { lang: "en", label: "English", text: "Page not found" },
  { lang: "tr", label: "Türkçe", text: "Sayfa bulunamadı" },
] as const;

/** Til tashqarisidagi noma'lum yo'llar (statik saytda — 404.html) */
export default function GlobalNotFound() {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return (
    <html lang="uz-Latn">
      <body className="flex min-h-dvh items-center justify-center px-4 font-sans antialiased">
        <main className="flex max-w-md flex-col items-start gap-4">
          <p className="text-6xl font-extrabold text-brand/20">404</p>
          <ul className="flex flex-col gap-1">
            {HOMES.map((h) => (
              <li key={h.lang} className="text-lg font-bold text-brand">
                {h.text}
              </li>
            ))}
          </ul>
          <nav className="mt-2 flex flex-wrap gap-2">
            {HOMES.map((h) => (
              // Oddiy <a>: bu sahifa ilova marshrutlaridan tashqarida
              <a
                key={h.lang}
                href={`${base}/${h.lang}/`}
                className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 text-sm font-semibold text-brand hover:border-brand"
              >
                {h.label}
              </a>
            ))}
          </nav>
        </main>
      </body>
    </html>
  );
}
