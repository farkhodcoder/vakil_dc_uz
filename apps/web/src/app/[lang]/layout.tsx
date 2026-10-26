import type { Metadata, Viewport } from "next";
import { Manrope, Noto_Sans } from "next/font/google";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getDictionary } from "@/i18n/get-dictionary";
import { HTML_LANG, LANGS } from "@/i18n/locales";
import { contentSecurityPolicy } from "@/lib/csp";
import "../globals.css";

// Lotin oldindan yuklanadi; kirill va lotin-kengaytma glif'lari unicode-range orqali kerak bo'lganda
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

// Manrope'da o'zbek kirill harflari (Қ, Ғ, Ҳ) yo'q — ўзбекча sahifalar Noto Sans bilan
const noto = Noto_Sans({
  subsets: ["cyrillic", "cyrillic-ext"],
  variable: "--font-noto",
  display: "swap",
  preload: false,
});

export async function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: t.meta.title,
    description: t.meta.description,
    applicationName: "vakil",
  };
}

export const viewport: Viewport = {
  themeColor: "#1B3B6F",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const { lang, t } = await getDictionary();
  return (
    <html lang={HTML_LANG[lang]} className={`${manrope.variable} ${noto.variable}`}>
      <head>
        {/* Statik hostingda sarlavha qo'yib bo'lmaydi — CSP meta orqali */}
        <meta httpEquiv="Content-Security-Policy" content={contentSecurityPolicy()} />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
      </head>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <SiteHeader lang={lang} t={t} />
        <main className="flex-1">{children}</main>
        <SiteFooter lang={lang} t={t} />
      </body>
    </html>
  );
}
