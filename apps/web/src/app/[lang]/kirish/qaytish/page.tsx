import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthReturn } from "@/features/auth/auth-return";
import { getDictionary } from "@/i18n/get-dictionary";

export const metadata: Metadata = { robots: { index: false } };

/** Google (OAuth) qaytish manzili — Supabase Redirect URLs'da: <sayt>/{til}/kirish/qaytish/ */
export default async function AuthReturnPage() {
  const { lang, t } = await getDictionary();
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <AuthReturn lang={lang} title={t.auth.title} />
    </Suspense>
  );
}
