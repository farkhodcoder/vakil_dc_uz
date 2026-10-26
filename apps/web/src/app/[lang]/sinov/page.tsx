import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PracticeLoader } from "@/features/practice/practice-loader";
import { getDictionary } from "@/i18n/get-dictionary";

export const metadata: Metadata = { robots: { index: false } };

/**
 * FAQAT LOKAL ISHLAB CHIQISH: mashq interfeysini kirish va to'lovsiz ko'rish.
 * Ma'lumotlar baribir faqat brauzerda; "Submit" bazaga yetib bormaydi (sessiya yo'q) —
 * haqiqiy yakunlash faqat /mashq sahifasida, to'lovdan keyin.
 * Production build'da (NODE_ENV=production) 404.
 */
export default async function PracticeDemoPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const { lang, t } = await getDictionary();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <p className="mb-6 rounded-xl border border-dashed border-warn px-4 py-3 text-sm font-semibold text-warn">
        DEV · /sinov — lokal sinov sahifasi (production’da 404)
      </p>
      <PracticeLoader sessionId="00000000-0000-4000-8000-000000000000" lang={lang} t={t} />
    </div>
  );
}
