import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginPanel } from "@/features/auth/login-panel";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: `${t.meta.loginTitle} | vakil`, robots: { index: false } };
}

export default async function LoginPage() {
  const { lang, t } = await getDictionary();
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <LoginPanel lang={lang} t={t} />
    </Suspense>
  );
}
