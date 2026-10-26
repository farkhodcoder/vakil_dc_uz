import Link from "next/link";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function NotFound() {
  const { lang, t } = await getDictionary();
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-4 px-4 py-20 sm:px-6">
      <p className="text-6xl font-extrabold text-brand/20">404</p>
      <h1 className="text-3xl font-extrabold tracking-tight text-brand">{t.meta.notFound}</h1>
      <p className="text-ink/75">{t.meta.notFoundLead}</p>
      <Link href={`/${lang}/`} className="inline-flex min-h-12 items-center rounded-full bg-brand px-6 font-bold text-white hover:bg-brand-hover">
        {t.meta.toHome}
      </Link>
    </div>
  );
}
